import React from "react";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/theme-tomorrow";
import "ace-builds/src-noconflict/mode-yaml";

interface YamlEditorTabProps {
  content: string;
  onChange: (value: string) => void;
}

const YamlEditorTab: React.FC<YamlEditorTabProps> = ({ content, onChange }) => {
  return (
    <AceEditor
      setOptions={{ useWorker: false, tabSize: 2 }}
      mode="yaml"
      theme="tomorrow"
      value={content}
      showPrintMargin={false}
      onLoad={function (editor) {
        editor.renderer.setPadding(10);
        editor.renderer.setScrollMargin(10);
      }}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "4px",
      }}
      onChange={onChange}
    />
  );
};

export default React.memo(YamlEditorTab, (prevProps, nextProps) => {
  // Only re-render if content changes
  return prevProps.content === nextProps.content;
});
