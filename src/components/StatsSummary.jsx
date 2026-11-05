import { useContext } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";
import { doI18n } from "pankosmia-lib/i18n";
import { i18nContext } from "pankosmia-rcl";
import { totalOf } from "../lib/compare";
import { STATUS_COLORS, STATUS_I18N, STATUS_KEYS } from "../lib/status";

export default function StatsSummary({ stats }) {
  const { i18nRef } = useContext(i18nContext);
  const t = (key) =>
    doI18n(`pages:textTranslation_dif:${key}`, i18nRef.current);
  const total = totalOf(stats);
  const percent = (value) =>
    total ? `${((value / total) * 100).toFixed(1)} %` : "-";

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "center" }}>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        <Paper sx={{ p: 1.5, minWidth: 130 }}>
          <Typography variant="caption">{t("total_words")}</Typography>
          <Typography variant="h6">{total}</Typography>
        </Paper>
        {STATUS_KEYS.map((key) => (
          <Paper
            key={key}
            sx={{
              p: 1.5,
              minWidth: 130,
              borderLeft: `6px solid ${STATUS_COLORS[key]}`,
            }}
          >
            <Typography variant="caption">{t(STATUS_I18N[key])}</Typography>
            <Typography variant="h6">{stats[key]}</Typography>
            <Typography variant="caption">{percent(stats[key])}</Typography>
          </Paper>
        ))}
      </Box>
      <PieChart
        width={300}
        height={200}
        series={[
          {
            innerRadius: 40,
            paddingAngle: 2,
            data: STATUS_KEYS.map((key) => ({
              id: key,
              value: stats[key],
              label: t(STATUS_I18N[key]),
              color: STATUS_COLORS[key],
            })),
          },
        ]}
      />
    </Box>
  );
}
