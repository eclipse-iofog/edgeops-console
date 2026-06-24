import React from "react";
import ReconcileActionIcon from "./ReconcileActionIcon";
import { PlatformStatusBadge, ProvisioningStatusBadge } from "./StatusBadge";

type PlatformStatusWithReconcileProps = {
  phase?: string;
  isActive?: boolean;
  onRetry: () => void;
  retrying?: boolean;
};

export const PlatformStatusWithReconcile: React.FC<
  PlatformStatusWithReconcileProps
> = ({ phase, isActive = false, onRetry, retrying }) => {
  return (
    <span className="inline-flex items-center gap-1.5">
      {phase ? <PlatformStatusBadge phase={phase} /> : null}
      <ReconcileActionIcon
        onRetry={onRetry}
        spinning={isActive}
        retrying={retrying}
        title="Re-applies router and NATS platform configuration for this node."
      />
    </span>
  );
};

type ProvisioningStatusWithReconcileProps = {
  status?: string;
  showHubTooltip?: boolean;
  isActive?: boolean;
  onRetry: () => void;
  retrying?: boolean;
};

export const ProvisioningStatusWithReconcile: React.FC<
  ProvisioningStatusWithReconcileProps
> = ({
  status,
  showHubTooltip = true,
  isActive = false,
  onRetry,
  retrying,
}) => {
  return (
    <span className="inline-flex items-center gap-1.5">
      {status ? (
        <ProvisioningStatusBadge status={status} showHubTooltip={showHubTooltip} />
      ) : null}
      <ReconcileActionIcon
        onRetry={onRetry}
        spinning={isActive}
        retrying={retrying}
        title="Re-runs hub connector, listener, and Kubernetes service setup."
      />
    </span>
  );
};
