import { theme } from "../../Theme/ThemeProvider";

import {
  Play as PlayIcon,
  StopCircle as StopIcon,
  RotateCcw as RestartIcon,
  ArrowRight as DetailsIcon,
  Trash2 as DeleteIcon,
  Code as CodeIcon,
  RotateCcw as SettingsBackupRestoreIcon,
  RotateCcw as ReplayIcon,
} from "lucide-react";

import _prettyBytes from "pretty-bytes";
import {
  statusColor as _statusColor,
  msvcStatusColor as _msvcStatusColor,
} from "@/lib/Status";

export const statusColor = _statusColor;
export const msvcStatusColor = _msvcStatusColor;

export const tagColor = theme.colors.neutral_3;

export const dateFormat = "YYYY/MM/DD hh:mm:ss a";
export const MiBFactor = 1048576;

export const architectures = {
  0: "auto",
  1: "amd64",
  2: "arm64",
  3: "riscv64",
  4: "arm",
};

export const formatArchitectureLabel = (agent) => {
  if (agent?.arch?.name) {
    return agent.arch.name;
  }
  const archId = agent?.archId;
  if (archId !== undefined && archId !== null) {
    return architectures[archId] ?? "N/A";
  }
  return "N/A";
};

export const icons = {
  PlayIcon,
  StopIcon,
  RestartIcon,
  DetailsIcon,
  DeleteIcon,
  CodeIcon,
  SettingsBackupRestoreIcon,
  ReplayIcon,
};

export const colors = theme.colors;

export const prettyBytes = (number) => {
  if (typeof number !== typeof 42) {
    return _prettyBytes(0);
  }
  return _prettyBytes(number);
};

export function getTextColor(bgColor) {
  const whiteTextColors = [
    "#16A34A",
    "#EF4444",
    "#DC2626",
    "#3B82F6",
    "#7A3BFF",
  ];
  return whiteTextColors.includes(bgColor) ? "white" : "black";
}
