# BUGSONIC

*Small creatures. Living surfaces. Unstable sounds.*

An experimental audiovisual instrument: autonomous digital **bugs** crawl across visual surfaces, read what is beneath them (edges, cracks, colour, brightness), and turn it into sound. The sound feeds back and deforms the surface. Image and music shape each other in a continuous loop.

The first artwork built on it is **THE WALL**: photographs of city walls used as playable visual scores.

## Run it

```
npm install
npm run dev
```

Opens at `http://localhost:5173`. The browser app has no runtime dependencies; `ws` is a dev dependency used only by the local bridge. Browser sound needs AudioWorklet (localhost or HTTPS).

`npm test` runs the regression suite (Node 20+ built-in runner): synthetic walls, score/seed determinism, pulse scheduling, frame-rate-independent replay, measurement, output limiter, audio routing, feedback response, protocol/OSC/bridge and takes. With `npm run dev` running, `/audio-check.html?rate=48000` (or `44100`) and `/surface-check.html` check real Web Audio and Canvas behaviour; each reports `"pass": true`.

## Use it

0. On a first visit, **Field note 001** (the manifesto) opens over the wall: **Wake the wall** starts sound, **Enter without sound** or `Esc` closes it. Reopen it from the header. **Turn the page →** (or **Original scan**) reveals the handwritten source page: enlarge it or open the full image. **← Back to the manifesto** returns to accessible text. The original framing is preserved, and the scan is not a playable wall. Kalam is bundled locally; controls and measurements keep a monospace font.
1. **Wake the wall** to start browser sound (requires a tap — browser policy).
2. The photos in [walls/](walls/README.md) load at start; keys `1`-`9` switch walls. **Bring your own** adds another image for the session.
3. **Drag** on the wall to scratch a crack. Bugs steer toward your pointer and click on cracks. Hovering shows what a bug would read there: position, luminance, edge gradient, crack depth.
4. **Introduce a creature** / key `b` adds a bug (max 8). `n` generates a new wall. `space` toggles sound.
5. **Record comparison take** saves 60 s + 4 s of the current wall (clean effects, seeded restart) as a float WAV with a JSON record. `npm run match-takes -- <folder>` RMS-matches and anonymizes takes for blind listening.

## External out

Every encounter can leave the browser. Browser sound and external out are independent: silence the browser and let TouchDesigner, Hydra, Max or a synth be the voice.

```
npm run bridge        # ws://127.0.0.1:9980  →  OSC udp://127.0.0.1:7000
```

Then press **Connect** in *04 / External out*. The panel shows link state, messages sent, listeners on the bridge, the OSC target and a live signal log. It reconnects on its own if the bridge restarts.

Bridge options: `--port 9980`, `--osc-host 127.0.0.1`, `--osc-port 7000`, `--no-osc`, `--allow-origin <url>` (repeatable), `--verbose`.

**TouchDesigner**: *OSC In DAT* on port `7000` for `/bugsonic/note` and `/bugsonic/crack`. *OSC In CHOP* on port `7000` for the `/bugsonic/bug` and `/bugsonic/energy` channels (turn on **Stream creature positions**). Alternatively, use a *WebSocket DAT* to `127.0.0.1:9980` and parse the JSON in its callbacks.

**Hydra**: start the bridge with `--allow-origin https://hydra.ojack.xyz`, then:

```js
let hit = 0
const ws = new WebSocket('ws://127.0.0.1:9980')
ws.onmessage = (m) => { if (JSON.parse(m.data).kind === 'event') hit = 1 }
update = () => { hit *= 0.9 }
osc(10, 0.1, () => hit * 2).kaleid(4).out()
```

Full message and OSC reference: [docs/EVENT_SPEC.md](docs/EVENT_SPEC.md).

## How it works

```
wall photo -> image analysis -> tuning system -> bug sampling -> FM synthesis -> protected, measured output -> strips of the wall move -> bugs read the changed wall -> ...
```

| Layer | What it does |
|---|---|
| **Wall** | Each wall is analysed for edge density, crack density, brightness, hue, orientation |
| **Tuning** | Each image gets its own score. Edge density + texture set steps per octave (5-23 EDO). The image's luminance distribution picks the scale (its most common tone is the tonic). Edge energy across the image, left to right, sets a 16-step pulse. Brightness sets the root; edges + contrast set the tempo |
| **Bugs** | 4-8 autonomous agents with six legs. Entering an edge = FM note; crossing a thin dark line (darker than both sides) = filtered noise click; shadows and flat paint stay silent. Stereo panning from position; sounds land on the wall's pulse, and a ring (note) or cross (click) marks where each sound was read — dashed when the browser does not play it |
| **Compare** | Restart (`R`) replays a wall from a seed derived from its pixels. With feedback off, the same wall repeats the same encounters. Mute edge notes or crack clicks, Inspect shows edges, cracks and the pulse columns, and comparison takes record isolated WAVs |
| **Audio** | FM synthesis (2-operator). The wall sets the voice (carriers, FM ratios, brightness, decay) from texture, repetition, contrast and colour; the pixels under the bug shape each note. Effects chain: distortion, chorus, fixed 370 ms delay, convolution reverb with a seeded impulse, compressor. Then the output stage: level after the effects (zero silences tails too), lookahead sample-peak limiter at −1 dBFS, continuous measurement (`OUT / PEAK / LIMIT`) |
| **Feedback** | Output loudness sets how far horizontal strips of the wall move, the spectrum picks which ones, and each audible encounter nudges the strip where it was read. Bounded to 7 px, back to rest when the sound stops, rebuilt from the wall each time so nothing smears. Loudness speeds the bugs, bass pulls them down. Reduced motion keeps the wall still |
| **Events** | Every encounter emits a protocol-v1 message (`event`, `wall`, `state`) over WebSocket, forwarded to OSC by the bridge — see [docs/EVENT_SPEC.md](docs/EVENT_SPEC.md) |

## Repo layout

```
src/the-wall/
  index.html          shell (canvas + header + footer)
  main.js             entry point, wires all modules
  config.js           all constants and thresholds
  wall/               image analysis, tuning, wall generation, archive
  bug/                Bug class, colony management
  audio/              engine, output worklet (level + limiter), monitor, meter, FM synthesis, effects, rhythm grid, WAV
  sim/                fixed-step simulation clock, seeded randomness
  feedback/           animation loop, bounded response, live-wall rendering
  events/             protocol v1 messages, resilient WebSocket link
  input/              pointer and keyboard handlers
  ui/                 controls, dashboard/telemetry, marks, inspection overlay, takes, reduced motion, stylesheet
  audio-check.html    dev-only offline render check (output protection)
  surface-check.html  dev-only canvas check (bounded response, recovery)
tools/
  bridge.js           WebSocket hub + OSC/UDP forwarder (npm run bridge)
  osc.js              protocol validation and OSC encoding
  match-takes.js      RMS-match and anonymize comparison takes (npm run match-takes)
tests/                regression suite and synthetic wall fixtures (npm test)
docs/
  VISION.md           artistic vision
  ARCHITECTURE.md     system architecture
  SOUND_DESIGN.md     synthesis and effects reference
  EVENT_SPEC.md       event format specification
  CREATIVE_STRATEGY.md design rationale, material vocabulary and validation method
  PLAN.md             roadmap and status
walls/                wall photos (see walls/README.md)
```

## Docs

Current status (2026-10-28): image-identity comparison tools, measured and protected output, comparison takes and a bounded, time-based feedback response are implemented and tested. **No listening session has taken place yet.** Next: the blind, level-matched listening pass on the three photos, then with feedback on, then voice calibration from the findings. See [the creative strategy](docs/CREATIVE_STRATEGY.md), [Resume next session](docs/PLAN.md#resume-next-session) and [the photo set](walls/README.md), which loads automatically.

- [Artistic vision](docs/VISION.md)
- [Creative and technical strategy](docs/CREATIVE_STRATEGY.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Sound design](docs/SOUND_DESIGN.md)
- [Event format](docs/EVENT_SPEC.md)
- [Plan and roadmap](docs/PLAN.md)

## License

MIT — Iheb Rjeb, 2026.
