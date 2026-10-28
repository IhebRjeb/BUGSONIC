# Creative and technical strategy

Design proposal, 2026-10-28. This document guides the next implementation; it does not describe features already delivered. [PLAN.md](PLAN.md) tracks status and gates. [VISION.md](VISION.md) remains the long-term artistic horizon.

## 1. The artistic proposition

**A wall is a score, the bugs are its performers, and sound temporarily changes the conditions of the next encounter.**

The goal is not to illustrate any music with moving insects, nor to imitate the physical acoustics of plaster. It is to make the image's organization audible and the origin of a sound legible. A quieter wall with meaningful rests is as successful as an active one.

Keep the light, editorial interface and the photograph as the main experience. Put calibration and diagnostics in Inspect/comparison tools, not a growing bank of performance controls. Develop one convincing instrument before adding more engines.

### Three layers, three responsibilities

| Layer | Owns | Must not do |
|---|---|---|
| **Score — stable identity** | Archived, decoded image; seed; scale, root, tempo, pulse and global voice | Retune continuously from audio energy or deformation |
| **Gesture — local encounter** | Sampled position, edge/crack, local features, scheduled onset and articulation | Invent notes on flat paint to keep the instrument busy |
| **Response — temporary change** | Bounded displacement and short traces driven by measured audio and scheduled encounters | Erase the source image, redraw the score, or become a generic full-screen visualizer |

Current code already separates global tuning from live sampling, but still mutates live pixels repeatedly. Preserve that useful separation while making response state explicit and recoverable.

### Time scales

- **An encounter:** a short attack or resonance, tied to a specific sampled coordinate.
- **A bar:** the image's 16-column pulse creates recurrence and silence. Bugs explore rather than act as a conventional sequencer playhead.
- **A passage:** restrained feedback changes trajectories and material over seconds, not the score every frame.
- **A wall change:** a deliberate change of instrument. Capture tests isolate walls; live performance may retain explicitly documented effect tails.

## 2. A material vocabulary to test, not to assume

These are listening hypotheses, not labels inferred from image filenames. Do not hard-code a special voice for each of the three photographs.

| Visual evidence | Intended audible quality | Intended visual gesture | First experiment |
|---|---|---|---|
| Sparse edges, low local roughness | Space, soft attacks, a few exposed resonances | Small, slow-fading contour trace; no mark for silence | Keep the current pulse and pitches; compare envelope/filter ranges only |
| Repeated spacing and coherent contours | Recognizable recurrence, more related partials | Similar short strokes at related encounters | Verify repetition measurement on rotated/cropped synthetic patterns before changing its threshold |
| Broken contours and deep ridges | Discontinuous attacks, more distinct crack articulation | Short cross/notch, shorter than a sustained note trace | Compare isolated clicks, isolated notes, then their balance |
| Colour differences with structure held constant | Changes in spectral colour, not an unrelated rhythm | Preserve the photograph's colour; shape carries event type | Use controlled equal-luminance fixtures, not arbitrary RGB edits |

The current three photos all select the middle FM carrier/ratio family. Earth and Ibn El Jazzar also have similar roots and tempi. This is a reason to listen and inspect feature distributions, **not** evidence that the instrument needs wider or harsher parameter ranges.

### Rules for calibration

1. Establish a dry reference and a fixed effects reference. Do not let reverb obscure an articulation problem.
2. Change one mapping family at a time: envelope, then spectral shape, then effect timing if needed. Keep seed, pulse and pitch mapping fixed for those experiments.
3. Prefer continuous, bounded modulation where appropriate; waveform or ratio transitions need click-free handling. Do not introduce abrupt family switches just to exaggerate the fixtures.
4. Local texture is a candidate articulation input, not a capability already implemented. Define its neighbourhood, cost and stability before adding it; current local inputs are luminance, gradient, ridge depth and colour.
5. Keep a change only when it improves a stated listening observation without destroying silence, source attribution or repeatability. Record rejected experiments too.
6. Version changes to analysis/tuning that change the score. Record synthesis, routing and effects revisions separately; unchanged score v2 does not mean unchanged audio.

## 3. Audio foundation: measure before coupling

### Measurement contract

Separate measurements with physical digital-audio units from normalized artistic controls. RMS and peak are linear full-scale amplitudes or dBFS, **not acoustic dB SPL**. An RMS match is not a guarantee of equal perceived loudness.

| Quantity | Purpose | Proposed contract |
|---|---|---|
| Channel RMS + aggregate RMS | Recording levels; slow deformation envelope | Compute from float PCM. Aggregate channel power before taking the square root; do not downmix stereo first, which can cancel opposite phases |
| Per-channel sample peak / peak hold | Output diagnostics and protection tests | Maximum absolute sample across channels, captured continuously; render-frame polling can miss peaks |
| Low / mid / high band power | Slow pull, material response, spectral balance | Initial boundaries: 20–200 Hz, 200–2000 Hz, 2000 Hz–min(12000 Hz, Nyquist). Treat these as design defaults, not musical pulse divisions |
| Positive spectral change | Candidate onset/attack strength | Fixed analysis window and hop, noise floor, normalization and refractory interval; reset on suspension/restart to avoid false attacks |

For spectral processing, convert float dB magnitudes to linear power before aggregation. Define FFT window normalization and bin overlap at band boundaries; do not sum byte bins and call it energy. Start spectral experiments with a 2048-sample Blackman window and a 256-sample hop (about 43–46 ms windows, 5–6 ms hops at the test rates). Normalize using the actual window coefficients. This is a resolution/latency/CPU tradeoff to validate, not a proven optimum or permission to change the score.

Use explicit attack/release times in seconds. A time-based exponential envelope uses `alpha = 1 - exp(-dt / tau)`. Initial artistic envelopes may try fast RMS attack (~30 ms), slower release (~250 ms) and a slower low-band response (~400 ms); choose final values from measured responses and listening.

**Analysis cadence must not be the display cadence.** Build pure PCM/spectrum measurement functions first. Integrate continuous sampling on the audio thread, with fixed-hop analysis and batched reports to the UI. A small AudioWorklet is justified for this task if required; do not add a synthesizer or unrestricted formula evaluator with it. Validate HTTPS loading, actual context sample rate and suspension. If analysis cannot start, retain the instrument with measured feedback disabled and a visible diagnostic rather than silently reverting to misleading measurements.

Browser analyser polling can remain a spectrum display, but cannot certify missed-peak safety or render-rate-independent transient detection. Offline tests should process captured PCM with the same measurement functions instead of depending on animation callbacks during offline rendering.

Initial numerical fixtures (unsmoothed PCM; exercise both sample rates):

| Input | Expected result |
|---|---|
| All zeros | RMS = 0, peak = 0, no onset; display silence with a declared dB floor |
| Constant 0.1 | RMS = 0.1, peak = 0.1; DC is measured by RMS but excluded from the spectral bands (lowest three bins skipped, so the low band starts near 65–70 Hz at 2048 samples) |
| 1 kHz sine, peak amplitude 0.1, integer-cycle capture | RMS ≈ 0.0707107 (−23.0103 dBFS), sampled peak ≤ 0.1 |
| Same sine, opposite polarity in the other channel | Same aggregate RMS, not zero; per-channel peaks unchanged |
| One unit sample in a 2048-sample mono buffer | RMS = 1 / sqrt(2048), peak = 1; transient response tested separately across successive analysis windows |
| Unit envelope step with time constant tau | Response ≈ 0.632121 at tau, independent of how elapsed time is subdivided |

Use tight absolute tolerances (initially 1e-6) for direct synthetic PCM math and the looser ±0.5 dB settled-sine target for integrated browser measurements. Distinguish a generated sine's nominal amplitude from the actual maximum sampled value. Spectral tests must separately characterize window leakage, band-boundary weighting and transient onset latency; do not reuse the PCM tolerance for FFT band estimates.

### Output contract

Today, note and crack buses feed a pre-effects gain, while only notes have a separate delay send. Preserve musical drive/send balance when introducing a true final output control; moving a gain changes distortion/compression behaviour and needs a baseline recording.

Proposed routing:

1. Layer buses → fixed/calibrated input drive and note-delay send → existing effects and compressor.
2. Combined effects output → final output gain → output protection → post-output stereo measurement/capture → destination.
3. No audible bypass around final gain/protection. Protection sits after any user-controlled boost.

Control semantics:

- **Output level:** changes all audible paths, including existing tails; zero reaches exact zero after a short defined de-click ramp. No automatic wall-by-wall gain compensation during a performance.
- **Layer mute:** closes that layer's input, including its sends. Existing shared effect tails may decay; this is not a solo-isolation guarantee. Comparison captures must drain or rebuild effects between isolated takes.
- **Browser sound off:** suspends the AudioContext, which already silences browser output. It does not stop independent external events. Resume can continue stored tails; test and document that separately from a fresh capture.
- **Restart:** replays encounters, not necessarily fresh effects or identical noise. A clean recording run needs an explicit effects reset/drain, recorded as part of the capture procedure.

Prototype a stereo-linked lookahead sample-peak limiter with a conservative ceiling (initial target −1 dBFS) and fixed headroom. It must handle non-finite input, report gain reduction and have tested failure behaviour; no unprotected fallback if protection fails. A final finite-sample clamp can guard against exceptional overshoot, not serve as the normal sound. Measure added latency and compensate scheduled visual cues. Frequent limiting means the upstream mix needs recalibration.

This is **sample-peak protection**, not a true-peak or hearing-safety guarantee. True-peak claims require oversampled reconstruction checks. Compressor settings alone are not proof of either. Do not choose a worklet/library dependency before reviewing its maintenance, licence, latency and testability.

Feed the artistic response from post-output measurements: when the browser is muted, its sound-driven response decays to rest. External-only operation has no external audio return today; keep event cues but do not pretend its actual sound is measured. Preserve protocol-v1 `energy` as a documented bounded compatibility value, with a fixed transfer function rather than adaptive per-wall normalization; regression-test receivers before changing its meaning.

## 4. Feedback as material memory

### State ownership

- **Archived score image:** immutable until another image/crop is deliberately selected; supplies tuning and restart seed.
- **Working surface:** archived image plus performer scratches. Current scratches affect both working and live canvases and persist until restart/switch; retain that behaviour for this milestone.
- **Response field:** bounded, time-based displacement from the working surface; decay toward zero when excitation stops. Reconstruct the live sampling surface from working pixels plus this state rather than repeatedly shifting already-shifted pixels.
- **Presentation:** the displayed wall, inspection overlay and event marks. Changes here must not accidentally rewrite the scored image.

This keeps the loop reciprocal: bugs still read the deformed live surface, not a separate untouched image. But the deformation cannot accumulate indefinitely or bake interpolation loss into the original. Define edge fill/clamp behaviour and test borders explicitly.

### Proposed response grammar — milestone 2C

- RMS controls the **depth** of a small response, with a bounded transfer curve.
- Low-band power controls a **slow displacement/bias**, not another pulse generator.
- A scheduled, audible encounter supplies a **known location** for a short impulse. Global spectral flux cannot identify which bug or pixel caused a sound, especially with overlapping voices and tails. Use flux as bounded emphasis, not invented source localization.
- Event marks remain the clearest causal cue. Contour direction can shape future traces, but must be sampled and stored at the encounter, not guessed later from the bug's new position.
- Do not equate every event mark with audible browser sound: current marks are generated even for muted layers and external-only output. Define visible distinction between encounter cues and confirmed local playback, and cancellation on a wall change.

Advance response and live-pixel refresh on controlled simulation-time intervals, not every third render frame. First verify the response model using identical prerecorded measurement inputs at different render rates. Live feedback may diverge; do not promise bit-identical audio-driven performances across devices.

For reduced motion, keep the same simulation/sampling state but render an unsheared presentation with small, non-expanding event cues. Preserve source-coordinate correspondence for those cues. Honour preference changes at runtime. Reduced motion should not silently change the score or event sequence. CSS support alone does not affect Canvas drawing.

## 5. Listening as a design gate

### Reproducible capture

Equal output-slider positions do not match loudness across walls. Listening levels below are computed **offline from captured PCM**, using the same measurement definitions as the live diagnostics; the live feedback envelope is not a recording's integrated RMS.

1. Confirm all three credited photos are available; retain permission provenance and do not infer a new photo licence from the software licence.
2. Fix browser/version, decoded crop and actual sample rate. Record pixel hash, score version, code revision, seed, four bugs, layer/effects settings, feedback state and pointer use. For exact tests, preserve canonical pixel arrays; converting to PNG alone does not guarantee identical colour/resizing pipelines.
3. Use feedback off, no scratches, a visible tab and a fresh/drained effects state. Capture equal 60-second performance windows with a separately identified fixed tail window; repeat at least one take to expose uncontrolled capture variation.
4. Retain the raw audio. Compute RMS and peak from the captured stereo PCM, then apply one constant gain per file to a common feasible target (initial RMS-matching tolerance ±0.5 dB). Choose a target that preserves peak headroom for every file; never individually compress the files to make them match. Silence is a valid result, not a reason to divide by zero.
5. Label the results **RMS-matched**, not automatically loudness-matched. Use a validated integrated-loudness meter where available and record its method; sparse material and different spectra still require listening. Keep calibration metrics and perceptual notes separate.

### Two questions, two passes

- **Blind audio pass:** random labels/order; balanced repeated A/B/X trials per pair, with A/B references. Ask whether X matches A or B and what cues informed the answer. Preserve trial order, answers, confidence and listening setup. Start with the artist plus another listener if available; a solo exploratory pass must be labelled as such.
- **Revealed audiovisual pass:** show the images. Ask which visible structures relate to attacks, rests and resonance; whether marks explain an encounter; whether feedback reveals or obscures the material.

Log pairwise confusion, especially Earth versus Ibn El Jazzar. Do not invent a universal pass percentage after seeing the answers or treat a small informal panel as statistical proof. Set trial count and decision rule before a formal claim. For creative iteration, each retained change needs a documented observation it improves; if only activity density identifies a wall, record that limitation and test isolated layers before adding complexity.

The first listening pass happens **after measurements/output control but before redesigned feedback**, so feedback cannot hide weak image identity. A second comparison with feedback on checks whether the loop enriches rather than replaces that identity.

## 6. Implementation discipline

- Follow the gated slices in [PLAN.md](PLAN.md); the next slice establishes committed fixtures/tests and measurement contracts, not new voices.
- Pure tests cover pixels, tuning, scheduling, PCM math and response envelopes; browser/offline-audio tests cover real Web Audio routing, stereo output, worklets and context lifecycle.
- Store executable tests, capture metadata and short observations in the repository. Large recordings may live elsewhere with reproducible references/checksums. Old prose about temporary tests is not a regression suite.
- Each slice states its hypothesis, affected modules, test evidence and remaining limits. Update docs with actual results, not expected outcomes; commit only when requested.
- Keep bytebeat optional and last among sonic changes. Adopt one bounded original expression family only if a matched-level comparison adds image-specific character without masking edges/cracks. Otherwise remove the experiment.
- Defer extra species, MIDI/Strudel integrations, cloud/community archives and weather/sensor inputs. Performance blockers can move forward; a release should not wait for an optional synthesis experiment.