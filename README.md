# BUGSONIC

*Small creatures. Living surfaces. Unstable sounds.*

An experimental audiovisual instrument: autonomous digital **bugs** crawl across visual surfaces, read what is beneath them (edges, cracks, colour, brightness), and turn it into sound. The sound feeds back and deforms the surface. Image and music shape each other in a continuous loop.

The first artwork built on it is **THE WALL**: photographs of city walls used as playable visual scores.

## Run it

```
npm install
npm run dev
```

Opens at `http://localhost:5173`. No other dependencies.

## Use it

1. **Start sound** (requires a tap — browser policy).
2. **Add photo** to load a wall image. Keys `1`-`9` switch walls.
3. **Drag** on the wall to scratch a crack. Bugs steer toward your pointer and click on cracks.
4. `+ bug` / key `b` adds a bug (max 8). `n` generates a new wall. `space` toggles sound.

## How it works

```
wall photo -> image analysis -> tuning system -> bug sampling -> FM synthesis -> FFT -> shear the wall -> bugs read the changed wall -> ...
```

| Layer | What it does |
|---|---|
| **Wall** | Each wall is analysed for edge density, crack density, brightness, hue, orientation |
| **Tuning** | Edge density sets steps per octave (5-23 EDO). Hue + orientation pick scale degrees. Brightness sets root frequency and tempo |
| **Bugs** | 4-8 autonomous agents with six legs. Edge = FM note, dark crack = filtered noise click, flat paint = silence. Per-bug voice identity, stereo panning from position, rhythm grid quantisation |
| **Audio** | FM synthesis (2-operator), per-bug filter + envelope. Effects chain: distortion, chorus, tempo-synced delay, algorithmic reverb, master compressor |
| **Feedback** | FFT energy speeds bugs up, bass pulls them down, the spectrum shears the live wall horizontally, wall slowly heals toward the original |
| **Events** | Every sound emits `{wall, bug, type, freq, brightness, edge, x, y}` — see [docs/EVENT_SPEC.md](docs/EVENT_SPEC.md) |

## Repo layout

```
src/the-wall/
  index.html          shell (canvas + header + footer)
  main.js             entry point, wires all modules
  config.js           all constants and thresholds
  wall/               image analysis, tuning, wall generation, archive
  bug/                Bug class, colony management
  audio/              engine, FM synthesis, effects chain, rhythm grid
  feedback/           animation loop, spectrum shearing
  events/             event emitter, WebSocket adapter
  input/              pointer and keyboard handlers
  ui/                 button/control wiring
docs/
  VISION.md           artistic vision
  ARCHITECTURE.md     system architecture
  SOUND_DESIGN.md     synthesis and effects reference
  EVENT_SPEC.md       event format specification
  PLAN.md             roadmap and status
walls/                wall photos (see walls/README.md)
```

## Docs

- [Artistic vision](docs/VISION.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Sound design](docs/SOUND_DESIGN.md)
- [Event format](docs/EVENT_SPEC.md)
- [Plan and roadmap](docs/PLAN.md)

## License

MIT — Iheb Rjeb, 2026.
