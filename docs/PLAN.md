# Plan and status

## What works now

### Architecture (v3 — modular)
- 19 ES modules served by Vite, zero runtime dependencies
- Clean separation: wall analysis, tuning, bugs, audio, effects, feedback, events, input, UI
- All constants centralised in `config.js`

### Wall system
- Procedural wall generation (layered rectangles, posters, cracks)
- Photo upload with cover-crop to 480x640
- Archive strip with wall switching (click or keys 1-9)
- Per-wall image score: edge density, texture scale, contrast, coherence, repetition, saturation-weighted hue, luminance distribution, left-to-right edge profile, ridge (crack) density
- Per-wall tuning derivation: EDO, scale from the luminance distribution, root, tempo, 16-step pulse, wall voice

### Bug system
- 4-8 autonomous agents with six legs (IK-like stepping)
- Sinusoidal wandering + random jitter + pointer attraction, frame-rate independent
- FFT energy speeds bugs up, bass pulls them down
- Entering an edge triggers an FM note; crossing a thin dark ridge triggers a noise click (with hysteresis)
- Stereo panning from position; sounds and flashes land on the wall's pulse

### Audio
- 2-operator FM synthesis; wall voice + local pixels shape each note
- Filtered noise clicks; crack depth sets pitch, length and level
- Effects chain: waveshaper distortion, chorus, delay (filtered feedback), algorithmic reverb, master compressor
- FFT analyser feeds the visual feedback loop

### Feedback loop
- Spectrum shears horizontal strips of the live wall
- Wall slowly heals toward the original (5% blend per frame)
- Luminance re-measured every 3 frames

### Events
- JSON events emitted per sound, displayed in footer
- Optional WebSocket output for external tools

## Known limits
1. Never tested with real wall photos. Tuning mappings may need calibration.
2. Archive is in-memory only. Reload loses uploaded walls.
3. WebSocket blocked on hosted pages (browser security). Works locally.
4. Full-frame pixel read every 3 frames may stutter on weak devices.
5. Photos are cover-cropped to 480x640, losing detail on non-portrait images.
6. No wall metadata (location, GPS).
7. No Strudel integration, no MIDI output. OSC goes through the local bridge only.

## Next steps

### Wall system
- [ ] Add 15-20 real wall photos to `walls/` with `walls/index.json`
- [ ] Auto-load `walls/index.json` on startup
- [ ] Calibrate tuning mappings against real photos
- [ ] IndexedDB persistence for uploaded walls

### Sound refinement
- [ ] Test and tune FM index ranges against real wall textures
- [ ] Experiment with tempo-synced delay times
- [ ] Add more voice variety (granular, sample-based options)

### External integration
- [ ] Strudel layer that follows wall scale and tempo
- [x] OSC bridge (`tools/bridge.js`, `npm run bridge`)
- [x] Protocol v1: `event`, `wall`, `state`, silent external mode, auto-reconnect
- [ ] Test the bridge with a real TouchDesigner and Hydra patch
- [ ] Web MIDI output

### Later
- Community wall uploads (public API)
- New environmental inputs: light, weather, camera, microphone
- Bug species with different behaviours (eaters, followers, nesters)
- Pheromone trails (often-read places become attractors)
- Two walls side by side with bugs migrating between them
