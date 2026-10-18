# Plan and status

Updated 2026-10-18. Latest pushed checkpoint: `8364154` on `feature/initial-version` (deployment not verified).

## Creative direction

Make each image a recognizable instrument, and make the origin of each sound visible. More synthesis layers are useful only when they strengthen that relationship.

- Structure: contours, spacing and repetition shape phrases, pulses and rests.
- Material: local texture, contrast and colour shape articulation and resonance.
- Response: audible events leave localized, temporary marks on the same surface.
- Identity: the original image supplies a stable score; live deformation supplies variation without erasing that identity.

These are designed artistic mappings, not predictions of an object's physical sound. Preserve the light visual identity and keep the wall as the primary experience.

## Implemented baseline

- Modular browser instrument served by Vite, with procedural walls, photo upload and an in-memory archive.
- Spatial image analysis: edge density, texture, contrast, coherence, repetition, colour, luminance distribution, column energy and thin dark ridges.
- Image-derived EDO, scale, root, tempo, 16-step pulse and FM voice; local pixels modulate individual sounds.
- Edge-entry notes and ridge-crossing clicks with hysteresis, separate cooldowns, stereo position and pulse-aligned bug flashes.
- Distortion, chorus, delay, convolution reverb and compression; FFT-driven strip shear and healing.
- Protocol v1, silent external mode, reconnecting WebSocket output and a local OSC bridge.
- Hosted connection guidance with explicit origin permission. Hosted-to-loopback WebSocket access was tested; browser local-network restrictions still vary.

Synthetic probes confirmed repeatable scores, structural differences and mirrored pulse patterns. Build and browser smoke checks passed. This does not establish perceptual distinctiveness, repeatable performances, or finished musical calibration.

## 1. Make image identity testable (in progress)

Deliver a small comparison workflow before adding a new synthesizer.

- [x] Assemble three contrasting, rights-cleared real images: smooth surface, repeated structure and fractured/grainy surface. Retain synthetic fixtures for exact assertions. See `walls/index.json` (photos and the projected artwork by the repo owner).
- [x] Record score version and seed; add repeatable restart with controlled simulation steps and random sources. Score v2; seed = hash of the wall's pixels; fixed 60 Hz steps follow the audio clock; one seeded stream per bug. Not bit-identical audio.
- [x] Add feedback toggle and note/click mute (each layer on its own bus, including its delay send). Output level now scales the delay send too. Loudness matching between walls waits for the RMS measurement in milestone 2; comparisons currently share one output level.
- [x] Mark the sampled location when a sound is heard (ring = note, cross = click). Optional Inspect overlay: edges, cracks, silent pulse columns and the audible step.
- [x] Sparse-pulse policy: first active step within one beat with fewer than 3 sounds, otherwise rest (no sound, no event). Wall changes cancel sounds not yet started.

Acceptance: same image/seed/settings reproduce the event sequence with feedback off in controlled tests; flat, stripe and ridge fixtures retain their expected distinctions. Scheduled markers identify the source coordinates. No stale events follow a wall switch. Compare matched-level recordings without image labels and document which images remain distinguishable and which mappings need adjustment.

Verified so far: a headless run of the real bug, clock and grid modules gives identical 300-event sequences across repeats and at 30, 47.3, 60 and 144 FPS; a different seed differs; waits stay within one beat, no step holds more than 3 sounds, none land on silent steps. A sparse left-heavy pulse rested 199 of 375 encounters. In the browser with sound on and feedback off, two restarts produced the same 19 events. Hidden or heavily throttled tabs drop simulation time (by design), which breaks replay.

Real-photo scores (upload path in the browser; 60 s headless runs, 4 bugs, feedback off):

| Wall | edges / cracks / texture / repeat | EDO, root, tempo | pulse | events (notes/clicks) | note range |
|---|---|---|---|---|---|
| Djerba eye (smooth) | 0.024 / 0.018 / 0.34 / 0 | 10, 100 Hz, 91 bpm | `xxxxxxx...x.....` | 219 (166/53) | 100–230 Hz |
| Lafayette Earth (repeated) | 0.082 / 0.109 / 0.34 / 0.22 | 15, 140 Hz, 115 bpm | `.x..xxxxxxxx....` | 535 (352/183) | 154–674 Hz |
| Ibn El Jazzar (fractured) | 0.124 / 0.177 / 0.48 / 0 | 18, 143 Hz, 119 bpm | `xxxxxx.....xxxx.` | 766 (430/336) | 143–667 Hz |

Each wall replays identically and matches at 60 and 144 FPS; the three sequences differ. The smooth wall is clearly separated by density, register and pulse. Measured gaps for listening to check:

- All three fall in the same FM voice family (texture 0.34–0.48 sits in the middle third), so timbre differs only by index and cutoff.
- Repeated and fractured share nearly the same root (140/143 Hz), tempo (115/119 bpm) and note range; they differ mainly in EDO, scale, pulse and click rate.
- The checkered suit covers too little of the frame to register as repetition (0.22 < 0.5), so harmonic FM ratios never engage on real photos.
- Seeds come from decoded pixels, so a different JPEG decoder (browser or tool) gives a different seed for the same file.

Outstanding: the blind listening comparison (same output level, labels hidden), then record which walls stay distinguishable. Mapping changes from these findings belong to milestone 3.

## 2. Give the feedback meaningful audio measurements

Replace rough FFT proxies before making deformation more elaborate.

- [ ] Measure time-domain RMS, frequency bands defined in Hz and positive spectral change for transient detection; give each an explicit smoothing/release time.
- [ ] Audit dry and effect-send routing so output level controls every audible path. Add conservative headroom, peak monitoring and tested output protection; compression alone is not a guaranteed peak limiter.
- [ ] Use RMS for deformation depth, low-frequency energy for slow displacement and transients for short localized impulses. Keep frequency bands distinct from image-derived rhythm.
- [ ] Make healing and response envelopes time-based; bound displacement and preserve a recoverable original image.

Acceptance: silence, tones and impulses produce the expected measurements at 44.1 and 48 kHz. Overlapping voices and effect tails pass finite-output and peak checks. Muting the output silences every path. Compare decay and displacement at 30/60/120 Hz rendering; reduced-motion mode retains clear sound-event cues.

## 3. Develop material voices and visual gestures

Deepen the existing instrument before expanding its engine count.

- [ ] Calibrate FM/filter/envelope ranges using milestone 1 recordings: smooth areas sustain gently, repeated edges form clearer motifs, fractured regions articulate short attacks.
- [ ] Let local texture influence articulation without continually replacing the wall's scale or root. Test tempo-synced delay and keep a dry reference available.
- [ ] Shape short visual traces by local contour direction; distinguish notes from cracks through shape and duration, not colour alone. Avoid a permanent generic glow over the image.
- [ ] Add restrained phrase-level variation and rests only where they preserve the image's pulse and remain reproducible.
- [ ] Vary generated compositions beyond the central figure so spatial rhythm is not consistently centre-heavy.

Acceptance: keep only changes that improve source-to-sound recognition in matched-level comparisons. Markers remain readable over light/dark images, disappear cleanly and do not obscure texture. Verify desktop/mobile layout and pointer/touch use with screenshots and interaction tests.

## 4. Pilot digital grain (optional bytebeat)

Bytebeat is an additional image-derived voice, not the new default sound.

- [ ] Evaluate a pinned `bytebeat.js` AudioWorklet integration using one original, bounded application-generated expression family; no unrestricted formula editor.
- [ ] Map image repetition to masks/sequences and texture to timbre. Keep musical tempo independent of the bytebeat sample rate.
- [ ] Add layer mix/mute, DC removal, finite-value guards, protected output and crossfades for wall changes; test sample-rate conversion.
- [ ] Tie visual grain to this layer's measured activity, leaving the original image inspectable. Handle worklet failure by keeping the existing instrument available.

Acceptance: compare with the layer muted at matched overall level. Retain it only if it adds recognizable image character rather than masking notes and cracks. Test HTTPS worklet loading, pause/resume, wall switching and invalid output. The HTML5 Bytebeat application's MIT license does not establish reuse rights for featured community formulas or generated music.

## 5. Make the instrument durable

- [ ] Preserve uploaded walls and score settings in IndexedDB; expose image fit/crop choices before analysis so the scored image is the visible image.
- [ ] Profile live pixel reads, shear and drawing before adding workers or increasing analysis frequency. Record frame-time percentiles on a named desktop/mobile test set; choose a budget and verify adaptive quality does not alter the score.
- [ ] Regression-test protocol v1 and OSC after score changes, including payload size, silent external mode and reconnects. Test a real TouchDesigner or Hydra patch.
- [ ] Run production-build browser checks, then publish an explicit release with the tested mappings and known limits.

## Current limits and deferred ideas

- A deterministic event sequence (feedback off, no scratches) is not a deterministic waveform. Subjective listening quality remains to be established.
- Audio energy currently averages byte-scaled FFT bins; the first six bins serve as a rough bass proxy. Neither is the calibrated measurement planned above.
- Live pixel reads occur every three frames, healing is frame-based, and archive contents disappear on reload. Uploads currently cover-crop to 480x640. The inspection overlay takes roughly 100+ ms to build (on toggle, wall change, restart or scratch).
- The local bridge remains a separate process; Vercel does not host it. Latest score/protocol additions still need an OSC regression.
- Defer granular/sample engines, Strudel, MIDI, community uploads, environmental inputs, new bug species and multi-wall migration until the core image/sound/visual relationship passes the comparison checks.

## Working order

Implement milestone 1 first, then the measurement/output foundation in milestone 2. Use those results to tune milestone 3; treat milestone 4 as a keep-or-remove experiment. Address performance blockers as they appear, with persistence and release checks in milestone 5. Validate and commit each milestone before starting the next; do not equate a successful build with a successful listening result.
