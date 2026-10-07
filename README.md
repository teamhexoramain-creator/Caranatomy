# Car Anatomy — EP.01 · Nissan GT-R R35

A premium, fully procedural 3D "car anatomy" animation for Facebook Reels
(1080 × 1920, 30 fps, ~50 s), rendered with Three.js in headless Chromium.

**Storyboard**

| Time | Scene |
| --- | --- |
| 0 – 6 s | Studio reveal, lights wake up, title card *NISSAN GT-R R35 "GODZILLA"* |
| 6 – 9 s | X-ray scan sweeps the body front → rear |
| 9 – 13 s | Exploded view: body, interior/safety cell, powertrain, driveline, exhaust, suspension |
| 13 – 39 s | Six focus shots with spec cards (English + Sinhala): VR38DETT engine, twin IHI turbos, GR6 transaxle, ATTESA E-TS AWD (live torque-flow), Brembo brakes, DampTronic suspension |
| 39 – 44 s | Reassembly and reverse scan back to paint |
| 44 – 50 s | Hero rear 3/4 shot, spec summary and call to action |

Everything — the body, the mechanical parts, the soundtrack — is generated
from code. No third-party 3D models, textures or music are used.

## Project layout

```
model/build_body.py   GT-R body as a signed-distance field -> marching cubes -> decimated mesh
public/assets/body.bin   generated body mesh (positions, SDF normals, indices)
public/fonts/         Barlow Condensed, Noto Sans Sinhala, JetBrains Mono (SIL OFL 1.1)
src/main.js           renderer, stage, director (applies the storyboard at time t)
src/story.js          storyboard: timings, camera keys, spec cards, audio cues
src/body.js           paint / glass / x-ray materials; src/bodyMasks.js per-pixel panel regions
src/parts.js          engine, turbos, cooling, transaxle, AWD, suspension, exhaust, chassis, interior
src/wheels.js         20" twin-spoke wheels, tyres, drilled rotors, calipers
src/overlay.js/.css   motion-graphics layer (titles, spec cards, leader lines)
scripts/render.mjs    frame-by-frame capture + ffmpeg encode (resumable)
scripts/soundtrack.py procedural music + SFX synced to the cue list
```

## Usage

Requirements: Node 18+, Python 3 with `numpy scipy scikit-image fast-simplification`
(only for rebuilding the body), ffmpeg, Playwright's Chromium.

```bash
npm install
npm run build:model     # optional: regenerate public/assets/body.bin (~2 min)
npm run build:audio     # build/soundtrack.wav
npm run preview         # quick half-res 15 fps preview -> build/preview.mp4
npm run render          # final 1080x1920 30 fps -> build/gtr-r35-anatomy.mp4
```

Single frames for checking: `node scripts/still.mjs out.png t=15.5`
Interactive preview: `npm run serve`, then open `http://127.0.0.1:8080/?play=1`.

Rendering uses software WebGL (SwiftShader), roughly 3–7 s per frame on 4 CPU cores.
Interrupted renders resume where they stopped.

## Making the next episode

Most of the episode lives in `src/story.js` (text, specs, camera moves) and
`src/parts.js` (mechanical layout). A new car needs a new body field in
`model/build_body.py` plus matching mask regions in `src/bodyMasks.js`.

*Fan-made illustration, not affiliated with Nissan. Specs: GT-R R35 MY2017+
(570 PS / 637 Nm, 315 km/h).*
