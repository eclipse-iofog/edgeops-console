import React from "react";
import { RefreshCw } from "lucide-react";

type ReconcileActionIconProps = {
  onRetry: () => void;
  spinning?: boolean;
  retrying?: boolean;
  title?: string;
};

const ReconcileActionIcon: React.FC<ReconcileActionIconProps> = ({
  onRetry,
  spinning = false,
  retrying = false,
  title = "Sync now",
}) => {
  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={retrying}
      className="inline-flex items-center justify-center rounded p-0.5 text-amber-400 hover:text-amber-300 hover:bg-gray-700/60 disabled:opacity-50"
      title={title}
      aria-label={title}
    >
      <RefreshCw
        size={14}
        className={spinning || retrying ? "animate-spin" : undefined}
      />
    </button>
  );
};

export default ReconcileActionIcon;
