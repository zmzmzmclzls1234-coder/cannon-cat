# CANNON CAT

Browser 3D launch game (plain HTML/CSS/JS, custom WebGL renderer) + a tiny leaderboard server.
No build step and no npm dependencies.

```
public/          the game (open public/index.html, or let the server serve it)
  js/config.js   leaderboardUrl setting
server/server.js Node.js server: serves public/ and the /api leaderboard
render.yaml      one-click Render blueprint
```

## Run locally

```
node server/server.js        # http://localhost:3000
```

## Deploy on Render

1. Push this folder to a GitHub repository.
2. Render dashboard → **New → Blueprint** → pick the repo (it reads `render.yaml`).
   Or **New → Web Service**: Runtime `Node`, Build `npm install`, Start `npm start`.
3. Open `https://<your-app>.onrender.com` - the game and the leaderboard run on the same address.

### Settings (environment variables)

| Name | Default | What it does |
| --- | --- | --- |
| `BOT_COUNT` | 40 | Number of computer players on the board |
| `BOTS_LABELED` | true | Show a small CPU tag next to bots |
| `ALLOWED_ORIGINS` | `*` | Sites allowed to call the API, comma separated (e.g. `https://www.crazygames.com,*.crazygames.com`) |
| `DATA_DIR` | `./data` | Where `leaderboard.json` is saved |

**Important:** on Render's free plan the disk is wiped on every deploy/restart, so player scores reset
(bots come back). To keep scores, add a Render **Disk** (paid) mounted at e.g. `/var/data` and set
`DATA_DIR=/var/data`. Free instances also sleep after 15 minutes idle; the first request then takes
~30-60 s, and the game shows "offline" until the server wakes.

## Hosting the game somewhere else (e.g. CrazyGames)

Upload the contents of `public/` and set the server address in `public/js/config.js`:

```js
window.CC_CONFIG = { leaderboardUrl: 'https://<your-app>.onrender.com' };
```

## API

- `GET /api/leaderboard?limit=50&playerId=...` → `{ top: [{rank,name,best,cat,bot?,you?}], me, total }`
- `POST /api/score` `{ playerId, name, best, cat }` → keeps each player's best distance (metres)
- `POST /api/name` `{ playerId, name }` → 2-16 letters/numbers, bad words rejected
- `GET /api/health`

Writes are limited to 30 per minute per address and distances above 30,000 m are rejected.
This is light anti-cheat only: a determined player can still post a fake score.

## Notes

- Admin mode (settings code) never submits scores. Remove `ADMIN_CODE` in `public/js/data.js` before release.
- Sounds are synthesized stand-ins (see the game's AUDIO notes).
