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
  [Per-bug filter]   [Bandpass]
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

### Edge notes (FM synthesis)

When a bug crosses an edge (gradient > 0.06), it triggers a 2-operator FM voice:

| Parameter | Source | Range |
|---|---|---|
| **Carrier frequency** | Luminance mapped through the wall's scale | Wall root (80-240 Hz) to ~2 octaves above |
| **Carrier waveform** | Bug id (deterministic) | sine, triangle, sawtooth, square |
| **Modulator ratio** | Bug id (from FM_RATIO_SET) | 1, 1.5, 2, 3, 4, 5.04 |
| **FM index** | Gradient strength | 0.5 (smooth) to 6.0 (harsh) |
| **FM index envelope** | Decays with the note | Bright attack, dark sustain |
| **Filter cutoff** | Hue (red-blue balance) | 200-4200 Hz initial, envelope opens then closes |
| **Filter type** | Bug id | lowpass, bandpass, highpass |
| **Filter Q** | Bug id | 3 to 9 |
| **Decay time** | Gradient strength | 0.2s (weak edge) to 1.6s (strong edge) |
| **Stereo pan** | Bug x-position | -1 (left) to +1 (right) |
| **Detune** | Bug id | -4, 0, or +4 cents |

Each bug has a distinct voice because its carrier type, FM ratio, filter type, filter Q, detune, and gain are all derived from its id.

### Crack clicks (filtered noise)

When a bug crosses a dark pixel (luminance < 0.16), it triggers a noise burst:

- White noise with quadratic amplitude decay (snappier than linear)
- Bandpass filter with pitch envelope: 3000 Hz -> 200 Hz over 60ms
- Gives the click a "material" quality — sounds like stone or plaster cracking

### Rhythm

All sounds are quantised to a grid of 1/8th notes at the wall's tempo (70-140 BPM, derived from brightness). Each bug has a minimum cooldown of 170ms between sounds.

## Effects

| Effect | Purpose | Key parameters |
|---|---|---|
| **Distortion** | Warmth and edge, driven by wall density | Waveshaper curve (amount 0.3), 15% wet, 2x oversampling |
| **Chorus** | Stereo width and movement | 0.8 Hz LFO, 3ms depth, two detuned delay lines, 20% wet |
| **Delay** | Rhythmic echoes | 370ms (can be tempo-synced), 35% feedback, lowpass at 2200 Hz in feedback path (darkening repeats), 30% wet |
| **Reverb** | Spatial depth | Algorithmic impulse response (2.5s decay), 20ms pre-delay for clarity, 25% wet |
| **Compressor** | Safety limiter for live use | -18 dB threshold, 12 dB knee, 4:1 ratio, 3ms attack, 150ms release |

## Tuning system

Each wall generates its own tuning:

| Musical parameter | Visual feature | Mapping |
|---|---|---|
| **Steps per octave (EDO)** | Edge density | 5 (sparse) to 23 (dense) — more edges = more microtonal |
| **Scale degrees** | Hue + edge density | 3 to EDO notes, subset of the EDO |
| **Scale rotation** | Orientation angle | Rotates the scale pattern |
| **Root frequency** | Brightness | 80 Hz (dark) to 240 Hz (bright) |
| **Tempo** | Brightness | 70 BPM (dark) to 140 BPM (bright) |

This means a dark, cracked wall with few edges plays slow, low, pentatonic music. A bright, dense wall with many edges plays fast, high, microtonal music. Each wall sounds different.
