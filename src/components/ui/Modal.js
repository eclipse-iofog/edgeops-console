import React from "react";
import { Modal, Paper, Button, Box } from "@mui/material";
import { X } from "lucide-react";

const modalTitleSx = {
  borderRadius: "4px 4px 0 0",
  padding: "25px 15px",
  display: "flex",
  fontSize: "24px",
  fontWeight: "700",
  justifyContent: "space-between",
  textTransform: "uppercase",
  "@media screen and (min-width: 992px)": {
    padding: "25px 50px",
  },
};

const sizeSx = {
  lg: {
    width: "90%",
    "@media screen and (min-width: 768px)": { width: "75%" },
    "@media screen and (min-width: 992px)": { width: "60%" },
  },
  sm: {
    width: "90%",
    "@media screen and (min-width: 768px)": { width: "60%" },
    "@media screen and (min-width: 992px)": { width: "40%" },
  },
  xl: {
    width: "90%",
    "@media screen and (min-width: 992px)": { width: "80%" },
  },
};

export default function _Modal(props) {
  const { title, open, onClose } = props;
  const size = props.size || "sm";

  const customStyle = props.style || {};
  return (
    <Modal aria-labelledby={`${title} modal`} open={open} onClose={onClose}>
      <Paper
        sx={{
          position: "relative",
          margin: "auto",
          top: "15%",
          borderRadius: "4px",
          "&:focus": { outline: "none" },
          ...sizeSx[size],
        }}
      >
        <Box sx={modalTitleSx}>
          <div>{title}</div>
          <X
            size={24}
            style={{ cursor: "pointer" }}
            onClick={onClose}
            aria-label="Close"
          />
        </Box>
        <Box
          sx={{
            maxHeight: "600px",
            overflowY: "auto",
            padding: "15px",
            paddingTop: "0px",
            paddingBottom: "25px",
            "@media screen and (min-width: 992px)": {
              padding: "50px",
            },
            ...customStyle.modalContent,
          }}
        >
          {props.children}
        </Box>
        {props.actions && props.actions.length > 0 && (
          <Box
            sx={{
              display: "flex",
              backgroundColor: "#FAFCFF",
              alignItems: "flex-end",
            }}
          >
            {props.actions.map((a) => (
              <Button
                key={a.text}
                sx={{ marginLeft: "5px" }}
                variant={a.variant}
                onClick={a.onClick}
              >
                {a.text}
              </Button>
            ))}
          </Box>
        )}
      </Paper>
    </Modal>
  );
}
