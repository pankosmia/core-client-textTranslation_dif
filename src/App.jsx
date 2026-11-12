import { useContext, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  LinearProgress,
  Link,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { doI18n } from "pankosmia-lib/i18n";
import { getJson, getText } from "pankosmia-lib/http";
import { i18nContext, ScrollableBody } from "pankosmia-rcl";
import BurritoPicker from "./components/BurritoPicker";
import StatsSummary from "./components/StatsSummary";
import StackedStatsChart from "./components/StackedStatsChart";
import VerseDetail from "./components/VerseDetail";
import { addStats, compareBook, emptyStats, totalOf } from "./lib/compare";
import { buildCsv, downloadCsv } from "./lib/exportCsv";

const CONCURRENCY = 4;

async function fetchBook(path, code) {
  const response = await getText(
    `/api/burrito/ingredient/raw/${path}?ipath=${code}.usfm`,
  );
  if (!response.ok) throw new Error(`${code}: ${response.status}`);
  return response.text;
}

function App() {
  const { i18nRef } = useContext(i18nContext);
  const t = (key) =>
    doI18n(`pages:textTranslation_dif:${key}`, i18nRef.current);

  const [burritos, setBurritos] = useState([]);
  const [pathA, setPathA] = useState("");
  const [pathB, setPathB] = useState("");
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [books, setBooks] = useState(null); // [{ code, result }]
  const [nav, setNav] = useState({ book: null, chapter: null, verse: null });
  const [percent, setPercent] = useState(false);
  const [keepApostrophe, setKeepApostrophe] = useState(true);

  useEffect(() => {
    getJson("/api/burrito/metadata/summaries").then((response) => {
      if (!response.ok) {
        setError(`${t("error")}: ${response.status}`);
        return;
      }
      const list = Object.entries(response.json).filter(
        ([, info]) => info.flavor === "textTranslation",
      );
      setBurritos(list);
      if (list.length > 1) {
        setPathA(list[0][0]);
        setPathB(list[1][0]);
      }
    });
  }, []);

  const infoOf = (path) => burritos.find(([key]) => key === path)?.[1];

  async function compare() {
    setError("");
    setBooks(null);
    setNav({ book: null, chapter: null, verse: null });
    const codesA = infoOf(pathA)?.book_codes ?? [];
    const codesB = new Set(infoOf(pathB)?.book_codes ?? []);
    const common = codesA.filter((code) => codesB.has(code));
    if (common.length === 0) {
      setError(t("no_common_books"));
      return;
    }

    const results = new Map();
    const failures = [];
    let done = 0;
    let next = 0;
    setProgress(0);

    async function worker() {
      while (next < common.length) {
        const code = common[next++];
        try {
          const [usfmA, usfmB] = await Promise.all([
            fetchBook(pathA, code),
            fetchBook(pathB, code),
          ]);
          results.set(code, compareBook(usfmA, usfmB, keepApostrophe));
        } catch (err) {
          failures.push(err.message);
        }
        done += 1;
        setProgress((done / common.length) * 100);
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    setProgress(null);
    if (failures.length > 0) {
      setError(`${t("error")}: ${failures.join(", ")}`);
    }
    setBooks(
      common
        .filter((code) => results.has(code))
        .map((code) => ({ code, result: results.get(code) })),
    );
  }

  const globalStats = useMemo(() => {
    const stats = emptyStats();
    (books ?? []).forEach((b) => addStats(stats, b.result.stats));
    return stats;
  }, [books]);

  const book = books?.find((b) => b.code === nav.book);
  const chapter = book?.result.chapters.find((c) => c.chapter === nav.chapter);
  const verse = chapter?.verses.find((v) => v.verse === nav.verse);

  // Items shown by the chart and the table at the current level.
  let items = [];
  if (chapter) {
    items = chapter.verses.map((v) => ({
      key: v.verse,
      label: v.verse,
      stats: v.stats,
    }));
  } else if (book) {
    items = book.result.chapters.map((c) => ({
      key: c.chapter,
      label: c.chapter,
      stats: c.stats,
    }));
  } else if (books) {
    items = books.map((b) => ({
      key: b.code,
      label: b.code,
      stats: b.result.stats,
    }));
  }
  const currentStats = chapter?.stats ?? book?.result.stats ?? globalStats;

  function select(key) {
    if (chapter) setNav({ ...nav, verse: key });
    else if (book) setNav({ book: nav.book, chapter: key, verse: null });
    else setNav({ book: key, chapter: null, verse: null });
  }

  const bookName = (code) => doI18n(`scripture:books:${code}`, i18nRef.current);
  const levelLabel = chapter ? t("verse") : book ? t("chapter") : t("book");
  const dir = infoOf(pathA)?.script_direction === "rtl" ? "rtl" : "ltr";
  const canCompare = pathA && pathB && pathA !== pathB && progress === null;

  function exportCsv() {
    const headers = [
      t("book"),
      t("chapter"),
      t("verse"),
      t("identical"),
      t("different"),
      t("only_a"),
      t("only_b"),
      t("total_words"),
      t("identical_rate"),
    ];
    downloadCsv(buildCsv(books, headers), "textTranslation_dif.csv");
  }

  return (
    <ScrollableBody>
      <Box sx={{ mx: 2, my: 2 }}>
        {burritos.length < 2 ? (
          <Alert severity="info">{t("no_burritos")}</Alert>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 2,
              alignItems: "center",
            }}
          >
            <BurritoPicker
              label={t("burrito_a")}
              value={pathA}
              options={burritos}
              onChange={setPathA}
            />
            <BurritoPicker
              label={t("burrito_b")}
              value={pathB}
              options={burritos}
              onChange={setPathB}
            />
            <Select
              size="small"
              value={keepApostrophe ? "keep" : "ignore"}
              onChange={(e) => setKeepApostrophe(e.target.value === "keep")}
            >
              <MenuItem value="keep">{t("apostrophe_keep")}</MenuItem>
              <MenuItem value="ignore">{t("apostrophe_ignore")}</MenuItem>
            </Select>
            <Button
              variant="contained"
              disabled={!canCompare}
              onClick={compare}
            >
              {t("compare")}
            </Button>
            <Button
              variant="outlined"
              disabled={!books?.length}
              onClick={exportCsv}
            >
              {t("export_csv")}
            </Button>
            {pathA === pathB && (
              <Typography color="warning.main">{t("select_two")}</Typography>
            )}
          </Box>
        )}
        <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
          {t("rules")}
        </Typography>
        {progress !== null && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption">{t("loading")}</Typography>
            <LinearProgress variant="determinate" value={progress} />
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {books && books.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Breadcrumbs sx={{ mb: 2 }}>
              <Link
                component="button"
                onClick={() =>
                  setNav({ book: null, chapter: null, verse: null })
                }
              >
                {t("global")}
              </Link>
              {book && (
                <Link
                  component="button"
                  onClick={() =>
                    setNav({ book: nav.book, chapter: null, verse: null })
                  }
                >
                  {bookName(book.code)}
                </Link>
              )}
              {chapter && (
                <Link
                  component="button"
                  onClick={() => setNav({ ...nav, verse: null })}
                >
                  {`${t("chapter")} ${chapter.chapter}`}
                </Link>
              )}
              {verse && (
                <Typography>{`${t("verse")} ${verse.verse}`}</Typography>
              )}
            </Breadcrumbs>

            <StatsSummary stats={currentStats} />

            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
              <ToggleButtonGroup
                size="small"
                exclusive
                value={percent ? "percent" : "count"}
                onChange={(e, value) =>
                  value && setPercent(value === "percent")
                }
              >
                <ToggleButton value="count">{t("count")}</ToggleButton>
                <ToggleButton value="percent">{t("percent")}</ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="caption">{t("click_hint")}</Typography>
            </Box>
            <StackedStatsChart
              items={items}
              percent={percent}
              onSelect={(index) => select(items[index].key)}
            />

            {verse && (
              <VerseDetail
                dir={dir}
                title={`${bookName(book.code)} ${chapter.chapter}:${verse.verse}`}
                pairs={verse.pairs}
              />
            )}

            <TableContainer sx={{ mt: 2 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>{levelLabel}</TableCell>
                    <TableCell align="right">{t("identical")}</TableCell>
                    <TableCell align="right">{t("different")}</TableCell>
                    <TableCell align="right">{t("only_a")}</TableCell>
                    <TableCell align="right">{t("only_b")}</TableCell>
                    <TableCell align="right">{t("identical_rate")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => {
                    const total = totalOf(item.stats);
                    return (
                      <TableRow
                        key={item.key}
                        hover
                        sx={{ cursor: "pointer" }}
                        selected={item.key === nav.verse}
                        onClick={() => select(item.key)}
                      >
                        <TableCell>
                          {book ? item.label : bookName(item.label)}
                        </TableCell>
                        <TableCell align="right">
                          {item.stats.identical}
                        </TableCell>
                        <TableCell align="right">
                          {item.stats.different}
                        </TableCell>
                        <TableCell align="right">{item.stats.onlyA}</TableCell>
                        <TableCell align="right">{item.stats.onlyB}</TableCell>
                        <TableCell align="right">
                          {total
                            ? `${((item.stats.identical / total) * 100).toFixed(1)} %`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Box>
    </ScrollableBody>
  );
}

export default App;
