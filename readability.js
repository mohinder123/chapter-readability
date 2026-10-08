/** @typedef {{ text: string, start: number, end: number, words: number, syllables: number, difficulty: number, fkGrade: number }} SentenceStat */

const VOWEL_GROUP = /[aeiouy]+/gi;
const WORD_RE = /[a-z0-9']+/gi;

/**
 * Rough English syllable count (good enough for readability formulas).
 * @param {string} word
 */
export function countSyllables(word) {
  let w = word.toLowerCase().replace(/[^a-z']/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;

  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  w = w.replace(/^y/, "");

  const matches = w.match(VOWEL_GROUP);
  let count = matches ? matches.length : 1;

  if (w.endsWith("le") && w.length > 2 && !/[aeiouy]/.test(w.charAt(w.length - 3))) {
    count += 1;
  }

  return Math.max(1, count);
}

/**
 * @param {string} text
 */
export function countTextStats(text) {
  const words = text.match(WORD_RE) ?? [];
  let syllables = 0;
  for (const w of words) {
    syllables += countSyllables(w);
  }
  return { words: words.length, syllables, sentences: 0 };
}

/**
 * Split into sentences while keeping character offsets in original text.
 * @param {string} text
 * @returns {{ text: string, start: number, end: number }[]}
 */
export function splitSentences(text) {
  if (!text.trim()) return [];

  /** @type {{ text: string, start: number, end: number }[]} */
  const out = [];
  const re = /[^.!?]+[.!?]+|[^.!?]+$/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    const sentence = raw.trim();
    if (sentence.length > 0) {
      const lead = raw.indexOf(sentence);
      out.push({
        text: sentence,
        start: m.index + lead,
        end: m.index + lead + sentence.length,
      });
    }
  }
  return out;
}

/**
 * Flesch–Kincaid grade level for a snippet.
 * @param {number} words
 * @param {number} syllables
 * @param {number} sentences
 */
export function fleschKincaidGrade(words, syllables, sentences) {
  if (sentences === 0 || words === 0) return 0;
  return 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59;
}

/**
 * Flesch reading ease (0–100+, higher = easier).
 */
export function fleschReadingEase(words, syllables, sentences) {
  if (sentences === 0 || words === 0) return 0;
  return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
}

/**
 * Per-sentence difficulty score (higher = harder). Uses FK grade plus length pressure.
 * @param {string} sentence
 */
export function scoreSentenceDifficulty(sentence) {
  const words = sentence.match(WORD_RE) ?? [];
  const n = words.length;
  if (n === 0) return { difficulty: 0, fkGrade: 0, words: 0, syllables: 0 };

  let syllables = 0;
  for (const w of words) syllables += countSyllables(w);

  const fk = fleschKincaidGrade(n, syllables, 1);
  const avgWordLen = sentence.replace(/\s/g, "").length / n;
  const difficulty = fk + Math.max(0, n - 25) * 0.08 + Math.max(0, avgWordLen - 5) * 0.5;

  return { difficulty, fkGrade: fk, words: n, syllables };
}

/**
 * @param {string} chapter
 */
export function analyzeChapter(chapter) {
  const sentences = splitSentences(chapter);
  const { words, syllables } = countTextStats(chapter);
  const sentenceCount = sentences.length || 1;

  const ease = fleschReadingEase(words, syllables, sentenceCount);
  const grade = fleschKincaidGrade(words, syllables, sentenceCount);

  /** @type {SentenceStat[]} */
  const inOrder = sentences.map((s) => {
    const stats = scoreSentenceDifficulty(s.text);
    return { ...s, ...stats };
  });

  const byDifficulty = [...inOrder].sort((a, b) => b.difficulty - a.difficulty);
  const hardest = byDifficulty.slice(0, 5).filter((s) => s.words >= 3);

  const hardestStarts = new Set(hardest.map((s) => s.start));

  return {
    words,
    syllables,
    sentenceCount: sentences.length,
    fleschReadingEase: ease,
    fleschKincaidGrade: grade,
    sentencesInOrder: inOrder,
    hardest,
    hardestStarts,
  };
}

export function labelReadingEase(score) {
  if (score >= 90) return "Very easy";
  if (score >= 80) return "Easy";
  if (score >= 70) return "Fairly easy";
  if (score >= 60) return "Standard";
  if (score >= 50) return "Fairly difficult";
  if (score >= 30) return "Difficult";
  return "Very difficult";
}

export function labelGrade(grade) {
  if (grade <= 6) return "Elementary";
  if (grade <= 9) return "Middle school";
  if (grade <= 12) return "High school";
  if (grade <= 16) return "College";
  return "Graduate";
}
