import { ThemeProvider, createTheme } from "@mui/material/styles";

import customTheme from "./theme.json";

export const colors = {
  cobalt: "#5064EC",
  gold: "#F5A623",
  argon: "#7A3BFF",
  carbon: "#00293E",
  // carbon: '#1a2d45',
  lead: "#57687D",
  aluminium: "#D3D1D0",
  silver: "#FAFCFF",
  white: "#FFFFFF",
  primary: "#26D6F1",
  secondary: "#FF585D",
  purple: "#5064EC",
  green: "#4CE1B6",
  neutral: "#506279",
  neutral_3: "#7d90a9",
  neutral_2: "#D0D6DD",
  neutral_0: "white",
  neutral_1: "#ebedf0",
  neutral_4: "#506279",
  neutral_5: "#1a2d45",
  black: "#000000",
  datasance_color_0: "#10253dff",
  datasance_color_1: "#644a92ff",
  datasance_color_2: "#6abec1ff",
  datasance_color_3: "#4d3167ff",
  datasance_color_4: "#e76467ff",
};

export const theme = createTheme({
  ...customTheme,
  colors: {
    ...colors,
    success: colors.primary,
    error: colors.secondary,
    danger: colors.gold,
  },
});

export default function Theming(props) {
  return <ThemeProvider theme={theme}>{props.children}</ThemeProvider>;
}
