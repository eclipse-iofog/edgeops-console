import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import ResourceLink from "@/components/ui/ResourceLink";
import {
  buildMicroserviceKnowledgePatch,
  catalogToDraft,
  KNOWLEDGE_REBUILD_HINT,
  type KnowledgeCatalogNeighbors,
  type MicroserviceKnowledgeCatalog,
  type MicroserviceKnowledgeDraft,
} from "./microserviceKnowledgePatch";

type FleetKnowledge = {
  name: string;
};

type Props = {
  uuid: string;
  catalog: MicroserviceKnowledgeCatalog | null | undefined;
  knowledge: FleetKnowledge[];
  neighbors: KnowledgeCatalogNeighbors;
  request: (path: string, options?: RequestInit) => Promise<any>;
  pushFeedback: (feedback: { message: string; type: "success" | "error" }) => void;
  onSaved: () => void | Promise<void>;
};

const inputClassName =
  "w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-white";

function knowledgeSaveError(res: unknown): string {
  const fallback = "Failed to update AI Knowledge Catalog";
  if (!res || typeof res !== "object") {
    return fallback;
  }
  const body = { ...(res as Record<string, unknown>) };
  if (typeof body.message === "string" && body.message.trim()) {
    return body.message;
  }
  delete body.ok;
  delete body.status;
  delete body.statusText;
  const extra = JSON.stringify(body);
  return extra && extra !== "{}" ? extra : fallback;
}

export default function MicroserviceKnowledgeEditor({
  uuid,
  catalog,
  knowledge,
  neighbors,
  request,
  pushFeedback,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState<MicroserviceKnowledgeDraft>(() =>
    catalogToDraft(catalog),
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(catalogToDraft(catalog));
    setDirty(false);
    // Reset only when switching microservices; poll updates sync when not dirty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uuid]);

  useEffect(() => {
    if (!dirty) {
      setDraft(catalogToDraft(catalog));
    }
  }, [catalog, dirty]);

  const knowledgeOptions = useMemo(() => {
    const names = new Set(
      (knowledge ?? []).map((item) => item.name).filter(Boolean),
    );
    for (const item of draft.items) {
      if (item.name) {
        names.add(item.name);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [knowledge, draft.items]);

  const updateDraft = (next: MicroserviceKnowledgeDraft) => {
    setDraft(next);
    setDirty(true);
  };

  const handleSave = async () => {
    const result = buildMicroserviceKnowledgePatch(draft, neighbors);
    if (!result.ok) {
      pushFeedback({ message: result.error, type: "error" });
      return;
    }

    setSaving(true);
    try {
      const res = await request(`/api/v3/microservices/${uuid}/knowledge`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.body),
      });
      if (!res?.ok) {
        pushFeedback({
          message: knowledgeSaveError(res),
          type: "error",
        });
        return;
      }
      pushFeedback({ message: "AI Knowledge Catalog updated", type: "success" });
      setDirty(false);
      await onSaved();
    } catch (error: any) {
      pushFeedback({
        message: error?.message || "Failed to update AI Knowledge Catalog",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">Bind path</label>
        <input
          type="text"
          value={draft.bindPath}
          onChange={(event) =>
            updateDraft({ ...draft, bindPath: event.target.value })
          }
          placeholder="/knowledge"
          className={inputClassName}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">Permissions</label>
        <select
          value={draft.permissions}
          onChange={(event) =>
            updateDraft({
              ...draft,
              permissions: event.target.value === "rw" ? "rw" : "ro",
            })
          }
          className={inputClassName}
        >
          <option value="ro">ro</option>
          <option value="rw">rw</option>
        </select>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs text-gray-400">Knowledge</label>
          <button
            type="button"
            onClick={() =>
              updateDraft({
                ...draft,
                items: [...draft.items, { name: "" }],
              })
            }
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
          >
            <Plus size={14} />
            Add
          </button>
        </div>
        {draft.items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <select
              value={item.name}
              onChange={(event) => {
                const items = draft.items.map((row, rowIndex) =>
                  rowIndex === index ? { name: event.target.value } : row,
                );
                updateDraft({ ...draft, items });
              }}
              className={`${inputClassName} min-w-0 flex-1`}
            >
              <option value="">Select knowledge</option>
              {knowledgeOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {item.name ? (
              <ResourceLink
                path="/config/Knowledge"
                query={{ knowledgeName: item.name }}
              >
                {item.name}
              </ResourceLink>
            ) : (
              <span className="text-gray-500 text-xs shrink-0">—</span>
            )}
            <button
              type="button"
              onClick={() => {
                const items = draft.items.filter(
                  (_row, rowIndex) => rowIndex !== index,
                );
                updateDraft({
                  ...draft,
                  items: items.length > 0 ? items : [{ name: "" }],
                });
              }}
              className="hover:text-red-500 shrink-0"
              title="Remove knowledge"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">{KNOWLEDGE_REBUILD_HINT}</p>
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="px-3 py-1.5 text-sm rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
