// ---------------------------------------------------------------------------
// BUGSONIC / THE WALL — shared constants
// ---------------------------------------------------------------------------

// Canvas
export const W = 480;
export const H = 640;

// Bugs
export const MAX_BUGS       = 8;
export const INITIAL_BUGS   = 4;
export const LEGS_PER_BUG   = 6;
export const SOUND_COOLDOWN = 170;   // ms between sounds per bug

// Image analysis thresholds
export const EDGE_GRAD      = 0.06;  // gradient above this  = edge
export const EDGE_RELEASE   = 0.035; // must drop below this before the next edge counts
export const RIDGE_RADIUS   = 5;     // px — ring used to compare a point with its surroundings
export const RIDGE_DEPTH    = 0.1;   // darker than its ring by this = crack
export const PULSE_STEPS    = 16;    // left-to-right image columns -> 16th-note steps
export const SCORE_VERSION  = 2;     // bump when analysis or tuning changes what an image plays

// Simulation and pulse scheduling
export const SIM_HZ         = 60;    // fixed simulation steps per second
export const SIM_MAX_STEPS  = 8;     // per frame; beyond this the clock drops time and re-anchors
export const PULSE_LATENCY  = 0.06;  // s from simulation time to audio output
export const PULSE_MAX_WAIT = 4;     // steps (one beat); encounters with no free active step rest
export const PULSE_VOICES   = 3;     // sounds per step; further encounters move on or rest
export const MARK_LIFE      = 0.9;   // s a sound-source mark stays visible

// Tuning ranges
export const EDO_MIN        = 5;
export const EDO_MAX        = 23;
export const ROOT_MIN       = 80;    // Hz
export const ROOT_MAX       = 240;   // Hz
export const TEMPO_MIN      = 70;    // BPM
export const TEMPO_MAX      = 140;   // BPM

// Audio — master
export const FFT_SIZE       = 256;
export const MASTER_GAIN    = 0.45;

// Audio — measurement (float PCM; initial defaults, to be validated)
export const METER_WINDOW   = 2048;  // samples per spectral frame (Blackman)
export const METER_BANDS    = [[20, 200], [200, 2000], [2000, 12000]]; // Hz: low, mid, high
export const DB_FLOOR       = -120;  // dBFS reported for silence

// Audio — delay (tempo-synced, with filter in feedback)
export const DELAY_TIME     = 0.37;  // seconds (overridden by tempo sync)
export const DELAY_FEEDBACK = 0.35;
export const DELAY_WET      = 0.30;
export const DELAY_FILTER_FREQ = 2200;  // Hz — lowpass in feedback path

// Audio — reverb (algorithmic via feedback delay network)
export const REVERB_DECAY   = 2.5;   // seconds
export const REVERB_WET     = 0.25;

// Audio — waveshaper distortion
export const DIST_AMOUNT    = 0.3;   // 0 = clean, 1 = heavy
export const DIST_WET       = 0.15;

// Audio — chorus
export const CHORUS_RATE    = 0.8;   // Hz
export const CHORUS_DEPTH   = 0.003; // seconds
export const CHORUS_WET     = 0.2;

// Audio — compressor (master bus safety)
export const COMP_THRESHOLD = -18;   // dB
export const COMP_KNEE      = 12;    // dB
export const COMP_RATIO     = 4;
export const COMP_ATTACK    = 0.003; // seconds
export const COMP_RELEASE   = 0.15;  // seconds

// Audio — synthesis (FM ratios and carriers come from the wall voice in tuning.js)
export const FM_INDEX_MAX   = 6.0;
export const NOTE_ATTACK    = 0.008; // seconds
export const NOTE_DECAY_MIN = 0.2;   // seconds
export const NOTE_DECAY_MAX = 1.6;   // seconds
export const CLICK_DURATION = 0.06;  // seconds
export const CLICK_GAIN     = 0.22;

// Feedback loop
export const SHEAR_BANDS    = 32;
export const MAX_SHEAR_PX   = 7;
export const HEAL_ALPHA     = 0.05;
export const MEASURE_EVERY  = 3;     // frames between full pixel reads

// Generator
export const GEN_RECT_COUNT = 140;
export const GEN_POSTER_MIN = 4;
export const GEN_POSTER_MAX = 9;
export const GEN_CRACK_MIN  = 5;
export const GEN_CRACK_MAX  = 14;
