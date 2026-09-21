export type MicroserviceKnowledgeItemDraft = {
  name: string;
};

export type MicroserviceKnowledgeDraft = {
  bindPath: string;
  permissions: "ro" | "rw";
  items: MicroserviceKnowledgeItemDraft[];
};

export type MicroserviceKnowledgeCatalog = {
  bindPath?: string | null;
  permissions?: string | null;
  items?: Array<{ name?: string } | string> | null;
};

export type MicroserviceKnowledgePatchBody = {
  bindPath?: string;
  permissions: "ro" | "rw";
  items: Array<{ name: string }>;
};

export type KnowledgeVolumeMapping = {
  containerDestination?: string | null;
};

export type KnowledgeTmpfsMount = {
  containerPath?: string | null;
};

export type KnowledgeCatalogNeighbors = {
  models?: MicroserviceKnowledgeCatalog | null;
  volumeMappings?: KnowledgeVolumeMapping[] | null;
  tmpfs?: Array<KnowledgeTmpfsMount | string> | null;
};

export const KNOWLEDGE_REBUILD_HINT =
  "Changing bind path, permissions, or going empty↔non-empty rebuilds the container. Adding or removing knowledge items with the same bind path and permissions does not when the catalog is already non-empty.";

const BIND_PATH_REQUIRED =
  "Bind path is required when knowledge items are listed.";

const MODELS_BIND_COLLISION =
  "Knowledge bind path collides with the AI Models catalog path.";

export function catalogToDraft(
  catalog: MicroserviceKnowledgeCatalog | null | undefined,
): MicroserviceKnowledgeDraft {
  const items = Array.isArray(catalog?.items)
    ? catalog.items.map((item) => ({
        name: typeof item === "string" ? item : (item?.name ?? ""),
      }))
    : [];

  return {
    bindPath: catalog?.bindPath ?? "",
    permissions: catalog?.permissions === "rw" ? "rw" : "ro",
    items: items.length > 0 ? items : [{ name: "" }],
  };
}

function namedItems(
  items: MicroserviceKnowledgeDraft["items"] | MicroserviceKnowledgeCatalog["items"],
): string[] {
  if (!Array.isArray(items)) {
    return [];
  }
  return items
    .map((item) =>
      (typeof item === "string" ? item : (item?.name ?? "")).trim(),
    )
    .filter((name) => name !== "");
}

/** A container path and the same path with a trailing slash are one destination. */
function normalizeContainerPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") {
    return trimmed === "/" ? "/" : "";
  }
  return trimmed.replace(/\/+$/, "");
}

function sameContainerPath(left: string, right: string): boolean {
  const a = normalizeContainerPath(left);
  const b = normalizeContainerPath(right);
  return a !== "" && a === b;
}

function projectedItemPath(bindPath: string, name: string): string {
  const base = normalizeContainerPath(bindPath);
  const item = name.trim().replace(/^\/+|\/+$/g, "");
  if (!base || !item) {
    return "";
  }
  if (base === "/") {
    return `/${item}`;
  }
  return `${base}/${item}`;
}

function modelItemPaths(
  models: MicroserviceKnowledgeCatalog | null | undefined,
): Array<{ name: string; path: string }> {
  const bindPath = (models?.bindPath ?? "").trim();
  if (!bindPath) {
    return [];
  }
  return namedItems(models?.items).map((name) => ({
    name,
    path: projectedItemPath(bindPath, name),
  }));
}

function volumeDestinations(
  volumeMappings: KnowledgeVolumeMapping[] | null | undefined,
): string[] {
  if (!Array.isArray(volumeMappings)) {
    return [];
  }
  return volumeMappings
    .map((volume) => (volume?.containerDestination ?? "").trim())
    .filter((destination) => destination !== "");
}

function tmpfsDestinations(
  tmpfs: KnowledgeCatalogNeighbors["tmpfs"],
): string[] {
  if (!Array.isArray(tmpfs)) {
    return [];
  }
  return tmpfs
    .map((mount) =>
      (typeof mount === "string" ? mount : (mount?.containerPath ?? "")).trim(),
    )
    .filter((destination) => destination !== "");
}

function knowledgeCatalogCollision(
  bindPath: string,
  items: string[],
  neighbors: KnowledgeCatalogNeighbors | undefined,
): string | null {
  if (!neighbors) {
    return null;
  }

  const modelsBindPath = (neighbors.models?.bindPath ?? "").trim();
  const modelsHaveItems = namedItems(neighbors.models?.items).length > 0;
  if (
    bindPath &&
    modelsBindPath &&
    sameContainerPath(bindPath, modelsBindPath) &&
    (items.length > 0 || modelsHaveItems)
  ) {
    return MODELS_BIND_COLLISION;
  }

  if (!bindPath || items.length === 0) {
    return null;
  }

  for (const destination of volumeDestinations(neighbors.volumeMappings)) {
    if (sameContainerPath(bindPath, destination)) {
      return `Knowledge bind path ${bindPath} collides with volume ${destination}.`;
    }
  }

  for (const destination of tmpfsDestinations(neighbors.tmpfs)) {
    if (sameContainerPath(bindPath, destination)) {
      return `Knowledge bind path ${bindPath} collides with tmpfs ${destination}.`;
    }
  }

  for (const model of modelItemPaths(neighbors.models)) {
    if (model.path && sameContainerPath(bindPath, model.path)) {
      return `Knowledge bind path ${bindPath} collides with AI model ${model.name} at ${model.path}.`;
    }
  }

  for (const name of items) {
    const projected = projectedItemPath(bindPath, name);
    if (!projected) {
      continue;
    }

    for (const destination of volumeDestinations(neighbors.volumeMappings)) {
      if (sameContainerPath(projected, destination)) {
        return `Knowledge item ${name} at ${projected} collides with volume ${destination}.`;
      }
    }

    for (const destination of tmpfsDestinations(neighbors.tmpfs)) {
      if (sameContainerPath(projected, destination)) {
        return `Knowledge item ${name} at ${projected} collides with tmpfs ${destination}.`;
      }
    }

    if (modelsBindPath && sameContainerPath(projected, modelsBindPath)) {
      return `Knowledge item ${name} at ${projected} collides with the AI Models catalog path.`;
    }

    for (const model of modelItemPaths(neighbors.models)) {
      if (model.path && sameContainerPath(projected, model.path)) {
        return `Knowledge item ${name} at ${projected} collides with AI model ${model.name} at ${model.path}.`;
      }
    }
  }

  return null;
}

export function buildMicroserviceKnowledgePatch(
  draft: MicroserviceKnowledgeDraft,
  neighbors?: KnowledgeCatalogNeighbors,
):
  | { ok: true; body: MicroserviceKnowledgePatchBody }
  | { ok: false; error: string } {
  const items = namedItems(draft.items);
  const bindPath = (draft.bindPath || "").trim();
  const permissions = draft.permissions === "rw" ? "rw" : "ro";

  if (items.length > 0 && !bindPath) {
    return { ok: false, error: BIND_PATH_REQUIRED };
  }

  const collision = knowledgeCatalogCollision(bindPath, items, neighbors);
  if (collision) {
    return { ok: false, error: collision };
  }

  const body: MicroserviceKnowledgePatchBody = {
    permissions,
    items: items.map((name) => ({ name })),
  };
  if (bindPath) {
    body.bindPath = bindPath;
  }
  return { ok: true, body };
}
