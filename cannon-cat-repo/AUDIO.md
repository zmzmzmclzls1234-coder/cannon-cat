# CANNON CAT - audio

All sounds are currently **synthesized stand-ins** (Web Audio, js/audio.js): the sandbox could not reach
Mixkit / Pixabay / Freesound / ElevenLabs. Each event has its own recipe, ±6% pitch jitter, a per-sound
rate limit and a 28-voice cap. Replace with recorded SFX (mono 44.1 kHz, MP3 64 kb/s, trimmed at -50 dBFS).

| Event | Stand-in recipe | Wanted recording |
| --- | --- | --- |
| boom | noise lowpass sweep + 140→38 Hz sine | cartoon cannon blast |
| meow / angry | sawtooth through moving bandpass, vibrato | real cat meow, cat hiss |
| dash / flop / glide / blink | noise sweeps + tones | swipe, falling whistle, fluffy poof, ninja smoke |
| boing | sine 160→520→240 with vibrato | spring boing |
| squawk / pop / crash / splash / thud | sawtooth FM / noise | bird squawk, balloon pop, ceramic pot smash, water splash, body thud |
| coin / tick / star / best / perfect / buy | square, triangle arpeggios | coin pickup, count tick, star chime, fanfare |
| UI hover / click / deny / open / close / tab / equip | short tones | button click set |
| honk / skip / ramp / penguin / beam | square chords, noise sweeps, FM | car horn, stone skip on water, ski whoosh, penguin squeak, UFO beam |
| zone / mission / rank | arpeggios | zone fanfare, mission jingle, rank-up jingle |
| music | 132 bpm 8-bar loop, transposed per zone, sine lead on the Moon | one loop per zone |
