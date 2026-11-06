import { useContext } from "react";
import { BarChart } from "@mui/x-charts/BarChart";
import { doI18n } from "pankosmia-lib/i18n";
import { i18nContext } from "pankosmia-rcl";
import { totalOf } from "../lib/compare";
import {
  FULLY_IDENTICAL_COLOR,
  STATUS_COLORS,
  STATUS_I18N,
  STATUS_KEYS,
} from "../lib/status";

// items: [{ label, stats }]; one stacked bar per item.
export default function StackedStatsChart({ items, percent, onSelect }) {
  const { i18nRef } = useContext(i18nContext);
  const t = (key) =>
    doI18n(`pages:textTranslation_dif:${key}`, i18nRef.current);

  const isFull = (item) => {
    const total = totalOf(item.stats);
    return total > 0 && item.stats.identical === total;
  };

  const series = STATUS_KEYS.map((key) => ({
    id: key,
    label: t(STATUS_I18N[key]),
    color: STATUS_COLORS[key],
    stack: "total",
    data: items.map((item) => {
      const total = totalOf(item.stats);
      if (key === "identical" && isFull(item)) return 0;
      if (!percent) return item.stats[key];
      return total ? (item.stats[key] / total) * 100 : 0;
    }),
    valueFormatter: (value) => (percent ? `${value.toFixed(1)} %` : value),
  }));

  // Bars with 100 % identical words get their own paler series.
  series.splice(1, 0, {
    id: "fullyIdentical",
    label: t("fully_identical"),
    color: FULLY_IDENTICAL_COLOR,
    stack: "total",
    data: items.map((item) => {
      if (!isFull(item)) return 0;
      return percent ? 100 : item.stats.identical;
    }),
    valueFormatter: (value) => (percent ? `${value.toFixed(1)} %` : value),
  });

  return (
    <BarChart
      height={320}
      series={series}
      xAxis={[
        {
          scaleType: "band",
          data: items.map((item) => item.label),
        },
      ]}
      yAxis={percent ? [{ min: 0, max: 100 }] : undefined}
      onAxisClick={(event, axis) => {
        if (axis && axis.dataIndex !== null && axis.dataIndex !== undefined) {
          onSelect(axis.dataIndex);
        }
      }}
    />
  );
}
