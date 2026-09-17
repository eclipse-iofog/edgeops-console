/**
 * Controller may return nested fog status fields as JSON strings
 * (runtime classes, CDI devices, model status) or as already-parsed values.
 */
export function parseJsonField(value: unknown): unknown {
  if (value == null || value === "") {
    return [];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed == null) {
        return [];
      }
      return parsed;
    } catch {
      return [];
    }
  }

  if (typeof value === "object") {
    return value;
  }

  return [];
}

export function parseJsonArray(value: unknown): unknown[] {
  const parsed = parseJsonField(value);
  return Array.isArray(parsed) ? parsed : [];
}
