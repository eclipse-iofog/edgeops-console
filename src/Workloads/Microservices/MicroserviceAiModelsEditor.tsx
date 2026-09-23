import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import ResourceLink from "@/components/ui/ResourceLink";
import {
  buildMicroserviceModelsPatch,
  catalogToDraft,
  MODELS_REBUILD_HINT,
  type MicroserviceModelsCatalog,
  type MicroserviceModelsDraft,
} from "./microserviceModelsPatch";

type FleetModel = {
  name: string;
};

type Props = {
  uuid: string;
  catalog: MicroserviceModelsCatalog | null | undefined;
  models: FleetModel[];
  request: (path: string, options?: RequestInit) => Promise<any>;
  pushFeedback: (feedback: { message: string; type: "success" | "error" }) => void;
  onSaved: () => void | Promise<void>;
};

const inputClassName =
  "w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-white";

export default function MicroserviceAiModelsEditor({
  uuid,
  catalog,
  models,
  request,
  pushFeedback,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState<MicroserviceModelsDraft>(() =>
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

  const modelOptions = useMemo(() => {
    const names = new Set(
      (models ?? []).map((model) => model.name).filter(Boolean),
    );
    for (const item of draft.items) {
      if (item.name) {
        names.add(item.name);
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [models, draft.items]);

  const updateDraft = (next: MicroserviceModelsDraft) => {
    setDraft(next);
    setDirty(true);
  };

  const handleSave = async () => {
    const result = buildMicroserviceModelsPatch(draft);
    if (!result.ok) {
      pushFeedback({ message: result.error, type: "error" });
      return;
    }

    setSaving(true);
    try {
      const res = await request(`/api/v3/microservices/${uuid}/models`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.body),
      });
      if (!res?.ok) {
        pushFeedback({
          message: res?.message || "Failed to update AI Model Catalog",
          type: "error",
        });
        return;
      }
      pushFeedback({ message: "AI Model Catalog updated", type: "success" });
      setDirty(false);
      await onSaved();
    } catch (error: any) {
      pushFeedback({
        message: error?.message || "Failed to update AI Model Catalog",
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
          placeholder="/models"
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
          <label className="block text-xs text-gray-400">Models</label>
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
              <option value="">Select a model</option>
              {modelOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            {item.name ? (
              <ResourceLink
                path="/config/Models"
                query={{ modelName: item.name }}
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
              title="Remove model"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">{MODELS_REBUILD_HINT}</p>
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
