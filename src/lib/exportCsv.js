import { totalOf } from "./compare";

const SEPARATOR = ";";
const BOM = "\uFEFF";

// Quotes the cell and neutralizes spreadsheet formulas.
function cell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// One row per verse; `headers` is the ordered list of the 9 column labels.
export function buildCsv(books, headers) {
  const rows = [headers];
  for (const { code, result } of books) {
    for (const chapter of result.chapters) {
      for (const verse of chapter.verses) {
        const { stats } = verse;
        const total = totalOf(stats);
        rows.push([
          code,
          chapter.chapter,
          verse.verse,
          stats.identical,
          stats.different,
          stats.onlyA,
          stats.onlyB,
          total,
          total ? ((stats.identical / total) * 100).toFixed(1).replace(".", ",") : "",
        ]);
      }
    }
  }
  return BOM + rows.map((row) => row.map(cell).join(SEPARATOR)).join("\r\n");
}

export function downloadCsv(content, filename) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
