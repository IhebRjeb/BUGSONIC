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
- Per-wall feature analysis: edge density, crack density, brightness, hue, orientation
- Per-wall tuning derivation: EDO, scale, root frequency, tempo

### Bug system
- 4-8 autonomous agents with six legs (IK-like stepping)
- Sinusoidal wandering + random jitter + pointer attraction
- FFT energy speeds bugs up, bass pulls them down
- Edge detection triggers FM notes, crack detection triggers noise clicks
- Per-bug voice identity (carrier type, FM ratio, filter, detune)
- Stereo panning from position, rhythm grid quantisation

### Audio
- 2-operator FM synthesis with per-bug voice profiles
- Filtered noise clicks with pitch envelope for cracks
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
7. No Strudel integration, no OSC bridge, no MIDI output.

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
- [ ] OSC bridge (small Node script)
- [ ] WebSocket adapter tested with TouchDesigner

### Later
- Community wall uploads (public API)
- New environmental inputs: light, weather, camera, microphone
- Bug species with different behaviours (eaters, followers, nesters)
- Pheromone trails (often-read places become attractors)
- Two walls side by side with bugs migrating between them
