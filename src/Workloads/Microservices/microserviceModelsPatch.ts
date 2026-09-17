export type MicroserviceModelItemDraft = {
  name: string;
};

export type MicroserviceModelsDraft = {
  bindPath: string;
  permissions: "ro" | "rw";
  items: MicroserviceModelItemDraft[];
};

export type MicroserviceModelsCatalog = {
  bindPath?: string | null;
  permissions?: string | null;
  items?: Array<{ name?: string } | string> | null;
};

export type MicroserviceModelsPatchBody = {
  bindPath?: string;
  permissions: "ro" | "rw";
  items: Array<{ name: string }>;
};

export const MODELS_REBUILD_HINT =
  "Changing bind path, permissions, or going empty↔non-empty rebuilds the container. Adding or removing models with the same bind path and permissions does not when the catalog is already non-empty.";

export function catalogToDraft(
  catalog: MicroserviceModelsCatalog | null | undefined,
): MicroserviceModelsDraft {
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

export function buildMicroserviceModelsPatch(
  draft: MicroserviceModelsDraft,
):
  | { ok: true; body: MicroserviceModelsPatchBody }
  | { ok: false; error: string } {
  const items = draft.items
    .map((item) => ({ name: (item.name || "").trim() }))
    .filter((item) => item.name !== "");
  const bindPath = (draft.bindPath || "").trim();
  const permissions = draft.permissions === "rw" ? "rw" : "ro";

  if (items.length > 0 && !bindPath) {
    return {
      ok: false,
      error: "Bind path is required when models are listed.",
    };
  }

  const body: MicroserviceModelsPatchBody = {
    permissions,
    items,
  };
  if (bindPath) {
    body.bindPath = bindPath;
  }
  return { ok: true, body };
}
