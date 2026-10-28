# Sound design

How BUGSONIC turns visual features into sound.

## Signal chain

```
Bug samples wall
       |
       v
  [FM Synth]  or  [Noise Click]
       |                |
       v                v
  [Lowpass]          [Bandpass]
       |                |
       v                v
  [Envelope]        [Envelope]
       |                |
       v                v
  [Stereo pan]      [Stereo pan]
       |                |
  [Note bus]        [Crack bus]          (layer mutes)
       |                |
       +-------+--------+
               |
        [Drive 0.45]  + note bus -> [Delay send 0.45]
               |                          |
          [Distortion]                    |
               |                          |
           [Chorus]                       |
               |                          |
           [Delay + filtered feedback] <--+
               |
          [Reverb]  (seeded impulse)
               |
        [Compressor]
               |
     [Output worklet]  output level -> lookahead limiter (-1 dBFS)
          |         \
          |          blocks --> monitor (RMS, bands, onsets, strips) --> feedback, meter, takes
          v
     [Speakers]   (+ byte analyser for the spectrum display)
```

## Synthesis

The wall sets the voice; the pixels under the bug shape each note. Bugs differ only in which carrier and FM ratio of the wall's voice they use, a few cents of detune, and where they are.

### Edge notes (FM synthesis)

When a bug enters an edge (gradient > 0.06), it triggers a 2-operator FM voice. It must leave the edge (gradient < 0.035) before that edge can sound again.

| Parameter | Source | Range |
|---|---|---|
| **Carrier frequency** | Luminance under the bug, through the wall's scale | Wall root to ~2.4 octaves above |
| **Carrier waveform** | Wall texture (bug picks one of two) | smooth: sine/triangle · medium: triangle/sawtooth · grainy: sawtooth/square |
| **Modulator ratio** | Wall texture; strong repetition rounds to whole numbers | smooth 1, 2, 0.5 · medium 1.5, 2, 3 · grainy 3.5, 5.04, 7.13 |
| **FM index** | Wall contrast × local edge strength | brighter attack on hard edges |
| **Filter cutoff** | Wall saturation + cool hue, scaled by local luminance | 120-9000 Hz, opens then closes |
| **Filter resonance** | Local saturation | Q 0.7 (grey) to 8.7 (vivid) |
| **Decay time** | Local edge strength × wall coherence | ordered walls ring longer |
| **Level** | Local edge strength | |
| **Stereo pan** | Bug x-position | -1 (left) to +1 (right) |

### Crack clicks (filtered noise)

A crack is a thin line darker than both of its sides (by 0.1 luminance, measured 5 px away). A shadow edge is dark on one side only, so it does not click.

- The crack detector re-arms when depth falls below 0.05 (half the entry threshold).
- Shared, seeded noise buffer, read from an offset drawn from a seeded stream (restarted with each effects rebuild)
- Bandpass sweep down from a centre set by wall brightness; deeper cracks start lower
- Deeper cracks are longer and louder
- Panned to the bug's position

### Rhythm

The image is read left to right as one bar of 16 sixteenth notes. A step is active where that column of the image holds at least average edge energy. An encounter takes the first active step that holds fewer than 3 sounds among the next step and the 4 after it (a wait under 1.25 beats). If there is none, it rests: no sound, no event. Sparse pulses therefore produce silence rather than a late pile-up. Steps are chosen in simulation time, then scheduled 60 ms ahead on the audio clock. The bug's flash and its mark fire when the sound plays. Notes and clicks each have a 170 ms cooldown per bug. Changing walls cancels sounds that have not started.

Notes and clicks run through separate layer buses; muting a layer stops new input from that layer, including its delay send, while shared effect tails decay. The output level acts after the effects, in the output worklet: it ramps over 30 ms to the exact value, so zero silences everything, tails included.

## Output stage

| Stage | Behaviour |
|---|---|
| **Drive** | Fixed 0.45 into the effects (the former default level), so the effects' character no longer depends on the output slider |
| **Output level** | Slider 0-70 %, 45 % = unity gain after the effects |
| **Limiter** | Stereo-linked lookahead sample-peak limiter, -1 dBFS ceiling, 1.5 ms lookahead, 80 ms release; a counted final clamp catches numerical overshoot only. Sample peaks, not true peaks |
| **Failure** | If the worklet cannot load, browser sound stays off (no unprotected path); external out still works |
| **Measurement** | Every 512-sample output block: RMS (30/250 ms), peak held 1 s, low/mid/high bands (low 100/400 ms), spectral-flux onsets (floor 0.01, 60 ms refractory), 32 strip bands. Shown as `OUT / PEAK / LIMIT` |

## Feedback response

With feedback on, output RMS sets a depth (-60 dBFS -> 0, -12 dBFS -> 1) and the strip spectrum chooses which horizontal strips move (low frequencies at the top, alternating directions). Each audible encounter kicks the strip where it was read. Offsets follow in 50 ms, recover in 350 ms, stay within 7 px, and the live wall is rebuilt from the working surface each update, so nothing accumulates. Depth also speeds the bugs; low-band power pulls them down. These are design choices to be judged by listening, not validated results.

## Effects

| Effect | Purpose | Key parameters |
|---|---|---|
| **Distortion** | Shared fixed warmth and edge; no wall-density control is wired | Waveshaper curve (amount 0.3), 15% wet, 2x oversampling |
| **Chorus** | Modulated doubling; no explicit left/right separation of delay lines | 0.8 Hz shared LFO, 3ms base delay and a second line at 3.3ms, 20% wet |
| **Delay** | Echoes from the note-layer send | Fixed 370ms (tempo sync is not wired), 35% feedback, lowpass at 2200 Hz in feedback path (darkening repeats), 30% wet |
| **Reverb** | Spatial depth | Convolution with a generated, seeded 2s impulse, decay exponent 2.5; 20ms pre-delay, 25% wet |
| **Compressor** | Dynamic-range control before the output limiter | -18 dB threshold, 12 dB knee, 4:1 ratio, 3ms attack, 150ms release |

## Tuning system

Each wall is analysed once when selected (about 50-80 ms). The same pixels always give the same score.

| Musical parameter | Visual feature | Mapping |
|---|---|---|
| **Steps per octave (EDO)** | Edge density (log scale) + texture | 5 (smooth) to 23 (dense, grainy) |
| **Scale degrees** | Luminance distribution | The most common tones of the image, spread apart; the most common one is the tonic |
| **Scale size** | Saturation + contrast | 3 (grey, flat) to 12 notes |
| **Root frequency** | Brightness (log scale) | 80 Hz (dark) to 240 Hz (bright) |
| **Tempo** | Edge density + contrast + brightness | 70 to 140 BPM |
| **Pulse** | Edge energy per column, left to right | 16 steps; mirrored image = mirrored pulse |
| **Voice** | Texture, repetition, contrast, coherence, colour | see Synthesis |

A smooth grey gradient plays few, slow, soft notes on a sparse scale. A grainy, high-contrast image plays fast, microtonal, inharmonic music. Two images with the same average brightness and colour still differ if their tones, textures or layouts differ. Changing only colour changes timbre, not rhythm.

These descriptions express the intended character of the mappings, not validated listening results. With feedback off and no pointer input, a restart replays the same encounters (same bugs, places, pitches and steps); live feedback and scratches make each performance diverge, and waveforms are not sample-identical (sub-sample scheduling, browser DSP). Colour edits that also change luminance or edge structure can change rhythm.

## Development priorities

See [the roadmap](PLAN.md) for status and gates and [the strategy](CREATIVE_STRATEGY.md) for design contracts and listening method. Measurement, protected output, comparison takes and the bounded response are in place. Next: the level-controlled listening pass on the three photos (feedback off), then with feedback on, then evidence-led FM/crack calibration. Bytebeat remains optional.

The three [photo fixtures](../walls/README.md) have different measured scores and headless event sequences, but perceptual distinctiveness is not established. All currently select the middle FM carrier/ratio family. Shared output settings are not loudness matching, and decoder/resizing differences can change pixel seeds and scale degrees. Use the same browser and decoded image for repeatability checks; see [the session handoff](PLAN.md#resume-next-session) before changing mappings.
