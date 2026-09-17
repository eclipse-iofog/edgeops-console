import { format, formatDistanceToNow } from "date-fns";
import { prettyBytes } from "@/lib/formatting";
import { parseJsonArray } from "@/lib/parseJsonField";

export const AGENT_PRUNE_CONFIRM_MESSAGE =
  "This action will permanently delete unused container images and unused local AI models from the selected agent. Images not associated with a running microservice will be removed. Fleet (managed) models are not removed by prune. Make sure all necessary images and local models are in use before proceeding.\n \nThis is not reversible!";

export function isManagedModelSource(source: unknown): boolean {
  return String(source ?? "").toLowerCase() === "managed";
}

export function displayFogValue(value: unknown): string {
  if (value == null || value === "") {
    return "N/A";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

export function formatUnixSeconds(value: unknown): string {
  if (value == null || value === "") {
    return "N/A";
  }
  const seconds = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(seconds) || seconds === 0) {
    return "N/A";
  }
  const date = new Date(seconds * 1000);
  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }
  return `${formatDistanceToNow(date, { addSuffix: true })} (${format(date, "PPpp")})`;
}

export function formatTotalBytes(value: unknown): string {
  if (value == null || value === "") {
    return "N/A";
  }
  const bytes = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(bytes)) {
    return "N/A";
  }
  return prettyBytes(bytes);
}

export function displayActiveModels(value: unknown): string {
  if (value == null || value === "") {
    return "N/A";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return "N/A";
  }
  return String(parsed);
}

export function parseRuntimeClassRows(value: unknown): Array<{
  name?: string;
  handler?: string;
  source?: string;
}> {
  return parseJsonArray(value).filter(
    (row): row is Record<string, unknown> =>
      row != null && typeof row === "object" && !Array.isArray(row),
  ) as Array<{ name?: string; handler?: string; source?: string }>;
}

export function parseModelStatusRows(value: unknown): Array<{
  name?: string;
  uuid?: string;
  source?: string;
  state?: string;
  digest?: string;
  resolvedRevision?: string;
  revisionFloating?: boolean;
  totalBytes?: number;
  lastError?: string;
}> {
  return parseJsonArray(value).filter(
    (row): row is Record<string, unknown> =>
      row != null && typeof row === "object" && !Array.isArray(row),
  ) as Array<{
    name?: string;
    uuid?: string;
    source?: string;
    state?: string;
    digest?: string;
    resolvedRevision?: string;
    revisionFloating?: boolean;
    totalBytes?: number;
    lastError?: string;
  }>;
}

export function parseCdiDeviceNames(value: unknown): string[] {
  return parseJsonArray(value)
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }
      if (item && typeof item === "object" && "name" in item) {
        return String((item as { name?: unknown }).name ?? "");
      }
      return String(item ?? "");
    })
    .filter((name) => name !== "");
}
