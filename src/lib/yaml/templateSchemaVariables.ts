export type TemplateSchemaVariable = {
  key: string;
  description?: string;
  defaultValue?: unknown;
};

const isMissingDefault = (value: unknown) =>
  value === undefined || value === null;

const hasOwn = (entry: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(entry, key);

const pickDefaultValue = (entry: Record<string, unknown>): unknown => {
  if (!isMissingDefault(entry.defaultValue)) {
    return entry.defaultValue;
  }
  if (!isMissingDefault(entry["default-value"])) {
    return entry["default-value"];
  }
  if (!isMissingDefault(entry.default)) {
    return entry.default;
  }
  const hasDefaultKey =
    hasOwn(entry, "defaultValue") ||
    hasOwn(entry, "default-value") ||
    hasOwn(entry, "default");
  if (!hasDefaultKey && !isMissingDefault(entry.value) && entry.value !== "") {
    return entry.value;
  }
  return undefined;
};

const toSchemaVariable = (
  key: string,
  raw: unknown,
): TemplateSchemaVariable | null => {
  if (!key) {
    return null;
  }

  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) {
    const entry = raw as Record<string, unknown>;
    const variable: TemplateSchemaVariable = { key };
    if (entry.description != null && entry.description !== "") {
      variable.description = String(entry.description);
    }
    const defaultValue = pickDefaultValue(entry);
    if (!isMissingDefault(defaultValue)) {
      variable.defaultValue = defaultValue;
    }
    return variable;
  }

  const variable: TemplateSchemaVariable = { key };
  if (!isMissingDefault(raw) && raw !== "") {
    variable.defaultValue = raw;
  }
  return variable;
};

/** Normalize ApplicationTemplate / MicroserviceTemplate spec.variables for the JSON API. */
export const normalizeTemplateSchemaVariables = (
  variables: unknown,
): TemplateSchemaVariable[] | undefined => {
  if (variables == null) {
    return undefined;
  }

  if (Array.isArray(variables)) {
    return variables
      .map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return null;
        }
        const entry = item as Record<string, unknown>;
        if (entry.key == null || entry.key === "") {
          return null;
        }
        return toSchemaVariable(String(entry.key), entry);
      })
      .filter((item): item is TemplateSchemaVariable => item != null);
  }

  if (typeof variables === "object") {
    return Object.entries(variables as Record<string, unknown>)
      .map(([key, raw]) => toSchemaVariable(key, raw))
      .filter((item): item is TemplateSchemaVariable => item != null);
  }

  return undefined;
};

export const dumpTemplateSchemaVariables = (
  variables: unknown,
): TemplateSchemaVariable[] | undefined => {
  const normalized = normalizeTemplateSchemaVariables(variables);
  if (normalized == null) {
    return undefined;
  }
  return normalized.map((variable) => {
    const dumped: TemplateSchemaVariable = { key: variable.key };
    if (variable.description != null && variable.description !== "") {
      dumped.description = variable.description;
    }
    if (!isMissingDefault(variable.defaultValue)) {
      dumped.defaultValue = variable.defaultValue;
    }
    return dumped;
  });
};
