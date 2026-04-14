// ── Data Model ───────────────────────────────────────────────
//
// OOP classes for the tracker's composition data.
// Everything the AI reads/writes and the player interprets.
//
// Hierarchy:  Song → Pattern[] → Channel (Cell[]) → Cell

/** Number of channels in classic MOD format. */
export const NUM_CHANNELS = 4;

/** Default pattern length (rows) — FT2 default. */
export const DEFAULT_PATTERN_LEN = 64;

/** Maximum sample count per project. */
export const MAX_SAMPLES = 32;

// ── Cell ─────────────────────────────────────────────────────

/**
 * A single tracker cell — one row in one channel.
 * Encodes what to play at a specific point in time.
 */
export class Cell {
  constructor() {
    /** @type {string|null} Note string, e.g. "C-4", "C#-5". Null = empty. */
    this.note = null;
    /** @type {string|null} Sample ID, hex "00"–"1F". Null = inherit. */
    this.sample = null;
    /** @type {string|null} Volume, hex "00"–"40". Null = inherit. */
    this.volume = null;
    /** @type {string|null} Effect command, e.g. "A08". Null = none. */
    this.effect = null;
  }

  /** Reset all fields to null. */
  clear() {
    this.note = null;
    this.sample = null;
    this.volume = null;
    this.effect = null;
  }

  /** @returns {boolean} True if every field is null. */
  get isEmpty() {
    return this.note === null && this.sample === null
        && this.volume === null && this.effect === null;
  }
}

// ── Pattern ──────────────────────────────────────────────────

/**
 * A fixed-length musical phrase containing one or more channels.
 * Each channel is a Cell[] of equal length.
 */
export class Pattern {
  /**
   * @param {number} [length=DEFAULT_PATTERN_LEN] Number of rows.
   * @param {number} [numChannels=NUM_CHANNELS]    Number of channels.
   */
  constructor(length = DEFAULT_PATTERN_LEN, numChannels = NUM_CHANNELS) {
    /** @type {Cell[][]} One Cell[] per channel, each `length` rows. */
    this.channels = Array.from({ length: numChannels }, () =>
      Array.from({ length }, () => new Cell())
    );
  }

  /** @param {number} ch Channel index. @returns {Cell[]} */
  channel(ch) { return this.channels[ch]; }

  /** @param {number} ch @param {number} row @returns {Cell} */
  cell(ch, row) { return this.channels[ch][row]; }

  /** @returns {number} Number of rows. */
  get length() { return this.channels[0].length; }

  /** @returns {number} Number of channels. */
  get numChannels() { return this.channels.length; }
}

// ── Song ─────────────────────────────────────────────────────

/**
 * The full song — a collection of patterns played in sequence.
 */
export class Song {
  /** @param {number} [bpm=120] Beats per minute (30–300). */
  constructor(bpm = 120) {
    /** @type {number} */
    this.bpm = bpm;
    /** @type {Pattern[]} Pool of all patterns. */
    this.patterns = [];
    /** @type {number[]} Playback order — sequence of pattern indices. */
    this.order = [];
  }

  /**
   * Add a pattern to the pool.
   * @param {Pattern} pattern
   * @returns {number} Index of the added pattern.
   */
  addPattern(pattern) {
    this.patterns.push(pattern);
    return this.patterns.length - 1;
  }
}
