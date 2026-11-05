import Diff from "text-diff";
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

const differ = new Diff();
const EQUAL = 0;
const FIRST_CHAR = 0x4e00;

// Word-level diff: each distinct word becomes one character for text-diff.
export function compareWords(wordsA, wordsB) {
  const codes = new Map();
  const words = [];
  const encode = (list) =>
    list
      .map((word) => {
        if (!codes.has(word)) {
          codes.set(word, String.fromCharCode(FIRST_CHAR + words.length));
          words.push(word);
        }
        return codes.get(word);
      })
      .join("");
  const decode = (text) =>
    [...text].map((char) => words[char.charCodeAt(0) - FIRST_CHAR]);

  const operations = differ.main(encode(wordsA), encode(wordsB), false);
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

  for (const [operation, text] of operations) {
    if (operation === EQUAL) {
      flush();
      for (const word of decode(text)) {
        pairs.push({ a: word, b: word, status: "identical" });
        stats.identical += 1;
      }
    } else if (operation < 0) {
      removed.push(...decode(text));
    } else {
      added.push(...decode(text));
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
export function compareBook(usfmA, usfmB) {
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
      const { stats, pairs } = compareWords(
        normalizeWords(versesA.get(verse) ?? ""),
        normalizeWords(versesB.get(verse) ?? ""),
      );
      addStats(chapterStats, stats);
      return { verse, stats, pairs };
    });
    addStats(bookStats, chapterStats);
    return { chapter, stats: chapterStats, verses };
  });

  return { stats: bookStats, chapters };
}
