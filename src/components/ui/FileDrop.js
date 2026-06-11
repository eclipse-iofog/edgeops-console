import React from "react";
import { useDrop } from "react-dnd";
import { NativeTypes } from "react-dnd-html5-backend";
import { CircularProgress, Box, useTheme } from "@mui/material";

const { FILE } = NativeTypes;

export default function FileDrop(props) {
  const theme = useTheme();
  const [collectedProps, drop] = useDrop({
    accept: FILE,
    drop: props.onDrop,
    collect: (monitor) => ({
      highlighted: monitor.canDrop(),
      hovered: monitor.isOver(),
    }),
  });

  const active = collectedProps.hovered && collectedProps.highlighted;

  const dropZoneSx = {
    border: `1px dashed ${theme.colors?.neutral_2 ?? "#D0D6DD"}`,
    minHeight: "39px",
    borderRadius: "4px",
    color: theme.colors?.neutral_3 ?? "#7d90a9",
    fontStyle: "italic",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    paddingLeft: "15px",
    paddingRight: "15px",
    "& label": {
      color: theme.colors?.neutral_3 ?? "#7d90a9",
    },
    ...(active && { backgroundColor: "#d8dfe5" }),
  };

  return props.loading ? (
    <Box
      sx={{ ...dropZoneSx }}
      style={{ ...props.style, display: "flex", alignItems: "center" }}
    >
      <CircularProgress color="primary" size={24} />
    </Box>
  ) : (
    <Box ref={drop} sx={dropZoneSx} style={props.style}>
      {active ? props.onHover || "Release to drop" : props.children}
    </Box>
  );
}
