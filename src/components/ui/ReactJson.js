import { Button, Box } from "@mui/material";
import React from "react";
import ReactJSONView from "react-json-view";

export default function ReactJson(props) {
  const [copyText, setcopyText] = React.useState("Copy All");

  function unsecuredCopyFunction(textToCopy) {
    const textarea = document.createElement("textarea");
    textarea.value = textToCopy;
    const presentationArea = document.getElementsByClassName("MuiDialog-root");

    if (presentationArea?.[0]) {
      textarea.style.position = "absolute";
      textarea.style.zIndex = "9999";
      textarea.style.left = "-99999999px";
      presentationArea[0].prepend(textarea);
      textarea.select();
      textarea.focus();
    }

    try {
      document.execCommand("copy");
    } catch (err) {
      console.log(err);
    } finally {
      textarea.remove();
    }
    setcopyText("Copy All");
  }

  return (
    <>
      {props?.copyButtonEnable ? (
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            autoFocus
            onClick={() => {
              setcopyText("Copied");
              unsecuredCopyFunction(JSON.stringify(props?.src));
            }}
          >
            {copyText}
          </Button>
        </Box>
      ) : null}
      <ReactJSONView
        {...props}
        theme="tomorrow"
        style={{ padding: "15px", borderRadius: "4px", overflow: "auto" }}
        onEdit={
          props?.reactJsonViewOnEdit
            ? (e) => props?.reactJsonViewOnEdit(e)
            : null
        }
        onAdd={
          props?.reactJsonViewOnEdit
            ? (e) => props?.reactJsonViewOnEdit(e)
            : null
        }
        onDelete={
          props?.reactJsonViewOnEdit
            ? (e) => props?.reactJsonViewOnEdit(e)
            : null
        }
        enableClipboard={false}
        displayObjectSize={false}
        iconStyle="square"
      />
    </>
  );
}
