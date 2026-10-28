# Plan and status

Updated 2026-10-28 on `feature/beat-byte` (from `213c98f`, merge of PR #5). Slice 0 and milestone 2 (2A measurement, 2B output control and capture, 2C bounded response) are implemented and committed, with `npm test` (62 tests) and browser checks. **No listening session has taken place yet**: milestone 1 acceptance and every perceptual claim remain open. Evidence older than this date comes from the 2026-10-18 handoff (`44ecd57`).

## Decision in brief

**Make the image recognizable through sound, and make each encounter understandable through its visual trace.** Do not add a synthesizer to compensate for an untested mapping.

Separate the stable **score**, the local **gesture**, and the bounded **response**. The design rationale, material vocabulary, audio contracts and listening method are in [Creative and technical strategy](CREATIVE_STRATEGY.md). [VISION.md](VISION.md) describes the wider horizon; this plan defines the next deliverables.

| Workstream | Current status | Next evidence needed |
|---|---|---|
| M1 — Image identity | Controls, replay regressions and take recording/matching tools done | **The listening pass itself** (needs listeners); not artistically accepted |
| M2 — Measurement/output/response | Done: measured output, protected final stage, isolated takes, bounded time-based response | Listening with feedback on (after M1) to judge whether the response reveals or obscures the wall |
| M3 — Material calibration | Proposed | A specific listening finding that a change demonstrably improves |
| M4 — Digital grain | Optional experiment, not started | Improvement over the existing instrument at controlled level, or remove it |
| M5 — Durability/release | Protocol/OSC/bridge regressions automated | Persistence, profiling on named devices, a real TouchDesigner/Hydra patch, production deployment |

**Execution order:** M1 listening (now possible) → feedback-on listening → M3 calibration → M5 release. M4 is not a release prerequisite. 2C was built before the M1 pass because that pass needs human listeners; it does not affect it, since M1 takes run with feedback off and 2C only changes feedback-on behaviour and presentation.

## Creative direction

Make each image a recognizable instrument, and make the origin of each sound visible. More synthesis layers are useful only when they strengthen that relationship.

- Structure: contours, spacing and repetition shape phrases, pulses and rests.
- Material: local texture, contrast and colour shape articulation and resonance.
- Response: audible events leave localized, temporary marks on the same surface.
- Identity: the original image supplies a stable score; live deformation supplies variation without erasing that identity.

These are designed artistic mappings, not predictions of an object's physical sound. Preserve the light visual identity and keep the wall as the primary experience. Silence is meaningful; more events, brighter timbre or stronger distortion are not success criteria. Marks now distinguish audible browser sounds (solid) from encounters with no browser sound (dashed: layer muted, sound off, external only).

## Implemented baseline

- Modular browser instrument served by Vite, with procedural walls, photo upload and an in-memory archive.
- Spatial image analysis: edge density, texture, contrast, coherence, repetition, colour, luminance distribution, column energy and thin dark ridges.
- Image-derived EDO, scale, root, tempo, 16-step pulse and FM voice; local pixels modulate individual sounds.
- Edge-entry notes and ridge-crossing clicks with hysteresis, separate cooldowns, stereo position and pulse-aligned bug flashes.
- Distortion, chorus, fixed 370 ms delay, convolution reverb (seeded impulse) and compression, then a final output worklet: output level, stereo-linked lookahead sample-peak limiter at −1 dBFS, measurement tap.
- Continuous output measurement (RMS, peak hold, Hz bands, spectral flux/onsets, strip spectrum) on every audio block, independent of the display.
- Bounded, time-based feedback: strips of the live wall are rebuilt from the working surface with offsets driven by measured RMS and spectrum plus kicks at audible encounters; full recovery when excitation stops.
- Comparison takes (isolated effects, seeded restart, 60 + 4 s float WAV and JSON record) and an offline RMS-matching/anonymizing tool.
- Protocol v1, silent external mode, reconnecting WebSocket output and a local OSC bridge.
- Hosted connection guidance with explicit origin permission. Hosted-to-loopback WebSocket access was tested; browser local-network restrictions still vary.

Automated and browser checks establish determinism, routing, protection and bounds. They do not establish perceptual distinctiveness or finished musical calibration.

### Audit findings (2026-10-28) and their resolution

| Finding at `213c98f` | Resolution |
|---|---|
| Output slider acted before the effects; tails survived level zero | Level is now the output worklet's gain after the effects; zero reaches exact silence after a 30 ms ramp, tails included (browser render check) |
| Compressor was the only protection | Lookahead sample-peak limiter, −1 dBFS ceiling, no unprotected fallback (sound stays off if the worklet cannot load) |
| Byte FFT means as "energy"; frame-based shear and healing; pixel reads every 3 render frames | Calibrated monitor; response and live-pixel reads advance every 3 simulation steps with times in seconds; the byte analyser only draws the spectrum display |
| Random reverb impulse, noise buffer and click offsets | Seeded; restored with each effects rebuild. Replay is still not sample-identical (scheduling sub-sample offsets, browser DSP) |
| Restart kept running voices and effect tails | Takes rebuild the effects chain; ordinary restart still lets tails ring (live-performance behaviour) |
| Canvas ignored reduced motion | Reduced motion shows the unshifted surface, non-expanding rings and flashes; simulation unchanged |
| No committed tests; temporary scripts | `npm test`: 62 tests, Node built-in runner |
| Delay described as tempo-synced | Docs corrected; tempo sync remains an M3 experiment |
| Pulse wait described as "one beat" | Actual: under 1.25 beats; docs corrected, tests lock the behaviour |

## 1. Make image identity testable (implemented controls; acceptance open)

Deliver a small comparison workflow before adding a new synthesizer.

- [x] Assemble three contrasting real images: smooth surface, repeated structure and fractured/grainy surface. See [walls/index.json](../walls/index.json); the earlier handoff records owner permission to include them. Separate photo-reuse licensing remains unresolved. Synthetic fixtures for exact assertions live in `tests/fixtures.js`.
- [x] Record score version and seed; add repeatable restart with controlled simulation steps and random sources. Score v2; seed = hash of the wall's pixels; fixed 60 Hz steps follow the audio clock; one seeded stream per bug. Not bit-identical audio.
- [x] Add feedback toggle and note/click mute (each layer on its own bus, including its delay send). Output level now acts after the effects (see 2B).
- [x] Mark the sampled location when a sound is heard (ring = note, cross = click). Optional Inspect overlay: edges, cracks, silent pulse columns and the audible step.
- [x] Sparse-pulse policy: first active step with fewer than 3 sounds among the next step and the 4 after it, otherwise rest (no sound, no event). Measured from the encounter, the wait is under 1.25 beats, not one beat as earlier docs said; the tests lock the current behaviour. Wall changes cancel sounds not yet started.

Acceptance: same decoded pixels/seed/settings reproduce the event sequence with feedback off in committed controlled tests; flat, stripe and ridge fixtures retain their expected distinctions. Markers preserve encounter coordinates and intended timing; pending local sounds/marks are cancelled on wall switch. Already-sent external events and already-started tails are not retroactively cancelled. Compare level-controlled recordings without image labels and document which images remain distinguishable and which mappings need adjustment.

- [x] Preserve synthetic pixel fixtures and replay/grid regressions in the repository before changing mappings. `npm test` (Node built-in runner, no new dependency): flat, stripe, shadow-step, ridge and mirrored fixtures; score/seed determinism and tuning ranges; pulse cap, silent steps, rests, reset and clock time-dropping; identical 20 s, 4-bug event sequences at 30/47.3/60/120/144 FPS, different seeds differ, sparse pulse rests and never lands on silent steps.
- [x] Slice 0 closed: synth cancellation, layer mute, output level, effects reset and no-bypass routing on a recording Web Audio mock (`tests/routing.test.js`); mark cancellation; protocol v1 field shapes, OSC encoding, payload limits and a spawned bridge relaying to a second client and to UDP OSC while rejecting foreign origins and invalid messages (`tests/protocol.test.js`); browser smoke without errors.
- [x] Capture equal-duration takes with settings, pixel seed, code revision, actual sample rate and measured RMS/peak; isolate effects between takes. **Record comparison take** (60 s + 4 s tail with layers closed) downloads a 32-bit float WAV of the protected output and a JSON record marking the take invalid on feedback, scratches, hidden tab, dropped time, wall or colony change, clamp or non-finite output. `npm run match-takes -- <dir>` applies one gain per file to a common RMS that keeps every peak under the ceiling and writes random labels plus a separate key. Browser check: two consecutive takes of one wall gave 427 events each, performance RMS within 0.001 dB.
- [ ] Run randomized blind pairwise comparisons, then a separate image-visible attribution pass. Follow [the listening protocol](CREATIVE_STRATEGY.md#5-listening-as-a-design-gate); record confusion and unsuccessful mappings, not only successes.

### Historical observations — not rerun on 2026-10-28

Verified so far: a headless run of the real bug, clock and grid modules gives identical 300-event sequences across repeats and at 30, 47.3, 60 and 144 FPS; a different seed differs; waits stay within one beat, no step holds more than 3 sounds, none land on silent steps. A sparse left-heavy pulse rested 199 of 375 encounters. In the browser with sound on and feedback off, two restarts produced the same 19 events. Hidden or heavily throttled tabs drop simulation time (by design), which breaks replay.

Real-photo observations: score columns below come from browser uploads; event counts and note ranges come from separate 60 s headless runs (4 bugs, feedback off) using macOS image decoding/resizing. These paths produced similar summaries, not identical pixels, seeds or every scale degree. Counts are not browser playback assertions.

| Wall | edges / cracks / texture / repeat | EDO, root, tempo | pulse | events (notes/clicks) | note range |
|---|---|---|---|---|---|
| Djerba eye (smooth) | 0.024 / 0.018 / 0.34 / 0 | 10, 100 Hz, 91 bpm | `xxxxxxx...x.....` | 219 (166/53) | 100–230 Hz |
| Lafayette Earth (repeated) | 0.082 / 0.109 / 0.34 / 0.22 | 15, 140 Hz, 115 bpm | `.x..xxxxxxxx....` | 535 (352/183) | 154–674 Hz |
| Ibn El Jazzar (fractured) | 0.124 / 0.177 / 0.48 / 0 | 18, 143 Hz, 119 bpm | `xxxxxx.....xxxx.` | 766 (430/336) | 143–667 Hz |

In the headless checks, each wall repeats identically at 60 FPS and shares the checked event prefix at 144 FPS; the three sequences differ. The eye photo is separated numerically by density, register and pulse, not yet by a listening result. Measured gaps for listening to check:

- All three fall in the same FM carrier/ratio family (texture 0.34–0.48 sits in the middle third). Index, cutoff, decay, click tone and local pixel modulation can still differ.
- Repeated and fractured share nearly the same root (140/143 Hz), tempo (115/119 bpm) and note range; they differ mainly in EDO, scale, pulse and click rate.
- The Earth photo's repetition score is below the harmonic-ratio threshold (0.22 < 0.5). None of these three fixtures engages that branch; whether framing explains the low score remains untested.
- Seeds come from decoded pixels, so a different JPEG decoder (browser or tool) gives a different seed for the same file.

Outstanding: level-controlled blind listening, then record which walls stay distinguishable. A shared output-slider value does not match loudness across images. RMS matching is a measurable first control, not a claim of equal perceived loudness. Mapping changes from these findings belong to milestone 3; do not broaden FM families just to force the three fixtures apart.

## 2. Give the feedback meaningful audio measurements (implemented)

Three independently tested slices. The listening judgement of the response (does it reveal or obscure the wall?) waits for M1.

### 2A — Measurement contracts and capture data

- [x] Add pure float-PCM RMS/peak and linear-power spectral-band functions with explicit units, channel handling, window normalization and time-based envelopes: [meter.js](../src/the-wall/audio/meter.js), tested in `tests/meter.test.js` at 44.1/48 kHz (silence, DC, 1 kHz sine at −23.0103 dBFS, opposite-polarity stereo, impulse, non-finite samples, envelope subdivision, band placement and Nyquist clipping, onset/decay/steady flux).
- [x] Define Hz bands (low 20–200, mid 200–2000, high 2000–12000, clipped to Nyquist) and positive spectral change. DC is excluded by skipping the three lowest bins (the periodic Blackman window confines a constant to bins 0–2). Subtracting the frame mean leaked into the low band and was rejected. Consequence: with 2048 samples the low band actually starts near 65 Hz (44.1 kHz) / 70 Hz (48 kHz).
- [x] Hop, noise floor and refractory chosen as initial defaults: 512-sample blocks (~11 ms) from the audio thread, onset when positive flux exceeds 0.01 with 60 ms refractory, RMS attack/release 30/250 ms, low band 100/400 ms. Peak and limiter reduction are held 1 s of audio time. Values to revisit after listening.
- [x] Continuous audio-clock analysis: the output worklet posts every block; [monitor.js](../src/the-wall/audio/monitor.js) consumes them in order, so readings do not depend on display rate or read cadence (`tests/output.test.js`). The byte analyser now only draws the spectrum display. The dashboard shows `OUT / PEAK / LIMIT` in dBFS.
- [x] Sample rate and measurements are stored with each take. dBFS diagnostics stay separate from the bounded 0–1 artistic controls; no automatic per-wall loudness normalization.

Gate: silence, DC, known-amplitude sine, stereo phase inversion, band-centred/boundary tones and impulses at 44.1/48 kHz. Steady sine RMS should match amplitude divided by the square root of two (initial tolerance ±0.5 dB after settling); silence must not create NaN or false attacks. Validate smoothing against elapsed time and analysis output with UI polling at 30/60/120 Hz. Explain FFT leakage rather than requiring impossible zero leakage at a band boundary.

The [measurement contract](CREATIVE_STRATEGY.md#measurement-contract) defines initial window/hop/envelope settings and numerical fixtures. For example, a 1 kHz sine with peak amplitude 0.1 has RMS ≈ 0.0707107 (−23.0103 dBFS). Recording comparison uses offline whole-window PCM measurements, not averaged readings of a smoothed live meter.

### 2B — Complete output control and recording isolation

- [x] Graph: layer buses → fixed drive (the former default level, 0.45) and note-delay send → effects → [output worklet](../src/the-wall/audio/output.worklet.js) → destination. At the default 45 % the effects see the same drive as before; other slider positions no longer change distortion/compression drive (characterize by ear in M1). No path reaches the speakers around the worklet (mock-graph test).
- [x] Stereo-linked lookahead sample-peak limiter, −1 dBFS ceiling, 1.5 ms lookahead (added to visual cue timing), 80 ms release. The ceiling holds by construction (hold-min, release, box average); a counted final clamp catches only numerical overshoot. Not a true-peak or hearing-safety guarantee.
- [x] Non-finite samples become silence and are counted. Level changes ramp linearly over 30 ms to the exact value, zero included. If the worklet cannot load, browser sound stays off with a message; external out keeps working. Resume resets the monitor so a pause is not read as an onset.
- [x] Recording isolation (effects chain rebuilt, seeded reverb impulse, noise and click offsets), raw float capture and per-take metadata; offline constant-gain matching keeps the raw files.

Results: Node tests at 44.1/48 kHz (hot sine, impulses, noise, bursts never exceed the ceiling, clamp count 0; quiet input bit-exact apart from the delay; release recovery; stereo link; NaN; exact zero; a-rate gain). Browser offline render ([audio-check.html](../src/the-wall/audio-check.html), dev server) at both rates: 1024 dense harsh voices at maximum level peaked at −1.08/−1.42 dBFS, no non-finite samples, tails still ringing (0.4) at mute and 0 non-zero samples after the ramp; the real worklet fed +22 dB input reduced 23.3 dB, landed exactly on the ceiling, clamp 0. Not yet run: live suspend/resume and wall switches during dense playback in a visible tab.

Gate: both sample rates; note and crack layers separately, then eight bugs, maximum supported output, resonant notes, overlapping voices, accumulated tails, rapid level changes, context suspension/resume and wall switches. Rendered channels must remain finite and within the declared sample ceiling including allowed numerical tolerance. Output zero must silence tails after the documented ramp; layer mutes may leave shared tails. Protection latency must be reflected in local sound cues. Worklet failure must not expose an unprotected signal.

**Checkpoint:** the first M1 listening comparison can run now, with feedback off.

### 2C — Bounded response and recoverable material

- [x] Archived score pixels (`Wall.cv`), working surface (original + scratches) and temporary displacement are separate. The live wall is rebuilt from the working surface with per-strip whole-pixel offsets; uncovered margins show the working surface; |offset| ≤ 7 px ([response.js](../src/the-wall/feedback/response.js), [render.js](../src/the-wall/feedback/render.js)).
- [x] RMS → depth through a fixed transfer (−60 dBFS → 0, −12 dBFS → 1), the strip spectrum (32 quasi-log bands, low at the top) shapes which strips move, low-band power still pulls the bugs down. Audible encounters kick the strip where they were read (3 px, 150 ms decay); global flux is not used to locate sources.
- [x] Response, recovery and live-pixel reads advance every 3 simulation steps with attack/release in seconds (50/350 ms). Bugs keep fixed steps; live-feedback audio is not deterministic across devices.
- [x] Reduced motion: the display shows the unshifted working surface, rings and flashes do not expand; simulation, score and sampling unchanged. Encounters with no browser sound leave dashed marks; audible ones keep the solid ring/cross.

Results: Node tests (bound under 2000 random inputs, identical offsets at 10/20/40/120 updates per second, full recovery after 6 release times, localized decaying kick, strip ordering by frequency). Browser canvas check ([surface-check.html](../src/the-wall/surface-check.html)): identical displacement at 10/20/40 Hz, 0 residual pixels after recovery, image score restored exactly. Not yet checked: reduced motion and the response on screen in a visible tab (the integrated browser panel was hidden and throttled to ~1 FPS), and whether the response reveals or obscures the wall by ear.

Gate: identical recorded measurement inputs at 30/60/120 Hz produce bounded displacement and recovery within a declared tolerance. Zero excitation recovers toward the working surface without destroying scratches; restart restores archived pixels. Reduced-motion mode retains understandable source cues and the same events. Post-output silence decays to rest. With feedback off, M1 replay regressions remain unchanged.

## 3. Develop material voices and visual gestures

Deepen the existing instrument before expanding its engine count.

- [ ] Write one listening hypothesis per change using milestone 1 recordings: smooth areas might sustain gently, repeated edges might form clearer motifs, fractured regions might articulate shorter attacks. These are hypotheses, not current perceptual results.
- [ ] Define and test local texture before mapping it to articulation; keep the wall's scale/root stable. Compare a dry reference, fixed-delay reference and an actual tempo-synced-delay candidate.
- [ ] Shape short visual traces by local contour direction; distinguish notes from cracks through shape and duration, not colour alone. Avoid a permanent generic glow over the image.
- [ ] Add restrained phrase-level variation and rests only where they preserve the image's pulse and remain reproducible.
- [ ] Vary generated compositions beyond the central figure so spatial rhythm is not consistently centre-heavy.

Acceptance: keep only changes that improve source-to-sound recognition in matched-level comparisons. Markers remain readable over light/dark images, disappear cleanly and do not obscure texture. Verify desktop/mobile layout and pointer/touch use with screenshots and interaction tests.

Record changed parameter ranges, listening observations and rejected alternatives. Do not tune against photo filenames. If perception remains weak, revisit the feature/mapping hypothesis instead of automatically adding another layer.

## 4. Pilot digital grain (optional bytebeat)

Bytebeat is an additional image-derived voice, not the new default sound.

- [ ] Evaluate a pinned `bytebeat.js` AudioWorklet integration using one original, bounded application-generated expression family; no unrestricted formula editor.
- [ ] Map image repetition to masks/sequences and texture to timbre. Keep musical tempo independent of the bytebeat sample rate.
- [ ] Add layer mix/mute, DC removal, finite-value guards, protected output and crossfades for wall changes; test sample-rate conversion.
- [ ] Tie visual grain to this layer's measured activity, leaving the original image inspectable. Handle worklet failure by keeping the existing instrument available.

Acceptance: compare with the layer muted at matched overall level. Retain it only if it adds recognizable image character rather than masking notes and cracks. Test HTTPS worklet loading, pause/resume, wall switching and invalid output. The HTML5 Bytebeat application's MIT license does not establish reuse rights for featured community formulas or generated music.

## 5. Make the instrument durable

Run relevant regressions throughout the earlier slices. Persistence and release can proceed without the optional bytebeat pilot.

- [ ] Preserve uploaded walls and score settings in IndexedDB; expose image fit/crop choices before analysis so the scored image is the visible image.
- [ ] Profile live pixel reads, shear and drawing before adding workers or increasing analysis frequency. Record frame-time percentiles on a named desktop/mobile test set; choose a budget and verify adaptive quality does not alter the score.
- [x] Regression-test protocol v1 and OSC (`tests/protocol.test.js`, including a spawned bridge). `energy` keeps its 0–1 range but now uses the fixed RMS transfer instead of a byte-FFT mean. External-only mode does not measure sound from an external instrument.
- [ ] Test a real TouchDesigner or Hydra patch against the bridge.
- [ ] Run production-build browser checks, then publish an explicit release with the tested mappings and known limits.

## Current limits and deferred ideas

- A deterministic event sequence (feedback off, no scratches) is not a deterministic waveform. Subjective listening quality remains to be established.
- Browser sound now requires AudioWorklet (secure context or localhost). The dev check pages are served by `npm run dev` only, not built.
- Takes need a visible tab and running audio for 64 s; a paused context stalls the take. JPEG decoding differences still change seeds across browsers.
- Archive contents disappear on reload. Uploads cover-crop to 480x640. The inspection overlay takes roughly 100+ ms to build (on toggle, wall change, restart or scratch).
- The local bridge remains a separate process; Vercel does not host it.
- Defer granular/sample engines, Strudel, MIDI, community uploads, environmental inputs, new bug species and multi-wall migration until the core image/sound/visual relationship passes the comparison checks.

## Working order

| Slice | Main touchpoints | Exit evidence |
|---|---|---|
| **0. Preserve baseline** — done | Test harness; analysis/tuning, bugs, clock/grid, protocol | Fixtures, replay/scheduling, routing, protocol/OSC/bridge tests; build and browser smoke |
| **2A. Measure** — done | Meter, monitor, output tap, dashboard | PCM/spectral/monitor tests at both rates; analysis independent of rendering |
| **2B. Control and capture** — done | Output worklet, effects reset, takes, match tool | Limiter/routing tests; browser offline render at both rates; repeatable takes |
| **2C. Respond** — done | Response, renderer, loop, marks, reduced motion | Bound/subdivision/recovery tests; canvas check with 0 residual pixels |
| **1. Listen** — next | Three real photos; takes; listening report | Blind pairwise observations and image-visible attribution; limitations recorded |
| **2. Listen with feedback** | Same walls, feedback on | Does the response reveal or obscure the wall? Adjust depth/kick constants only from evidence |
| **3. Calibrate** | One mapping family at a time | A/B against baseline; retained/rejected changes justified by listening |
| **5 / optional 4** | Persistence, performance, external patch, release; optional grain | Release checks; grain kept only on its own evidence |

Do not silently expand a slice into the next. Fix baseline blockers when needed and document them. Update the plan with observed results after each slice; commit only when requested. A successful build is not a successful listening result.

## Resume next session

1. `npm install`, `npm test` (62 pass, Node 24), `npm run dev`. With the dev server running, open `/audio-check.html?rate=44100`, `?rate=48000` and `/surface-check.html`; each must report `"pass": true`.
2. In a visible tab: check reduced motion (OS setting or devtools emulation) and the feedback response by eye; play densely, then suspend/resume and switch walls while watching `OUT / PEAK / LIMIT`.
3. **M1 listening pass.** Upload the three JPEGs from [walls/index.json](../walls/index.json) through **Bring your own**. Four bugs, feedback off, no scratches, tab visible. Wake the wall, then **Record comparison take** for each wall (repeat one wall once to expose capture variation). Put the WAV/JSON pairs in a folder and run `npm run match-takes -- <folder>`. Run the blind pairwise trials on `matched/*.wav` without opening `key.json`, then the image-visible pass. Record results in this plan, including Earth vs Ibn El Jazzar.
4. Repeat the pass with feedback on, then start M3 from specific findings only.

Production deployment verification, a real TouchDesigner/Hydra patch and photo-specific reuse licensing remain unresolved; no licence change is made here.
