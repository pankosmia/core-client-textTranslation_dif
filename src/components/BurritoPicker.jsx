import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

// options: [[path, summary]]
export default function BurritoPicker({ label, value, options, onChange }) {
  return (
    <FormControl size="small" sx={{ minWidth: 260 }}>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map(([path, info]) => (
          <MenuItem key={path} value={path}>
            {info.abbreviation ? `${info.abbreviation} - ${info.name}` : path}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
