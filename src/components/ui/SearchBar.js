import React from "react";
import { TextField, InputAdornment, useTheme } from "@mui/material";
import { Search as SearchIcon } from "lucide-react";

export default function SearchBar({
  style,
  onSearch,
  classes: _classes,
  inputClasses,
}) {
  const theme = useTheme();
  const [value, setValue] = React.useState("");

  const handleChange = (e) => {
    const newValue = e.target.value.toLowerCase();
    onSearch(newValue);
    setValue(newValue);
  };

  const neutral2 = theme.colors?.neutral_2 ?? "#D0D6DD";
  const neutral3 = theme.colors?.neutral_3 ?? "#7d90a9";

  return (
    <TextField
      style={style}
      id="searchBar"
      value={value}
      onChange={handleChange}
      variant="outlined"
      size="small"
      sx={{
        maxWidth: "150px",
        "@media screen and (min-width: 768px)": { maxWidth: "unset" },
        "& .MuiOutlinedInput-root": {
          boxShadow:
            "inset 0px 1px 3px rgba(0,0,0,.2), inset 0px 1px 8px rgba(0,0,0,.1)",
          border: "none",
          borderColor: neutral2,
          color: neutral2,
          borderRadius: "4px",
          "& fieldset": { borderColor: neutral2 },
          "&:hover fieldset": { borderColor: neutral2 },
          "&.Mui-focused fieldset": { borderColor: neutral2 },
        },
        "& .MuiInputBase-input": {
          paddingTop: "10px",
          paddingBottom: "10px",
          color: neutral3,
          ...inputClasses,
        },
        "& .MuiInputAdornment-root": {
          color: neutral3,
          paddingLeft: "5px",
        },
      }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon size={20} style={{ color: neutral3 }} />
          </InputAdornment>
        ),
      }}
      {...(_classes ? { className: _classes.root } : {})}
    />
  );
}
