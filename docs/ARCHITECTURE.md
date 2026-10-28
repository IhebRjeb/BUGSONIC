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
                        |  Canvas   |          FFT  |
                        +-----+-----+               |
                              ^              +------+------+
                              |              |  Feedback   |
                              +--------------+   Loop      |
                                shear+heal   +-------------+
```

## Module map

| Module | File | Responsibility |
|---|---|---|
| **config** | `config.js` | All constants: canvas size, thresholds, audio params |
| **Wall** | `wall/Wall.js` | Wall class: canvas, thumbnail, features, tuning |
| **archive** | `wall/archive.js` | Collection management: add, select, switch |
| **analysis** | `wall/analysis.js` | Pixel reads: luminance, gradient, ridges (cracks), local colour, spatial image score |
| **tuning** | `wall/tuning.js` | Image score to music: EDO, scale, root, tempo, pulse, wall voice |
| **generator** | `wall/generator.js` | Procedural wall texture generation |
| **Bug** | `bug/Bug.js` | Bug class: movement, legs, sampling, sound triggers |
| **colony** | `bug/colony.js` | Bug collection: seeded init and restart, add, step all, draw all |
| **engine** | `audio/engine.js` | AudioContext, output level (dry and delay send), FFT reads |
| **synth** | `audio/synth.js` | FM voices and noise clicks on per-layer mute buses; cancels voices not yet started |
| **effects** | `audio/effects.js` | Distortion, chorus, delay, reverb, compressor |
| **meter** | `audio/meter.js` | Pure float-PCM RMS/peak, envelopes, Hz bands, spectral flux (tested; not yet wired into the audio graph) |
| **grid** | `audio/grid.js` | Places sounds on the wall's 16-step pulse (wait limit, per-step cap) and maps them to the audio clock |
| **clock** | `sim/clock.js` | Fixed 60 Hz simulation steps, following the audio clock while sound runs |
| **rng** | `sim/rng.js` | Seeded random streams, one per bug |
| **loop** | `feedback/loop.js` | requestAnimationFrame orchestration; feedback switch |
| **shear** | `feedback/shear.js` | FFT-driven horizontal strip shifting + healing |
| **emitter** | `events/emitter.js` | JSON event creation, WebSocket send |
| **pointer** | `input/pointer.js` | Pointer/touch scratch interaction |
| **keyboard** | `input/keyboard.js` | Keyboard shortcuts |
| **controls** | `ui/controls.js` | Button handlers, comparison controls |
| **marks** | `ui/marks.js` | Sound-source marks shown when each sound is heard |
| **inspect** | `ui/inspect.js` | Optional overlay: edges, cracks, pulse columns and audible step |
| **main** | `main.js` | Entry point: wires everything together |

## Data flow

1. A wall is selected (generated or uploaded photo). Sounds still waiting on the pulse are cancelled.
2. `analysis.js` reads all pixels and computes the spatial image score plus a pixel-hash seed.
3. `tuning.js` maps the score to EDO, scale, root, tempo, pulse and wall voice.
4. Each frame, `loop.js` runs:
   - Reads FFT data from the analyser.
   - With feedback on, `shear.js` shifts horizontal strips of the live wall based on FFT bins; the original always blends back in (healing).
   - Re-measures luminance every 3 frames.
   - Runs the fixed simulation steps that `clock.js` says are due. In each, every bug moves and reads luminance, gradient and ridge depth at its position. With feedback off, FFT energy does not affect the bugs.
   - Draws the wall, the optional inspection overlay, sound-source marks and the bugs.
5. When a bug enters an edge or crosses a crack, `grid.js` picks the first active pulse step with room among the next step and the four after it (under 1.25 beats). If there is none the encounter rests. Otherwise:
   - `synth.js` schedules the voice at that step on the audio clock, through its layer bus.
   - A mark and the bug's flash appear when the sound is heard.
   - `emitter.js` creates a JSON event and optionally sends it via WebSocket.
6. The effects chain processes all voices: distortion -> chorus -> delay (with filtered feedback) -> reverb -> compressor -> analyser -> speakers.

Restart (button or `R`) copies the archived wall back, re-measures it, and recreates the bugs from the wall's seed at simulation time 0. With feedback off and no pointer input, the encounter sequence repeats at any frame rate. Audio waveforms are not guaranteed identical (click noise offsets vary, and browsers differ).

## Key design decisions

- **No frameworks, no runtime dependencies.** The entire system is vanilla JS + Web Audio API + Canvas API.
- **Vite for development only.** Hot reload during development; the app can also be built to a static `dist/` folder.
- **Modules communicate through function calls, not events.** The `main.js` entry point wires modules together explicitly. No global state, no event bus.
- **Audio interface object avoids circular imports.** Bugs receive an `audioAPI` object with `play`, `click`, `grid`, and `started` — they don't import audio modules directly.
- **Effects chain is built once.** All voices route through the same chain. Individual voice character comes from the wall's voice (set by its texture, repetition, contrast and colour) and the pixels under each bug.
