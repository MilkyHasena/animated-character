// Turns text into mouth movements for Character.say(): one mouth opening per syllable, with a short
// closed-mouth pause between words. Pure functions, no React, so they are easy to test.

// Ethiopic (Ge'ez) script: each letter is a syllable.
const ETHIOPIC = /[ሀ-᎟ⶀ-⷟꬀-꬯]/;
// Word breaks: spaces, punctuation, and the Ethiopic wordspace and punctuation marks (፡ ። ፣ ፤ ፥ ፦ ፧ ፨).
const WORD_BREAK = /[\s፡-፨.,!?;:¡¿"'()[\]\-–—]+/u;

export function syllables(word: string): number {
  if (ETHIOPIC.test(word)) {
    // In the main Ethiopic block letters come in rows of 8 forms; the 6th form (ል, ም, ...) is usually a bare
    // consonant with no vowel, so it doesn't open the mouth on its own.
    const n = [...word].filter(ch => {
      const cp = ch.codePointAt(0)!;
      return ETHIOPIC.test(ch) && !(cp >= 0x1200 && cp <= 0x137f && (cp - 0x1200) % 8 === 5);
    }).length;
    return Math.max(1, n);
  }
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  let n = (w.match(/[aeiouy]+/g) || []).length;
  if (n > 1 && /[^aeiouyl]e$/.test(w)) n--; // silent final e: "make", but not "table"
  return Math.max(1, n); // numbers, initials etc. still get one movement
}

export type Beat = { at: number; open: boolean };

const PAUSE = 0.6; // gap between words, as a fraction of one syllable
const NATURAL_SLOT = 190; // ms per syllable when no audio length is given (~5 syllables a second)
const MIN_SLOT = 110; // faster than this the mouth just flickers

// Mouth open/close times (ms from the start) for `text`, spread over `duration` ms if given.
export function mouthBeats(text: string, duration?: number): { beats: Beat[]; total: number } {
  const words = text.split(WORD_BREAK).filter(Boolean);
  if (!words.length) return { beats: [], total: 0 };
  let counts = words.map(syllables);
  const units = (c: number[]) => c.reduce((a, b) => a + b, 0) + PAUSE * (c.length - 1);
  let slot = duration ? duration / units(counts) : NATURAL_SLOT;
  if (slot < MIN_SLOT) {
    // Too many syllables for the clip: keep fewer movements per word so it still reads as speech
    const keep = (duration! / MIN_SLOT) / units(counts);
    counts = counts.map(c => Math.max(1, Math.round(c * keep)));
    slot = duration! / units(counts);
  }
  const beats: Beat[] = [];
  let t = 0;
  counts.forEach((c, i) => {
    for (let s = 0; s < c; s++) {
      beats.push({ at: Math.round(t), open: true }, { at: Math.round(t + slot * 0.6), open: false });
      t += slot;
    }
    if (i < counts.length - 1) t += slot * PAUSE;
  });
  return { beats, total: Math.round(t) };
}
