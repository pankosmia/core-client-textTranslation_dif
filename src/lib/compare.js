import { normalizeWords } from "./normalize";
import { parseUsfm } from "./usfm";

export const emptyStats = () => ({
  identical: 0,
  different: 0,
  onlyA: 0,
  onlyB: 0,
});

export function addStats(target, source) {
  target.identical += source.identical;
  target.different += source.different;
  target.onlyA += source.onlyA;
  target.onlyB += source.onlyB;
  return target;
}

export const totalOf = (stats) =>
  stats.identical + stats.different + stats.onlyA + stats.onlyB;

// Exact Longest Common Subsequence alignment, O(n*m) time and memory.
function lcsAlign(wordsA, wordsB) {
  const n = wordsA.length;
  const m = wordsB.length;
  const width = m + 1;
  // table[i * width + j] = LCS length of wordsA[i..] and wordsB[j..]
  const table = new Uint32Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i * width + j] =
        wordsA[i] === wordsB[j]
          ? table[(i + 1) * width + j + 1] + 1
          : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    }
  }

  const operations = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (wordsA[i] === wordsB[j]) {
      operations.push(["equal", wordsA[i]]);
      i++;
      j++;
    } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) {
      operations.push(["removed", wordsA[i++]]);
    } else {
      operations.push(["added", wordsB[j++]]);
    }
  }
  while (i < n) operations.push(["removed", wordsA[i++]]);
  while (j < m) operations.push(["added", wordsB[j++]]);
  return operations;
}

// Word-level comparison based on the LCS of the two word lists.
export function compareWords(wordsA, wordsB) {
  const operations = lcsAlign(wordsA, wordsB);
  const stats = emptyStats();
  const pairs = [];
  let removed = [];
  let added = [];

  // A replaced block pairs its words up as "different"; the surplus is one-sided.
  const flush = () => {
    const common = Math.min(removed.length, added.length);
    for (let i = 0; i < common; i++) {
      pairs.push({ a: removed[i], b: added[i], status: "different" });
      stats.different += 1;
    }
    for (const a of removed.slice(common)) {
      pairs.push({ a, b: undefined, status: "onlyA" });
      stats.onlyA += 1;
    }
    for (const b of added.slice(common)) {
      pairs.push({ a: undefined, b, status: "onlyB" });
      stats.onlyB += 1;
    }
    removed = [];
    added = [];
  };

  for (const [operation, word] of operations) {
    if (operation === "equal") {
      flush();
      pairs.push({ a: word, b: word, status: "identical" });
      stats.identical += 1;
    } else if (operation === "removed") {
      removed.push(word);
    } else {
      added.push(word);
    }
  }
  flush();
  return { stats, pairs };
}

const byNumber = (x, y) =>
  parseInt(x, 10) - parseInt(y, 10) || x.localeCompare(y);

function toMap(chapters) {
  const map = new Map();
  for (const c of chapters) {
    map.set(c.chapter, new Map(c.verses.map((v) => [v.verse, v.text])));
  }
  return map;
}

// Compares one book chapter by chapter and verse by verse.
export function compareBook(usfmA, usfmB, keepModifierApostrophe = true) {
  const mapA = toMap(parseUsfm(usfmA));
  const mapB = toMap(parseUsfm(usfmB));
  const chapterKeys = [...new Set([...mapA.keys(), ...mapB.keys()])].sort(
    byNumber,
  );
  const bookStats = emptyStats();

  const chapters = chapterKeys.map((chapter) => {
    const versesA = mapA.get(chapter) ?? new Map();
    const versesB = mapB.get(chapter) ?? new Map();
    const verseKeys = [...new Set([...versesA.keys(), ...versesB.keys()])].sort(
      byNumber,
    );
    const chapterStats = emptyStats();
    const verses = verseKeys.map((verse) => {
      const textA = versesA.get(verse) ?? "";
      const textB = versesB.get(verse) ?? "";
      const { stats, pairs } = compareWords(
        normalizeWords(textA, keepModifierApostrophe),
        normalizeWords(textB, keepModifierApostrophe),
      );
      addStats(chapterStats, stats);
      return { verse, stats, pairs, textA, textB };
    });
    addStats(bookStats, chapterStats);
    return { chapter, stats: chapterStats, verses };
  });

  return { stats: bookStats, chapters };
}
