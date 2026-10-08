# Auto Anatomy Ai — 3D car anatomy Reels

Premium, fully procedural 3D "car anatomy" animations for Facebook Reels
(1080 × 1920, 30 fps, ~50 s), rendered with Three.js in headless Chromium.

| Episode | Car | Video | Caption |
| --- | --- | --- | --- |
| EP.01 | Nissan GT-R R35 | `renders/gtr-r35-anatomy.mp4` | `posts/ep01-gtr-r35.md` |
| EP.02 | Nissan Skyline GT-R R34 | `renders/ep02-skyline-r34.mp4` | `posts/ep02-skyline-r34.md` |

**Storyboard (every episode)**

| Time | Scene |
| --- | --- |
| 0 – 6 s | Studio reveal, lights wake up, title card |
| 6 – 9 s | X-ray scan sweeps the body front → rear |
| 9 – 13 s | Exploded view: body, interior/safety cell, powertrain, driveline, exhaust, suspension |
| 13 – 39 s | Six focus shots with spec cards (English + Sinhala) |
| 39 – 44 s | Reassembly and reverse scan back to paint |
| 44 – 50 s | Hero rear 3/4 shot, spec summary and "Follow Auto Anatomy Ai" |

Everything — the bodies, the mechanical parts, the soundtrack — is generated
from code. No third-party 3D models, textures or music are used.

## Project layout

```
model/build_body.py        SDF body -> marching cubes -> decimated mesh (+ exact SDF normals)
model/sdf.py               shared SDF helpers
model/cars/<car>.py        body field per car (gtr_r35, skyline_r34)
public/assets/<car>.bin    generated body meshes
src/cars/<car>/car.js      dimensions, paint, wheel/brake spec, exploded layout
src/cars/<car>/masks.js    per-pixel glass / trim / lamp / panel-gap regions (GLSL)
src/cars/<car>/parts.js    engine, turbos, cooling, gearbox, AWD, suspension, exhaust, chassis, interior
src/episodes/epNN.js       storyboard: spec cards, camera keys, titles, captions, music settings
src/story.js               loads the episode picked with ?ep= (browser) or EP= (node)
src/main.js                renderer, stage and director (applies the storyboard at time t)
src/overlay.js/.css        motion-graphics layer (titles, spec cards, leader lines)
src/partsKit.js, maskKit.js, storyKit.js   shared building blocks
scripts/render.mjs         frame-by-frame capture + ffmpeg encode (resumable)
scripts/cues.mjs, soundtrack.py   procedural music + SFX synced to the storyboard
posts/                     Facebook captions (Sinhala + English)
```

## Usage

Requirements: Node 18+, Python 3 with `numpy scipy scikit-image fast-simplification`
(only for rebuilding bodies and audio), ffmpeg, Playwright's Chromium.

```bash
npm install
CAR=skyline-r34 npm run build:model   # optional: regenerate a body mesh (~2 min)
EP=ep02 npm run build:audio           # build/ep02/soundtrack.wav
EP=ep02 npm run preview               # quick half-res 15 fps preview
node scripts/render.mjs --ep ep02 --encode renders/ep02-skyline-r34.mp4   # final render
```

Single frames: `node scripts/still.mjs out.png ep=ep02 t=15.5`
Interactive preview: `npm run serve`, then open `http://127.0.0.1:8080/?ep=ep02&play=1`.

Rendering uses software WebGL (SwiftShader), roughly 3–7 s per frame on 4 CPU cores.
Interrupted renders resume where they stopped.

## Making the next episode

1. `model/cars/<car>.py`: body field (copy an existing car and change the profiles), then build the mesh.
2. `src/cars/<car>/`: `car.js` (dimensions, wheels, paint, layout), `masks.js` (windows, lamps, panel lines), `parts.js` (mechanicals).
3. `src/episodes/epNN.js`: spec cards, camera keys, titles and captions.
4. Render, then write the caption in `posts/`.

*Fan-made illustrations, not affiliated with Nissan or any manufacturer.*
