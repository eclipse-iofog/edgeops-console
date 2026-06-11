import React, { useRef, useEffect, useState } from "react";
import YamlEditorTab from "./YamlEditorTab";

interface StableYamlTabProps {
  sessionId: string;
  content: string;
  onChange: (value: string) => void;
}

const StableYamlTab: React.FC<StableYamlTabProps> = ({
  sessionId,
  content,
  onChange,
}) => {
  const [isReady, setIsReady] = useState(false);
  const hasInitializedRef = useRef(false);

  // Initialize only once when component mounts
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        setIsReady(true);
      }, 100);
    }
  }, []);

  if (!isReady) {
    return (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1a1a1a",
        }}
      >
        <div className="text-gray-400">Starting YAML editor...</div>
      </div>
    );
  }

  return <YamlEditorTab content={content} onChange={onChange} />;
};

// Use a more strict memo comparison
export default React.memo(StableYamlTab, (prevProps, nextProps) => {
  // Only re-render if the session ID changes (which should never happen)
  return prevProps.sessionId === nextProps.sessionId;
});
