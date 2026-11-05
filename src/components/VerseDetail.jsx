import { useContext } from "react";
import { Box, Chip, Paper, Typography } from "@mui/material";
import { doI18n } from "pankosmia-lib/i18n";
import { i18nContext } from "pankosmia-rcl";
import { STATUS_COLORS } from "../lib/status";

// Word-by-word view of one verse.
export default function VerseDetail({ title, pairs, dir }) {
  const { i18nRef } = useContext(i18nContext);
  const none = doI18n("pages:textTranslation_dif:missing", i18nRef.current);

  return (
    <Paper sx={{ p: 2, mt: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box dir={dir} sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
        {pairs.map((pair, index) => (
          <Box
            key={index}
            sx={{
              border: `2px solid ${STATUS_COLORS[pair.status]}`,
              borderRadius: 1,
              px: 1,
              py: 0.5,
              textAlign: "center",
            }}
          >
            <Typography variant="body2">{pair.a ?? none}</Typography>
            {pair.status !== "identical" && (
              <Typography variant="body2" sx={{ color: STATUS_COLORS[pair.status] }}>
                {pair.b ?? none}
              </Typography>
            )}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
