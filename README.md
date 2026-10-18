# BUGSONIC

*Small creatures. Living surfaces. Unstable sounds.*

An experimental audiovisual instrument: autonomous digital **bugs** crawl across visual surfaces, read what is beneath them (edges, cracks, colour, brightness), and turn it into sound. The sound feeds back and deforms the surface. Image and music shape each other in a continuous loop.

The first artwork built on it is **THE WALL**: photographs of city walls used as playable visual scores.

## Run it

```
npm install
npm run dev
```

Opens at `http://localhost:5173`. The browser app has no runtime dependencies; `ws` is a dev dependency used only by the local bridge.

## Use it

1. **Wake the wall** to start browser sound (requires a tap — browser policy).
2. **Bring your own** to load a wall image. Keys `1`-`9` switch walls.
3. **Drag** on the wall to scratch a crack. Bugs steer toward your pointer and click on cracks.
4. **Introduce a creature** / key `b` adds a bug (max 8). `n` generates a new wall. `space` toggles sound.

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
wall photo -> image analysis -> tuning system -> bug sampling -> FM synthesis -> FFT -> shear the wall -> bugs read the changed wall -> ...
```

| Layer | What it does |
|---|---|
| **Wall** | Each wall is analysed for edge density, crack density, brightness, hue, orientation |
| **Tuning** | Each image gets its own score. Edge density + texture set steps per octave (5-23 EDO). The image's luminance distribution picks the scale (its most common tone is the tonic). Edge energy across the image, left to right, sets a 16-step pulse. Brightness sets the root; edges + contrast set the tempo |
| **Bugs** | 4-8 autonomous agents with six legs. Entering an edge = FM note; crossing a thin dark line (darker than both sides) = filtered noise click; shadows and flat paint stay silent. Stereo panning from position; sounds land on the wall's pulse, and a ring (note) or cross (click) marks where each sound was read |
| **Compare** | Restart (`R`) replays a wall from a seed derived from its pixels. With feedback off, the same wall repeats the same encounters. Mute edge notes or crack clicks, and Inspect shows edges, cracks and the pulse columns |
| **Audio** | FM synthesis (2-operator). The wall sets the voice (carriers, FM ratios, brightness, decay) from texture, repetition, contrast and colour; the pixels under the bug shape each note. Effects chain: distortion, chorus, tempo-synced delay, algorithmic reverb, master compressor |
| **Feedback** | FFT energy speeds bugs up, bass pulls them down, the spectrum shears the live wall horizontally, wall slowly heals toward the original |
| **Events** | Every encounter emits a protocol-v1 message (`event`, `wall`, `state`) over WebSocket, forwarded to OSC by the bridge — see [docs/EVENT_SPEC.md](docs/EVENT_SPEC.md) |

## Repo layout

```
src/the-wall/
  index.html          shell (canvas + header + footer)
  main.js             entry point, wires all modules
  config.js           all constants and thresholds
  wall/               image analysis, tuning, wall generation, archive
  bug/                Bug class, colony management
  audio/              engine, FM synthesis, effects chain, rhythm grid
  sim/                fixed-step simulation clock, seeded randomness
  feedback/           animation loop, spectrum shearing
  events/             protocol v1 messages, resilient WebSocket link
  input/              pointer and keyboard handlers
  ui/                 controls, dashboard/telemetry, sound marks, inspection overlay, stylesheet
tools/
  bridge.js           WebSocket hub + OSC/UDP forwarder (npm run bridge)
docs/
  VISION.md           artistic vision
  ARCHITECTURE.md     system architecture
  SOUND_DESIGN.md     synthesis and effects reference
  EVENT_SPEC.md       event format specification
  PLAN.md             roadmap and status
walls/                wall photos (see walls/README.md)
```

## Docs

Current status: milestone 1 comparison controls and three real-photo fixtures are implemented; matched-level blind listening remains open. Milestone 2 audio measurement and output-safety work has not started. See [Resume next session](docs/PLAN.md#resume-next-session) for the handoff and [the photo set](walls/README.md) for loading instructions. The photos are not automatically loaded into the app.

- [Artistic vision](docs/VISION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Sound design](docs/SOUND_DESIGN.md)
- [Event format](docs/EVENT_SPEC.md)
- [Plan and roadmap](docs/PLAN.md)

## License

MIT — Iheb Rjeb, 2026.
