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
| **colony** | `bug/colony.js` | Bug collection: init, add, step all, draw all |
| **engine** | `audio/engine.js` | AudioContext, master gain, FFT reads |
| **synth** | `audio/synth.js` | FM synthesis voices, noise clicks |
| **effects** | `audio/effects.js` | Distortion, chorus, delay, reverb, compressor |
| **grid** | `audio/grid.js` | Quantises sounds to the wall's 16-step pulse on the audio clock |
| **loop** | `feedback/loop.js` | requestAnimationFrame orchestration |
| **shear** | `feedback/shear.js` | FFT-driven horizontal strip shifting + healing |
| **emitter** | `events/emitter.js` | JSON event creation, WebSocket send |
| **pointer** | `input/pointer.js` | Pointer/touch scratch interaction |
| **keyboard** | `input/keyboard.js` | Keyboard shortcuts |
| **controls** | `ui/controls.js` | Button handlers |
| **main** | `main.js` | Entry point: wires everything together |

## Data flow

1. A wall is selected (generated or uploaded photo).
2. `analysis.js` reads all pixels, computes luminance array and aggregate features (edge density, brightness, cracks, hue, orientation).
3. `tuning.js` maps features to musical parameters (EDO, scale degrees, root frequency, tempo).
4. Each frame, `loop.js` runs:
   - Reads FFT data from the analyser.
   - `shear.js` shifts horizontal strips of the live wall based on FFT bins, then blends the original back in (healing).
   - Re-measures luminance every 3 frames.
   - Steps all bugs: each bug reads luminance and gradient at its position, decides whether to trigger a sound.
5. When a bug triggers a sound:
   - `synth.js` creates an FM voice (carrier + modulator) routed through the effects chain.
   - `emitter.js` creates a JSON event and optionally sends it via WebSocket.
6. The effects chain processes all voices: distortion -> chorus -> delay (with filtered feedback) -> reverb -> compressor -> analyser -> speakers.

## Key design decisions

- **No frameworks, no runtime dependencies.** The entire system is vanilla JS + Web Audio API + Canvas API.
- **Vite for development only.** Hot reload during development; the app can also be built to a static `dist/` folder.
- **Modules communicate through function calls, not events.** The `main.js` entry point wires modules together explicitly. No global state, no event bus.
- **Audio interface object avoids circular imports.** Bugs receive an `audioAPI` object with `play`, `click`, `grid`, and `started` — they don't import audio modules directly.
- **Effects chain is built once.** All voices route through the same chain. Individual voice character comes from the wall's voice (set by its texture, repetition, contrast and colour) and the pixels under each bug.
