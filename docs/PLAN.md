# Plan and status

Updated 2026-10-28 after a source audit at `213c98f` (merge of PR #5), then a first implementation slice (uncommitted): `npm test` regression suite and pure audio measurement functions. The app's sound, mappings and visuals are unchanged; no listening session or deployment verification was performed. Earlier evidence below comes from the 2026-10-18 handoff, whose implementation checkpoint was `44ecd57`.

## Decision in brief

**Make the image recognizable through sound, and make each encounter understandable through its visual trace.** Do not add a synthesizer to compensate for an untested mapping.

Separate the stable **score**, the local **gesture**, and the bounded **response**. The design rationale, material vocabulary, audio contracts and listening method are in [Creative and technical strategy](CREATIVE_STRATEGY.md). [VISION.md](VISION.md) describes the wider horizon; this plan defines the next deliverables.

| Workstream | Current status | Next evidence needed |
|---|---|---|
| M1 — Image identity | Comparison controls implemented; three JPEGs present; replay/score/pulse regressions committed to `tests/` | Level-controlled listening; not artistically accepted yet |
| M2 — Measurement/output/response | Pure PCM/spectrum measurement tested, not yet wired into audio | Live audio-clock integration, complete output control, tested protection, bounded time-based response |
| M3 — Material calibration | Proposed | A specific listening finding that a change demonstrably improves |
| M4 — Digital grain | Optional experiment, not started | Improvement over the existing instrument at controlled level, or remove it |
| M5 — Durability/release | Open | Persistence, profiling, external regression and a verified production build |

**Execution order:** baseline tests → M2 measurements → M2 output/capture → M1 listening → M2 bounded response → M3 calibration. M5 regression checks accompany every relevant slice; M4 is not a release prerequisite.

## Creative direction

Make each image a recognizable instrument, and make the origin of each sound visible. More synthesis layers are useful only when they strengthen that relationship.

- Structure: contours, spacing and repetition shape phrases, pulses and rests.
- Material: local texture, contrast and colour shape articulation and resonance.
- Response: audible events leave localized, temporary marks on the same surface.
- Identity: the original image supplies a stable score; live deformation supplies variation without erasing that identity.

These are designed artistic mappings, not predictions of an object's physical sound. Preserve the light visual identity and keep the wall as the primary experience. Silence is meaningful; more events, brighter timbre or stronger distortion are not success criteria. The current marks describe scheduled encounters, including muted layers/external mode; distinguishing them from audible browser playback is part of the next response design.

## Implemented baseline

- Modular browser instrument served by Vite, with procedural walls, photo upload and an in-memory archive.
- Spatial image analysis: edge density, texture, contrast, coherence, repetition, colour, luminance distribution, column energy and thin dark ridges.
- Image-derived EDO, scale, root, tempo, 16-step pulse and FM voice; local pixels modulate individual sounds.
- Edge-entry notes and ridge-crossing clicks with hysteresis, separate cooldowns, stereo position and pulse-aligned bug flashes.
- Distortion, chorus, delay, convolution reverb and compression; FFT-driven strip shear and healing.
- Protocol v1, silent external mode, reconnecting WebSocket output and a local OSC bridge.
- Hosted connection guidance with explicit origin permission. Hosted-to-loopback WebSocket access was tested; browser local-network restrictions still vary.

The earlier handoff reports repeatable scores, structural differences and mirrored pulse patterns from synthetic probes, plus passing build/browser smoke checks. Those checks were not rerun in this planning revision; they do not establish perceptual distinctiveness or finished musical calibration.

### Source-audit corrections and constraints

- The output slider scales input and note-delay-send gains **before** effects. Existing tails survive setting it to zero. Browser sound off already suspends the AudioContext and silences its output; these are different controls.
- Only notes have the explicit delay send; both layers pass through the shared effects path. Preserve this distinction in routing tests.
- The delay currently stays at 370 ms; tempo synchronization is not wired. Treat it as an M3 experiment, not an existing feature.
- Reverb is convolution with a random two-second impulse whose decay exponent is 2.5, not a feedback-delay network or a guaranteed 2.5-second tail. Noise generation, random click offsets and reverb initialization prevent sample-identical replay.
- The analyser hardcodes a 256-point FFT; byte-bin means are not calibrated RMS/band measurements. The compressor is not a guaranteed limiter.
- Bugs already use fixed 60 Hz simulation. Shear/healing and every-third-render-frame pixel reads do not. CSS reduces transitions/animations, but Canvas motion does not yet honour reduced-motion preferences.
- Restart restores archived pixels/seed, but does not clear already-started voices or effects. Clean recording isolation needs an explicit drain/reset procedure. Selection alone is not the same operation as seeded restart.
- The three JPEGs are present under [walls](../walls/README.md). No committed regression suite or test script exists in the current package; earlier temporary scripts must be replaced with reproducible tests.

## 1. Make image identity testable (implemented controls; acceptance open)

Deliver a small comparison workflow before adding a new synthesizer.

- [x] Assemble three contrasting real images: smooth surface, repeated structure and fractured/grainy surface. See [walls/index.json](../walls/index.json); the earlier handoff records owner permission to include them. Separate photo-reuse licensing remains unresolved. Committed synthetic fixtures are still needed for exact assertions.
- [x] Record score version and seed; add repeatable restart with controlled simulation steps and random sources. Score v2; seed = hash of the wall's pixels; fixed 60 Hz steps follow the audio clock; one seeded stream per bug. Not bit-identical audio.
- [x] Add feedback toggle and note/click mute (each layer on its own bus, including its delay send). Output level now scales the delay send too. Loudness matching between walls waits for the RMS measurement in milestone 2; comparisons currently share one output level.
- [x] Mark the sampled location when a sound is heard (ring = note, cross = click). Optional Inspect overlay: edges, cracks, silent pulse columns and the audible step.
- [x] Sparse-pulse policy: first active step with fewer than 3 sounds among the next step and the 4 after it, otherwise rest (no sound, no event). Measured from the encounter, the wait is under 1.25 beats, not one beat as earlier docs said; the tests lock the current behaviour. Wall changes cancel sounds not yet started.

Acceptance: same decoded pixels/seed/settings reproduce the event sequence with feedback off in committed controlled tests; flat, stripe and ridge fixtures retain their expected distinctions. Markers preserve encounter coordinates and intended timing; pending local sounds/marks are cancelled on wall switch. Already-sent external events and already-started tails are not retroactively cancelled. Compare level-controlled recordings without image labels and document which images remain distinguishable and which mappings need adjustment.

- [x] Preserve synthetic pixel fixtures and replay/grid regressions in the repository before changing mappings. `npm test` (Node built-in runner, no new dependency): flat, stripe, shadow-step, ridge and mirrored fixtures; score/seed determinism and tuning ranges; pulse cap, silent steps, rests, reset and clock time-dropping; identical 20 s, 4-bug event sequences at 30/47.3/60/120/144 FPS, different seeds differ, sparse pulse rests and never lands on silent steps.
- [ ] Still open for slice 0: synth/mark cancellation on wall switch needs a Web Audio test environment; protocol v1/OSC regression; a fresh browser smoke baseline.
- [ ] Capture equal-duration takes with settings, pixel seed, code revision, actual sample rate and measured RMS/peak; isolate effects between takes.
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

## 2. Give the feedback meaningful audio measurements

Deliver three independently testable slices. Complete 2A/2B before the first M1 listening pass; do not wait for redesigned visuals to hear the baseline instrument.

### 2A — Measurement contracts and capture data

- [x] Add pure float-PCM RMS/peak and linear-power spectral-band functions with explicit units, channel handling, window normalization and time-based envelopes: [meter.js](../src/the-wall/audio/meter.js), tested in `tests/meter.test.js` at 44.1/48 kHz (silence, DC, 1 kHz sine at −23.0103 dBFS, opposite-polarity stereo, impulse, non-finite samples, envelope subdivision, band placement and Nyquist clipping, onset/decay/steady flux).
- [x] Define Hz bands (low 20–200, mid 200–2000, high 2000–12000, clipped to Nyquist) and positive spectral change. DC is excluded by skipping the three lowest bins (the periodic Blackman window confines a constant to bins 0–2). Subtracting the frame mean leaked into the low band and was rejected. Consequence: with 2048 samples the low band actually starts near 65 Hz (44.1 kHz) / 70 Hz (48 kHz).
- [ ] Still open: hop size, noise floor and onset refractory time are not chosen yet; decide them during live integration and test them.
- [ ] Integrate continuous audio-clock analysis; display consumes snapshots, not the measurement clock. A render-polled analyser may show spectrum but cannot certify peak or transient coverage.
- [ ] Record raw measurement fixtures/metadata and actual context sample rate. Separate dBFS diagnostics from bounded artistic control signals; do not implement automatic per-wall loudness normalization.

Gate: silence, DC, known-amplitude sine, stereo phase inversion, band-centred/boundary tones and impulses at 44.1/48 kHz. Steady sine RMS should match amplitude divided by the square root of two (initial tolerance ±0.5 dB after settling); silence must not create NaN or false attacks. Validate smoothing against elapsed time and analysis output with UI polling at 30/60/120 Hz. Explain FFT leakage rather than requiring impossible zero leakage at a band boundary.

The [measurement contract](CREATIVE_STRATEGY.md#measurement-contract) defines initial window/hop/envelope settings and numerical fixtures. For example, a 1 kHz sine with peak amplitude 0.1 has RMS ≈ 0.0707107 (−23.0103 dBFS). Recording comparison uses offline whole-window PCM measurements, not averaged readings of a smoothed live meter.

### 2B — Complete output control and recording isolation

- [ ] Audit the actual dry/note-send/shared-tail graph. Keep input drive independent of a final output gain controlling every audible path; characterize the sound change against baseline.
- [ ] Add conservative headroom, continuous stereo peak monitoring and tested sample-peak protection. Prototype a stereo-linked lookahead limiter with an initial −1 dBFS ceiling; measure latency and gain reduction. No claim of true-peak or hearing safety.
- [ ] Specify finite-value handling, loading/failure behaviour, exact-zero output after a bounded de-click ramp, and pause/resume semantics. No unprotected bypass on protection failure.
- [ ] Provide repeatable recording isolation (drain/reset effects), raw PCM capture and per-take metadata. Keep raw and constant-gain matched copies; no per-file compression to force a level match.

Gate: both sample rates; note and crack layers separately, then eight bugs, maximum supported output, resonant notes, overlapping voices, accumulated tails, rapid level changes, context suspension/resume and wall switches. Rendered channels must remain finite and within the declared sample ceiling including allowed numerical tolerance. Output zero must silence tails after the documented ramp; layer mutes may leave shared tails. Protection latency must be reflected in local sound cues. Worklet failure must not expose an unprotected signal.

**Checkpoint:** run the first M1 listening comparison now. Preserve the original mapping as the reference before further changes.

### 2C — Bounded response and recoverable material

- [ ] Separate archived score pixels, scratched working surface and temporary displacement. Reconstruct from the working surface rather than cumulatively resampling the previous frame; define borders and a displacement bound.
- [ ] Use RMS for response depth and low-band power for slower movement. Scheduled local encounters supply impulse coordinates; global transients can weight intensity but cannot identify a source bug.
- [ ] Advance recovery, response and live-pixel refresh by simulation time. Retain fixed-step bug logic; do not promise deterministic live-feedback audio across devices.
- [ ] Make reduced motion a presentation policy: quieter/unsheared drawing and non-expanding event cues, without changing simulation, score or sampling. Distinguish muted/external encounter cues from audible browser playback.

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
- [ ] Regression-test protocol v1 and OSC after score, scheduling or measurement changes, including the bounded `energy` compatibility value, payload size, silent external mode and reconnects. External-only mode does not measure sound from an external instrument. Test a real TouchDesigner or Hydra patch.
- [ ] Run production-build browser checks, then publish an explicit release with the tested mappings and known limits.

## Current limits and deferred ideas

- A deterministic event sequence (feedback off, no scratches) is not a deterministic waveform. Subjective listening quality remains to be established.
- Audio energy currently averages byte-scaled FFT bins; the first six bins serve as a rough bass proxy. Neither is the calibrated measurement planned above.
- Live pixel reads occur every three frames, healing is frame-based, and archive contents disappear on reload. Uploads currently cover-crop to 480x640. The inspection overlay takes roughly 100+ ms to build (on toggle, wall change, restart or scratch).
- The local bridge remains a separate process; Vercel does not host it. Latest score/protocol additions still need an OSC regression.
- Defer granular/sample engines, Strudel, MIDI, community uploads, environmental inputs, new bug species and multi-wall migration until the core image/sound/visual relationship passes the comparison checks.

## Working order

| Slice | Main touchpoints | Exit evidence |
|---|---|---|
| **0. Preserve baseline** — mostly done | Test harness; analysis/tuning, bugs, clock/grid, protocol | Done: fixtures, replay/scheduling tests, production build. Open: cancellation, protocol/OSC, browser smoke |
| **2A. Measure** — pure part done | Audio measurement module, engine/effects, diagnostics | Done: PCM and spectral tests at both sample rates. Open: live audio-clock integration independent of rendering |
| **2B. Control and capture** | Output routing/protection, capture harness, scheduled cues | Finite/peak/mute/tail tests; isolated raw recordings and metadata |
| **1. Listen** | Three real photos; capture/listening report | Blind pairwise observations and image-visible attribution; limitations explicitly recorded |
| **2C. Respond** | Shear/loop, working-surface state, bug inputs, marks | Time-based bounded response, reduced-motion and feedback-off regression evidence |
| **3. Calibrate** | One mapping family at a time | A/B against baseline; retained/rejected changes justified by listening |
| **5 / optional 4** | Persistence, performance, external adapters; optional grain | Release checks; grain kept only on its own evidence |

Do not silently expand a slice into the next. Fix baseline blockers when needed and document them. Update the plan with observed results after each slice; commit only when requested. A successful build is not a successful listening result.

## Resume next session

1. Review and commit the current slice: `tests/`, [meter.js](../src/the-wall/audio/meter.js), the `test` script and the new `METER_*` constants. Run `npm test` and `npm run build` (both passed on 2026-10-28, Node 24).
2. Close slice 0: a browser smoke check, then cancellation and protocol v1/OSC regressions.
3. **Next deliverable: live 2A integration.** Feed `meter.js` from continuous post-output PCM on the audio clock (an AudioWorklet tap if needed), choose hop, noise floor and onset refractory time, and expose snapshots to the dashboard. Do not connect the new values to bugs or shear yet; `readFFT()` keeps driving feedback until 2C.
4. Then 2B: final output gain after effects, sample-peak protection, recording isolation and capture. Then upload the JPEGs through **Bring your own**, keep four bugs, feedback off, no scratches, a visible tab and isolated effects for each restarted take. Store the capture metadata and perform the listening pass before 2C/M3.

OSC regression, production deployment verification and photo-specific reuse licensing remain unresolved; no licence change is made here.
