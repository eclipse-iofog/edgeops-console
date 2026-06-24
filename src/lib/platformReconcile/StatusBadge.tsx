import React from "react";
import { Info } from "lucide-react";
import { getTextColor } from "@/lib/formatting";
import { PlatformPhaseColor, ProvisioningStatusColor } from "./colors";
import type { PlatformPhase, ProvisioningStatus } from "./types";
import {
  HUB_READY_TOOLTIP,
  PLATFORM_PHASE_TOOLTIPS,
  PROVISIONING_STATUS_TOOLTIPS,
} from "./types";

type StatusBadgeProps = {
  label: string;
  color: string;
  title?: string;
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  color,
  title,
}) => {
  const textColor = getTextColor(color);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: color, color: textColor }}
      title={title}
    >
      {label}
    </span>
  );
};

export const PlatformStatusBadge: React.FC<{
  phase?: PlatformPhase | string;
}> = ({ phase }) => {
  if (!phase) return null;
  const color = PlatformPhaseColor[phase as PlatformPhase] ?? "#9CA3AF";
  const title =
    PLATFORM_PHASE_TOOLTIPS[phase as PlatformPhase] ?? "Platform setup status";
  return <StatusBadge label={phase} color={color} title={title} />;
};

export const ProvisioningStatusBadge: React.FC<{
  status?: ProvisioningStatus | string;
  showHubTooltip?: boolean;
}> = ({ status, showHubTooltip = true }) => {
  if (!status) return null;
  const color =
    ProvisioningStatusColor[status as ProvisioningStatus] ?? "#9CA3AF";
  const title =
    PROVISIONING_STATUS_TOOLTIPS[status as ProvisioningStatus] ??
    "Hub provisioning status";

  return (
    <span className="inline-flex items-center gap-1">
      <StatusBadge
        label={status}
        color={color}
        title={status === "ready" && showHubTooltip ? undefined : title}
      />
      {status === "ready" && showHubTooltip && (
        <span title={HUB_READY_TOOLTIP} aria-label={HUB_READY_TOOLTIP}>
          <Info size={14} className="text-gray-400 shrink-0" />
        </span>
      )}
    </span>
  );
};
