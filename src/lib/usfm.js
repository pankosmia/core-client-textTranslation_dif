const HEADER_LINES =
  /^\s*\\(?:s\d*|ms\d*|mr|r|d|sp|cl|cd|rem|b|ts\d*|qa|esb|esbe|cat|ide?|h|toc\d|mt\d?|imt\d?|is\d?|ip)\b.*$/gm;

function cleanSegment(segment) {
  return segment
    .replace(HEADER_LINES, "")
    .replace(/\\\+?[a-z]+\d*\*?/g, "")
    .replace(/\\\*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Returns [{ chapter, verses: [{ verse, text }] }] with notes and markers removed.
export function parseUsfm(usfm) {
  const withoutNotes = usfm
    .replace(/\\(f|fe|x|fig)\s[\s\S]*?\\\1\*/g, " ")
    .replace(/\\z[\w-]+\s*(?:\|[^\\]*)?\\\*/g, "")
    .replace(/\\\+?w\s+([^|\\]*)(?:\|[^\\]*)?\\\+?w\*/g, "$1");

  const marker = /\\(c|v)\s+(\d+(?:[-–]\d+)?[a-z]?)\s*/g;
  const chapters = [];
  let chapter = null;
  let verse = null;
  let lastIndex = 0;

  const closeVerse = (end) => {
    if (chapter && verse) {
      chapter.verses.push({
        verse,
        text: cleanSegment(withoutNotes.slice(lastIndex, end)),
      });
    }
  };

  for (const m of withoutNotes.matchAll(marker)) {
    closeVerse(m.index);
    lastIndex = m.index + m[0].length;
    if (m[1] === "c") {
      chapter = { chapter: m[2], verses: [] };
      chapters.push(chapter);
      verse = null;
    } else {
      verse = m[2];
    }
  }
  closeVerse(withoutNotes.length);
  return chapters;
}
