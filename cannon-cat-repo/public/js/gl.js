'use strict';
// ---------- tiny WebGL toon renderer: flat-band shading + constant-width ink outlines ----------
// Outlines: back faces of the same mesh pushed out in clip space along a smoothed normal,
// so the line is the same pixel width near and far (cartoon look), and fades into fog with the object.

const M4 = {
  ident() { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; },
  mul(o, a, b) {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      o[j * 4 + i] = a[i] * b[j * 4] + a[4 + i] * b[j * 4 + 1] + a[8 + i] * b[j * 4 + 2] + a[12 + i] * b[j * 4 + 3];
    }
    return o;
  },
  persp(o, fovy, asp, n, f) {
    const t = 1 / Math.tan(fovy / 2); o.fill(0);
    o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o;
  },
  lookAt(o, e, c, u) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2]; let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = u[1] * zz - u[2] * zy, xy = u[2] * zx - u[0] * zz, xz = u[0] * zy - u[1] * zx; l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    o[0] = xx; o[1] = yx; o[2] = zx; o[3] = 0; o[4] = xy; o[5] = yy; o[6] = zy; o[7] = 0; o[8] = xz; o[9] = yz; o[10] = zz; o[11] = 0;
    o[12] = -(xx * e[0] + xy * e[1] + xz * e[2]); o[13] = -(yx * e[0] + yy * e[1] + yz * e[2]); o[14] = -(zx * e[0] + zy * e[1] + zz * e[2]); o[15] = 1;
    return o;
  },
  // T * Ry * Rz * Rx * S
  trs(o, x, y, z, rx, ry, rz, sx, sy, sz) {
    const cx = Math.cos(rx), sxn = Math.sin(rx), cy = Math.cos(ry), syn = Math.sin(ry), cz = Math.cos(rz), szn = Math.sin(rz);
    // R = Ry*Rz*Rx
    const r00 = cy * cz, r01 = -cy * szn * cx + syn * sxn, r02 = cy * szn * sxn + syn * cx;
    const r10 = szn, r11 = cz * cx, r12 = -cz * sxn;
    const r20 = -syn * cz, r21 = syn * szn * cx + cy * sxn, r22 = -syn * szn * sxn + cy * cx;
    o[0] = r00 * sx; o[1] = r10 * sx; o[2] = r20 * sx; o[3] = 0;
    o[4] = r01 * sy; o[5] = r11 * sy; o[6] = r21 * sy; o[7] = 0;
    o[8] = r02 * sz; o[9] = r12 * sz; o[10] = r22 * sz; o[11] = 0;
    o[12] = x; o[13] = y; o[14] = z; o[15] = 1;
    return o;
  },
  normal3(o, m) { // inverse-transpose of upper 3x3
    const a = m[0], b = m[1], c = m[2], d = m[4], e = m[5], f = m[6], g = m[8], h = m[9], i = m[10];
    const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
    let det = a * A + b * B + c * C; det = det ? 1 / det : 0;
    o[0] = A * det; o[1] = B * det; o[2] = C * det;
    o[3] = -(b * i - c * h) * det; o[4] = (a * i - c * g) * det; o[5] = -(a * h - b * g) * det;
    o[6] = (b * f - c * e) * det; o[7] = -(a * f - c * d) * det; o[8] = (a * e - b * d) * det;
    return o;
  },
};

const hex3 = (() => {
  const cache = new Map();
  return h => {
    let v = cache.get(h); if (v) return v;
    const n = parseInt(h.slice(1), 16);
    v = new Float32Array([(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]);
    cache.set(h, v); return v;
  };
})();

const VS = `
attribute vec3 aP; attribute vec3 aN; attribute vec3 aO;
uniform mat4 uM; uniform mat4 uVP; uniform mat3 uNM; uniform float uLine; uniform vec2 uRes;
varying vec3 vN; varying vec3 vW;
void main(){
  vec4 w = uM * vec4(aP, 1.0);
  vec4 c = uVP * w;
  if (uLine > 0.0) {
    vec3 on = normalize(uNM * aO);
    vec4 c2 = uVP * vec4(w.xyz + on * 4.0, 1.0);
    vec2 d = c2.xy / c2.w - c.xy / c.w;
    float l = length(d);
    if (l > 1e-6) c.xy += (d / l) * uLine * 2.0 / uRes * c.w;
    c.z += 0.00015 * c.w;
  }
  vN = uNM * aN; vW = w.xyz;
  gl_Position = c;
}`;
const FS = `
precision highp float;
uniform vec3 uCol; uniform vec3 uL; uniform float uLine; uniform vec3 uFogC; uniform vec2 uFog; uniform vec3 uCam; uniform float uEmit; uniform float uAlpha;
varying vec3 vN; varying vec3 vW;
void main(){
  float dist = length(uCam - vW);
  float f = clamp((dist - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);
  if (uLine > 0.0) { gl_FragColor = vec4(mix(vec3(0.086,0.071,0.102), uFogC, f), uAlpha); return; }
  vec3 n = normalize(vN);
  float d = dot(n, uL);
  float t = d > 0.42 ? 1.0 : (d > -0.08 ? 0.8 : 0.62);
  vec3 V = normalize(uCam - vW);
  float rim = pow(1.0 - max(dot(n, V), 0.0), 3.0) * 0.22;
  vec3 col = uCol * mix(t, 1.0, uEmit) + rim * (1.0 - uEmit);
  gl_FragColor = vec4(mix(col, uFogC, f), uAlpha);
}`;

const GL = {
  gl: null, prog: null, loc: {}, W: 1, H: 1, dpr: 1,
  VP: new Float32Array(16), V: new Float32Array(16), P: new Float32Array(16),
  cam: [0, 0, 1], stack: [], top: null, tmp: new Float32Array(16), tmpN: new Float32Array(9), draws: 0,
  fogC: [0.7, 0.85, 1], fog: [1000, 3000], lineW: 3.2, lineCutZ: -520, forceAlpha: 0, forceColor: null,
  init(canvas) {
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL is not available in this browser');
    this.gl = gl;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    this.prog = p; gl.useProgram(p);
    for (const n of ['aP', 'aN', 'aO']) this.loc[n] = gl.getAttribLocation(p, n);
    for (const n of ['uM', 'uVP', 'uNM', 'uLine', 'uRes', 'uCol', 'uL', 'uFogC', 'uFog', 'uCam', 'uEmit', 'uAlpha']) this.loc[n] = gl.getUniformLocation(p, n);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
    const L = [0.45, 0.8, 0.55], l = Math.hypot(...L);
    gl.uniform3f(this.loc.uL, L[0] / l, L[1] / l, L[2] / l);
    gl.uniform1f(this.loc.uAlpha, 1);
    gl.enableVertexAttribArray(this.loc.aP); gl.enableVertexAttribArray(this.loc.aN); gl.enableVertexAttribArray(this.loc.aO);
    this.top = M4.ident();
    MESH.build(gl);
  },
  resize(w, h, dpr) {
    const c = this.gl.canvas; this.dpr = dpr;
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    this.W = w; this.H = h;
    this.gl.viewport(0, 0, c.width, c.height);
  },
  begin(eye, target, fovDeg, sky, view) {
    const gl = this.gl, c = gl.canvas;
    // view: optional [x, y, w, h] in device pixels (used for 3D thumbnails); default = whole canvas
    const vw = view ? view[2] : c.width, vh = view ? view[3] : c.height;
    gl.viewport(view ? view[0] : 0, view ? view[1] : 0, vw, vh);
    this.vRes = [vw, vh];
    M4.persp(this.P, fovDeg * Math.PI / 180, vw / vh, view ? 5 : 20, 9000);
    M4.lookAt(this.V, eye, target, [0, 1, 0]);
    M4.mul(this.VP, this.P, this.V);
    this.cam = eye;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(this.loc.uVP, false, this.VP);
    gl.uniform3f(this.loc.uCam, eye[0], eye[1], eye[2]);
    gl.uniform3f(this.loc.uFogC, this.fogC[0], this.fogC[1], this.fogC[2]);
    gl.uniform2f(this.loc.uFog, this.fog[0], this.fog[1]);
    gl.uniform2f(this.loc.uRes, vw, vh);
    this.stack.length = 0; this.depth = 0; this.root = this.root || M4.ident(); this.top = this.root; this.draws = 0; this.curMesh = null;
  },
  pool: Array.from({ length: 48 }, () => new Float32Array(16)), depth: 0, tmpL: new Float32Array(16),
  push(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    this.stack.push(this.top);
    M4.trs(this.tmpL, x, y, z, rx, ry, rz, sx, sy, sz);
    const o = this.pool[this.depth++] || new Float32Array(16);
    this.top = M4.mul(o, this.top, this.tmpL);
  },
  pop() { this.depth = Math.max(0, this.depth - 1); this.top = this.stack.pop() || this.root; },
  bindMesh(m) {
    if (this.curMesh === m) return;
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, m.vb);
    gl.vertexAttribPointer(this.loc.aP, 3, gl.FLOAT, false, 36, 0);
    gl.vertexAttribPointer(this.loc.aN, 3, gl.FLOAT, false, 36, 12);
    gl.vertexAttribPointer(this.loc.aO, 3, gl.FLOAT, false, 36, 24);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
    this.curMesh = m;
  },
  // draw a unit mesh with a local transform under the current stack matrix
  part(mesh, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, opt) {
    const gl = this.gl, m = MESH[mesh];
    M4.trs(this.tmp, x, y, z, rx, ry, rz, sx, sy, sz);
    const M = M4.mul(this._M || (this._M = new Float32Array(16)), this.top, this.tmp);
    M4.normal3(this.tmpN, M);
    this.bindMesh(m);
    gl.uniformMatrix4fv(this.loc.uM, false, M);
    gl.uniformMatrix3fv(this.loc.uNM, false, this.tmpN);
    const emit = opt && opt.emit || 0;
    if (opt && opt.noFog) gl.uniform2f(this.loc.uFog, 1e7, 2e7);
    const line = !(opt && opt.noLine) && M[14] > this.lineCutZ;   // far scenery: no outline (fog hides it anyway)
    if (line) {
      gl.cullFace(gl.FRONT);
      gl.uniform1f(this.loc.uLine, (opt && opt.line || this.lineW) * this.dpr);
      gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_SHORT, 0);
      this.draws++;
    }
    gl.cullFace(gl.BACK);
    gl.uniform1f(this.loc.uLine, 0);
    const c = hex3(this.forceColor || color);
    gl.uniform3f(this.loc.uCol, c[0], c[1], c[2]);
    gl.uniform1f(this.loc.uEmit, emit);
    const a = (opt && opt.alpha) || this.forceAlpha;
    if (a) { gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.uniform1f(this.loc.uAlpha, a); }
    gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_SHORT, 0);
    if (a) { gl.disable(gl.BLEND); gl.depthMask(true); gl.uniform1f(this.loc.uAlpha, 1); }
    if (opt && opt.noFog) gl.uniform2f(this.loc.uFog, this.fog[0], this.fog[1]);
    this.draws++;
  },
  project(x, y, z) {
    const m = this.VP;
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12], cy = m[1] * x + m[5] * y + m[9] * z + m[13], cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    return { x: (cx / cw * 0.5 + 0.5) * this.W, y: (1 - (cy / cw * 0.5 + 0.5)) * this.H, w: cw };
  },
};

// ---------- unit meshes ----------
const MESH = {
  build(gl) {
    const defs = {
      box: box(), sphere: sphere(14, 10), cyl: cylinder(16, false), cone: cylinder(16, true), cyl6: cylinder(6, false),
      cone4: cylinder(4, true), torus: torus(18, 8, 0.28), ring: torus(24, 6, 0.09), prism: prism(), hemi: hemisphere(14, 6), disc: disc(20),
    };
    for (const k in defs) {
      const d = defs[k];
      smoothOutline(d);
      const vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(d.v), gl.STATIC_DRAW);
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(d.i), gl.STATIC_DRAW);
      MESH[k] = { vb, ib, n: d.i.length };
    }
  },
};
// vertex layout: px py pz nx ny nz ox oy oz
function V(arr, p, n) { arr.push(p[0], p[1], p[2], n[0], n[1], n[2], 0, 0, 0); }
function smoothOutline(d) {
  const map = new Map(), v = d.v;
  for (let i = 0; i < v.length; i += 9) {
    const k = `${v[i].toFixed(3)},${v[i + 1].toFixed(3)},${v[i + 2].toFixed(3)}`;
    const s = map.get(k) || [0, 0, 0];
    s[0] += v[i + 3]; s[1] += v[i + 4]; s[2] += v[i + 5]; map.set(k, s);
  }
  for (let i = 0; i < v.length; i += 9) {
    const s = map.get(`${v[i].toFixed(3)},${v[i + 1].toFixed(3)},${v[i + 2].toFixed(3)}`);
    const l = Math.hypot(s[0], s[1], s[2]) || 1;
    v[i + 6] = s[0] / l; v[i + 7] = s[1] / l; v[i + 8] = s[2] / l;
  }
}
function box() {
  const v = [], i = [];
  const faces = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, -1], [1, 0, 0]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]];
  for (const [n, u, w] of faces) {
    const b = v.length / 9;
    for (const [a, c] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      V(v, [0.5 * (n[0] + a * u[0] + c * w[0]), 0.5 * (n[1] + a * u[1] + c * w[1]), 0.5 * (n[2] + a * u[2] + c * w[2])], n);
    }
    // winding: check orientation
    const p0 = [v[b * 9], v[b * 9 + 1], v[b * 9 + 2]], p1 = [v[b * 9 + 9], v[b * 9 + 10], v[b * 9 + 11]], p2 = [v[b * 9 + 18], v[b * 9 + 19], v[b * 9 + 20]];
    const e1 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], e2 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
    const cr = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] > 0) i.push(b, b + 1, b + 2, b, b + 2, b + 3);
    else i.push(b, b + 2, b + 1, b, b + 3, b + 2);
  }
  return { v, i };
}
function sphere(seg, rings) {
  const v = [], i = [];
  for (let r = 0; r <= rings; r++) {
    const th = r / rings * Math.PI;
    for (let s = 0; s <= seg; s++) {
      const ph = s / seg * Math.PI * 2;
      const n = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      V(v, [n[0] * 0.5, n[1] * 0.5, n[2] * 0.5], n);
    }
  }
  for (let r = 0; r < rings; r++) for (let s = 0; s < seg; s++) {
    const a = r * (seg + 1) + s, b = a + seg + 1;
    i.push(a, a + 1, b, b, a + 1, b + 1);
  }
  return { v, i };
}
function hemisphere(seg, rings) {
  const v = [], i = [];
  for (let r = 0; r <= rings; r++) {
    const th = r / rings * Math.PI / 2;
    for (let s = 0; s <= seg; s++) {
      const ph = s / seg * Math.PI * 2;
      const n = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)];
      V(v, [n[0] * 0.5, n[1] * 0.5, n[2] * 0.5], n);
    }
  }
  for (let r = 0; r < rings; r++) for (let s = 0; s < seg; s++) {
    const a = r * (seg + 1) + s, b = a + seg + 1;
    i.push(a, a + 1, b, b, a + 1, b + 1);
  }
  const c = v.length / 9; V(v, [0, 0, 0], [0, -1, 0]);
  const ring = v.length / 9;
  for (let s = 0; s <= seg; s++) { const ph = s / seg * Math.PI * 2; V(v, [Math.cos(ph) * 0.5, 0, Math.sin(ph) * 0.5], [0, -1, 0]); }
  for (let s = 0; s < seg; s++) i.push(c, ring + s, ring + s + 1);
  return { v, i };
}
function cylinder(seg, cone) {
  const v = [], i = [];
  const top = cone ? 0 : 0.5;
  for (let s = 0; s <= seg; s++) {
    const a = s / seg * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    const ny = cone ? 0.5 : 0, l = Math.hypot(1, ny);
    V(v, [ca * 0.5, -0.5, sa * 0.5], [ca / l, ny / l, sa / l]);
    V(v, [ca * top, 0.5, sa * top], [ca / l, ny / l, sa / l]);
  }
  for (let s = 0; s < seg; s++) { const a = s * 2; i.push(a, a + 1, a + 2, a + 2, a + 1, a + 3); }
  const caps = cone ? [-0.5] : [-0.5, 0.5];
  for (const y of caps) {
    const n = [0, y > 0 ? 1 : -1, 0];
    const c = v.length / 9; V(v, [0, y, 0], n);
    for (let s = 0; s <= seg; s++) { const a = s / seg * Math.PI * 2; V(v, [Math.cos(a) * 0.5, y, Math.sin(a) * 0.5], n); }
    for (let s = 0; s < seg; s++) { if (y > 0) i.push(c, c + s + 2, c + s + 1); else i.push(c, c + s + 1, c + s + 2); }
  }
  return { v, i };
}
function disc(seg) { // flat cylinder (for shadows, puddles)
  return cylinder(seg, false);
}
function torus(seg, sides, r) {
  const v = [], i = [];
  for (let s = 0; s <= seg; s++) {
    const a = s / seg * Math.PI * 2;
    for (let t = 0; t <= sides; t++) {
      const b = t / sides * Math.PI * 2;
      const n = [Math.cos(a) * Math.cos(b), Math.sin(b), Math.sin(a) * Math.cos(b)];
      V(v, [Math.cos(a) * (0.5 + r * Math.cos(b)) , r * Math.sin(b), Math.sin(a) * (0.5 + r * Math.cos(b))], n);
    }
  }
  for (let s = 0; s < seg; s++) for (let t = 0; t < sides; t++) {
    const a = s * (sides + 1) + t, b = a + sides + 1;
    i.push(a, a + 1, b, a + 1, b + 1, b);
  }
  return { v, i };
}
function prism() { // triangular prism along z, apex up: for roofs and ramps
  const v = [], i = [];
  const P = [[-0.5, -0.5], [0.5, -0.5], [0, 0.5]];
  for (const z of [0.5, -0.5]) {
    const n = [0, 0, z > 0 ? 1 : -1]; const b = v.length / 9;
    for (const p of P) V(v, [p[0], p[1], z], n);
    if (z > 0) i.push(b, b + 1, b + 2); else i.push(b, b + 2, b + 1);
  }
  for (let k = 0; k < 3; k++) {
    const a = P[k], c = P[(k + 1) % 3];
    const ex = c[0] - a[0], ey = c[1] - a[1]; let nx = ey, ny = -ex; const l = Math.hypot(nx, ny); nx /= l; ny /= l;
    const b = v.length / 9;
    V(v, [a[0], a[1], 0.5], [nx, ny, 0]); V(v, [c[0], c[1], 0.5], [nx, ny, 0]); V(v, [c[0], c[1], -0.5], [nx, ny, 0]); V(v, [a[0], a[1], -0.5], [nx, ny, 0]);
    i.push(b, b + 2, b + 1, b, b + 3, b + 2);
  }
  return { v, i };
}
