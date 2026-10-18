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
  [Stereo pan]      [Master gain]
       |                |
       +-------+--------+
               |
               v
        [Master gain]
               |
        +------+------+
        |             |
        v             v
  [Distortion]   [Delay send]
        |             |
        v             v
    [Chorus]      [Delay + filtered feedback]
        |             |
        +------+------+
               |
               v
          [Reverb]
               |
               v
        [Compressor]
               |
               v
         [Analyser] --> FFT data --> feedback loop
               |
               v
          [Speakers]
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

- Shared noise buffer, read from a random offset
- Bandpass sweep down from a centre set by wall brightness; deeper cracks start lower
- Deeper cracks are longer and louder
- Panned to the bug's position

### Rhythm

The image is read left to right as one bar of 16 sixteenth notes. A step is active where that column of the image holds at least average edge energy. An encounter takes the first active step within the next beat (4 steps) that holds fewer than 3 sounds. If there is none, it rests: no sound, no event. Sparse pulses therefore produce silence rather than a late pile-up. Steps are chosen in simulation time, then scheduled 60 ms ahead on the audio clock. The bug's flash and its mark fire when the sound plays. Notes and clicks each have a 170 ms cooldown per bug. Changing walls cancels sounds that have not started.

Notes and clicks run through separate layer buses; muting a layer also mutes its delay send. The output level scales both the dry signal and the delay send.

## Effects

| Effect | Purpose | Key parameters |
|---|---|---|
| **Distortion** | Warmth and edge, driven by wall density | Waveshaper curve (amount 0.3), 15% wet, 2x oversampling |
| **Chorus** | Stereo width and movement | 0.8 Hz LFO, 3ms depth, two detuned delay lines, 20% wet |
| **Delay** | Rhythmic echoes | 370ms (can be tempo-synced), 35% feedback, lowpass at 2200 Hz in feedback path (darkening repeats), 30% wet |
| **Reverb** | Spatial depth | Algorithmic impulse response (2.5s decay), 20ms pre-delay for clarity, 25% wet |
| **Compressor** | Dynamic-range control, not a guaranteed peak limiter | -18 dB threshold, 12 dB knee, 4:1 ratio, 3ms attack, 150ms release |

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

These descriptions express the intended character of the mappings, not validated listening results. With feedback off and no pointer input, a restart replays the same encounters (same bugs, places, pitches and steps); live feedback and scratches make each performance diverge, and click noise is never sample-identical. Colour edits that also change luminance or edge structure can change rhythm.

## Development priorities

See [the roadmap](PLAN.md) for staged acceptance checks. The comparison tools now exist (seeded restart, feedback switch, layer mutes, sound-source marks, inspection overlay); the remaining part of that milestone is a matched-level listening comparison on real photos. Next, replace FFT energy proxies with RMS, Hz-defined bands and transient measurements, audit output safety, and couple those measurements to bounded visual responses. Calibrate the existing FM and crack voices before evaluating an optional image-derived bytebeat layer.
