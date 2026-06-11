const GROUP_ID_KEYS = ["id", "groupId", "uuid", "sub"] as const;

const GROUP_NAME_KEYS = ["name", "groupName", "displayName"] as const;

export function unwrapGroupRecord(
  raw: Record<string, unknown>,
): Record<string, unknown> {
  if (raw.group && typeof raw.group === "object") {
    return raw.group as Record<string, unknown>;
  }
  return raw;
}

function normalizeGroupId(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

export function resolveGroupId(record: Record<string, unknown>): string | null {
  for (const key of GROUP_ID_KEYS) {
    const id = normalizeGroupId(record[key]);
    if (id) {
      return id;
    }
  }
  return null;
}

export function resolveGroupName(record: Record<string, unknown>): string | null {
  for (const key of GROUP_NAME_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}
