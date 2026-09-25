import { format, formatDistanceToNow } from "date-fns";

export type MicroserviceCrashStatus = {
  errorMessage: string;
  lastError: string;
  lastErrorAt: number;
  restartCount: number;
};

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function readMicroserviceCrashStatus(
  status: unknown,
): MicroserviceCrashStatus {
  const source =
    status && typeof status === "object"
      ? (status as Record<string, unknown>)
      : {};
  return {
    errorMessage: asText(source.errorMessage ?? ""),
    lastError: asText(source.lastError ?? ""),
    lastErrorAt: asNumber(source.lastErrorAt ?? 0),
    restartCount: asNumber(source.restartCount ?? 0),
  };
}

export function shouldShowCurrentError(
  crash: MicroserviceCrashStatus,
): boolean {
  return crash.errorMessage !== "";
}

export function shouldShowLastCrash(crash: MicroserviceCrashStatus): boolean {
  return crash.lastError !== "";
}

export function shouldShowRestartCount(
  crash: MicroserviceCrashStatus,
): boolean {
  return crash.restartCount > 0 || crash.lastError !== "";
}

export function formatLastErrorAt(lastErrorAt: number): string | null {
  if (!Number.isFinite(lastErrorAt) || lastErrorAt <= 0) {
    return null;
  }
  const date = new Date(lastErrorAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return `${formatDistanceToNow(date, { addSuffix: true })} (${format(date, "PPpp")})`;
}
