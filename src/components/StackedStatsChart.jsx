import { useContext } from "react";
import { BarChart } from "@mui/x-charts/BarChart";
import { doI18n } from "pankosmia-lib/i18n";
import { i18nContext } from "pankosmia-rcl";
import { totalOf } from "../lib/compare";
import { STATUS_COLORS, STATUS_I18N, STATUS_KEYS } from "../lib/status";

// items: [{ label, stats }]; one stacked bar per item.
export default function StackedStatsChart({ items, percent, onSelect }) {
  const { i18nRef } = useContext(i18nContext);
  const t = (key) =>
    doI18n(`pages:textTranslation_dif:${key}`, i18nRef.current);

  const series = STATUS_KEYS.map((key) => ({
    id: key,
    label: t(STATUS_I18N[key]),
    color: STATUS_COLORS[key],
    stack: "total",
    data: items.map((item) => {
      const total = totalOf(item.stats);
      if (!percent) return item.stats[key];
      return total ? (item.stats[key] / total) * 100 : 0;
    }),
    valueFormatter: (value) => (percent ? `${value.toFixed(1)} %` : value),
  }));

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
