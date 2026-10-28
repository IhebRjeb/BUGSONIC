# Architecture

BUGSONIC / THE WALL is a single-page browser application built with vanilla JavaScript ES modules, served by Vite.

## System diagram

```
                        +-----------+
                        |   Wall    |
                        |  Archive  |
                        +-----+-----+
                              |
                    select    |    analyse
                              v
+----------+          +------+------+          +---------+
|  Photo   | -------> |   Image     | -------> | Tuning  |
|  Upload  |          |  Analysis   |          | System  |
+----------+          +------+------+          +----+----+
                              |                     |
                     lum, grad, rgb          edo, scale, root, tempo
                              |                     |
                              v                     v
                        +-----+-----+         +-----+-----+
                        |   Bugs    | ------> |   Audio   |
                        |  Colony   |  play   |  Engine   |
                        +-----+-----+  click  +-----+-----+
                              |                     |
                         draw |              +------+------+
                              |              |   Effects   |
                              v              |   Chain     |
                        +-----+-----+        +------+------+
                        |  Display  |               |
                        |  Canvas   |        +------+------+
                        +-----+-----+        |   Output    | level, limiter,
                              ^              |  worklet    | measurement tap
                              |              +------+------+
                              |                     | blocks
                              |              +------+------+
                              |              |  Monitor +  |
                              +--------------+  Response   |
                          rebuild live wall  +-------------+
```

## Module map

| Module | File | Responsibility |
|---|---|---|
| **config** | `config.js` | All constants: canvas size, thresholds, audio params |
| **Wall** | `wall/Wall.js` | Wall class: canvas, thumbnail, features, tuning |
| **archive** | `wall/archive.js` | Collection management: add, select, switch; image loading and cover-crop |
| **collection** | `wall/collection.js` | Loads the repository's `walls/` photos at start, ordered and credited by `walls/index.json` |
| **analysis** | `wall/analysis.js` | Pixel reads: luminance, gradient, ridges (cracks), local colour, spatial image score |
| **tuning** | `wall/tuning.js` | Image score to music: EDO, scale, root, tempo, pulse, wall voice |
| **generator** | `wall/generator.js` | Procedural wall texture generation |
| **Bug** | `bug/Bug.js` | Bug class: movement, legs, sampling, sound triggers |
| **colony** | `bug/colony.js` | Bug collection: seeded init and restart, add, step all, draw all |
| **engine** | `audio/engine.js` | AudioContext, fixed drive, effects (rebuildable), output worklet, output level, monitor, block subscribers |
| **output worklet** | `audio/output.worklet.js` | Audio thread: output gain, stereo-linked lookahead sample-peak limiter, posts every output block |
| **monitor** | `audio/monitor.js` | Consumes every output block: RMS, peak hold, Hz bands, onsets, strip spectrum |
| **synth** | `audio/synth.js` | FM voices and noise clicks on per-layer mute buses; cancels voices not yet started |
| **effects** | `audio/effects.js` | Distortion, chorus, delay, reverb (seeded impulse), compressor |
| **meter** | `audio/meter.js` | Pure float-PCM RMS/peak, envelopes, windowed spectrum, Hz bands, spectral flux |
| **wav** | `audio/wav.js` | WAV encoding (32-bit float) and decoding |
| **grid** | `audio/grid.js` | Places sounds on the wall's 16-step pulse (wait limit, per-step cap) and maps them to the audio clock |
| **clock** | `sim/clock.js` | Fixed 60 Hz simulation steps, following the audio clock while sound runs; counts dropped time |
| **rng** | `sim/rng.js` | Seeded random streams, one per bug |
| **loop** | `feedback/loop.js` | requestAnimationFrame orchestration; surface updates every 3 simulation steps; feedback switch |
| **response** | `feedback/response.js` | Bounded, time-based strip offsets from measured output and audible encounters |
| **render** | `feedback/render.js` | Rebuilds the live wall from the working surface with strip offsets |
| **emitter** | `events/emitter.js` | JSON event creation, WebSocket send |
| **pointer** | `input/pointer.js` | Pointer/touch scratch interaction |
| **keyboard** | `input/keyboard.js` | Keyboard shortcuts |
| **controls** | `ui/controls.js` | Button handlers, comparison controls |
| **marks** | `ui/marks.js` | Encounter marks shown when each sound is due; solid when audible, dashed otherwise |
| **inspect** | `ui/inspect.js` | Optional overlay: edges, cracks, pulse columns and audible step |
| **take** | `ui/take.js` | Isolated comparison takes: WAV + JSON record with validity |
| **motion** | `ui/motion.js` | Reduced-motion preference (presentation only) |
| **fieldnote** | `ui/fieldnote.js` | Handwritten manifesto (`<dialog>`), white paper and black/red/blue ink inspired by the reference note; bundled Kalam, sticky actions, responsive scrolling; first visit only, reopened from the header; waking starts sound from the same click |
| **probe** | `ui/probe.js` | Hover readout of the live surface: x, y, luminance, gradient, ridge depth |
| **main** | `main.js` | Entry point: wires everything together |
| **bridge** | `tools/bridge.js`, `tools/osc.js` | WebSocket hub and OSC forwarder; pure validation/encoding in `osc.js` |
| **match-takes** | `tools/match-takes.js` | Offline RMS matching and anonymizing of takes |

## Data flow

1. At start, the `walls/` photos are added to the archive (a generated wall if the folder is empty) and the first is selected. A wall is selected (collection, generated or uploaded photo). Sounds still waiting on the pulse are cancelled.
2. `analysis.js` reads all pixels and computes the spatial image score plus a pixel-hash seed.
3. `tuning.js` maps the score to EDO, scale, root, tempo, pulse and wall voice.
4. Each frame, `loop.js` runs:
   - Reads the measured output from the monitor (zero while browser sound is off) and maps it to bounded 0-1 controls.
   - Runs the fixed simulation steps that `clock.js` says are due. Every 3 steps, `response.js` advances (time in seconds) and `render.js` rebuilds the live wall from the working surface; the live pixels are re-measured. In each step, every bug moves and reads luminance, gradient and ridge depth at its position. With feedback off, displacement returns to zero and measured output does not affect the bugs.
   - Draws the live wall (or the unshifted working surface with reduced motion), the optional inspection overlay, encounter marks and the bugs.
5. When a bug enters an edge or crosses a crack, `grid.js` picks the first active pulse step with room among the next step and the four after it (under 1.25 beats). If there is none the encounter rests. Otherwise:
   - `synth.js` schedules the voice at that step on the audio clock, through its layer bus.
   - A mark and the bug's flash appear when the sound is due (scheduling latency plus the limiter lookahead).
   - `emitter.js` creates a JSON event and optionally sends it via WebSocket.
6. All voices: drive -> distortion -> chorus -> delay (with filtered feedback) -> reverb -> compressor -> output worklet (level, limiter) -> speakers. The worklet posts each output block to the monitor and to any take being recorded; the byte analyser after it only draws the spectrum display.

Restart (button or `R`) copies the archived wall back, clears the displacement, re-measures, and recreates the bugs from the wall's seed at simulation time 0. With feedback off and no pointer input, the encounter sequence repeats at any frame rate. A comparison take also rebuilds the effects chain, so no earlier tail is recorded. Audio waveforms are still not guaranteed identical (sub-sample scheduling, browser DSP).

## Key design decisions

- **No frameworks, no runtime dependencies.** The entire system is vanilla JS + Web Audio API + Canvas API.
- **Vite for development only.** Hot reload during development; the app can also be built to a static `dist/` folder.
- **Modules communicate through function calls, not events.** The `main.js` entry point wires modules together explicitly. No global state, no event bus.
- **Audio interface object avoids circular imports.** Bugs receive an `audioAPI` object with `play`, `click`, `next`, `time`, `mark`, `audible`, `started` and `external` — they don't import audio modules directly.
- **One protected output.** Every audible path passes the output worklet; there is no unprotected fallback. The effects chain can be rebuilt to drop tails (comparison takes).
- **Measurement follows the audio, not the display.** The monitor consumes every output block; the response and pixel reads advance on simulation steps.
- **The live wall is derived, not accumulated.** Archived score pixels, working surface (with scratches) and displacement are separate; the live wall is rebuilt from the working surface.
- **Tests run in Node.** `npm test` covers analysis, scheduling, replay, measurement, limiter, routing (on a recording Web Audio mock), response, protocol, bridge and takes. Two dev pages (`audio-check.html`, `surface-check.html`) check real Web Audio and Canvas behaviour in the browser.
