import lget from "lodash/get";

export function sanitizeRoleRules(rules: unknown[]): Record<string, unknown>[] {
  if (!Array.isArray(rules)) {
    return [];
  }
  return rules.map((rule) => {
    if (!rule || typeof rule !== "object") {
      return {};
    }
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rule)) {
      if (value !== null && value !== undefined) {
        out[key] = value;
      }
    }
    return out;
  });
}

export function sanitizeRolePayload(role: {
  name: string;
  kind?: string;
  rules?: unknown[];
}): { name: string; kind?: string; rules: Record<string, unknown>[] } {
  return {
    name: role.name,
    kind: role.kind,
    rules: sanitizeRoleRules(role.rules ?? []),
  };
}

/** Strip null rule fields from Controller JSON (flat or nested { role }). */
export function normalizeRoleFromApi(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") {
    return raw;
  }
  const record = raw as Record<string, unknown>;

  if (record.role && typeof record.role === "object") {
    const inner = record.role as Record<string, unknown>;
    return {
      ...record,
      role: {
        ...inner,
        rules: sanitizeRoleRules(
          Array.isArray(inner.rules) ? inner.rules : [],
        ),
      },
    };
  }

  if (typeof record.name === "string") {
    return {
      ...record,
      rules: sanitizeRoleRules(
        Array.isArray(record.rules) ? record.rules : [],
      ),
    };
  }

  return raw;
}

export const parseRole = async (doc: any): Promise<[any, string | null]> => {
  if (!doc) {
    return [null, "Invalid YAML: Document is empty or null"];
  }

  if (doc.kind !== "Role") {
    return [null, `Invalid kind ${doc.kind}, expected Role`];
  }

  if (!doc.metadata) {
    return [null, "Invalid YAML format: metadata is required"];
  }

  const name = lget(doc, "metadata.name");
  if (!name) {
    return [null, "Invalid YAML format (missing metadata.name)"];
  }

  const kind = doc.kind;
  const rules = doc.rules || [];

  // Validate rules structure
  if (Array.isArray(rules)) {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (!rule.apiGroups || !Array.isArray(rule.apiGroups)) {
        return [null, `Invalid rule at index ${i}: apiGroups must be an array`];
      }
      if (!rule.resources || !Array.isArray(rule.resources)) {
        return [null, `Invalid rule at index ${i}: resources must be an array`];
      }
      if (!rule.verbs || !Array.isArray(rule.verbs)) {
        return [null, `Invalid rule at index ${i}: verbs must be an array`];
      }
      // Validate verbs enum
      const validVerbs = [
        "get",
        "list",
        "create",
        "update",
        "patch",
        "delete",
        "*",
      ];
      for (const verb of rule.verbs) {
        if (!validVerbs.includes(verb)) {
          return [
            null,
            `Invalid verb "${verb}" in rule at index ${i}. Allowed values are: ${validVerbs.join(", ")}`,
          ];
        }
      }
    }
  } else {
    return [null, "Rules must be an array"];
  }

  const apiObject = sanitizeRolePayload({
    name: name,
    kind: kind,
    rules: rules,
  });

  return [apiObject, null];
};
