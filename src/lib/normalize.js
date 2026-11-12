// Removes accents, punctuation and capitals, then splits into words.
// keepModifierApostrophe: keep U+02BC as a letter, otherwise treat it as punctuation.
export function normalizeWords(text, keepModifierApostrophe = true) {
  const source = keepModifierApostrophe ? text : text.replaceAll("\u02BC", " ");
  return source
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}
