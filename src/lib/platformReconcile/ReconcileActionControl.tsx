import React from "react";
import ReconcileActionIcon from "./ReconcileActionIcon";

type ReconcileActionControlProps = {
  onReconcile: () => void;
  spinning?: boolean;
  reconciling?: boolean;
  title?: string;
  label?: string;
};

export const ReconcileActionControl: React.FC<ReconcileActionControlProps> = ({
  onReconcile,
  spinning = false,
  reconciling = false,
  title = "Sync now",
  label = "Sync now",
}) => {
  return (
    <span className="inline-flex items-center gap-2">
      <ReconcileActionIcon
        onRetry={onReconcile}
        spinning={spinning}
        retrying={reconciling}
        title={title}
      />
      <span className="text-sm text-gray-300">{label}</span>
    </span>
  );
};
