import React, { useEffect, useMemo, useState } from "react";
import ResourceLink from "@/components/ui/ResourceLink";
import {
  findRegistryById,
  isOciImageRegistry,
  ociImageRegistries,
} from "@/lib/registryCa";

type Registry = {
  id?: string | number | null;
  url?: string;
  type?: string | null;
};

type Props = {
  registryId: string | number | null | undefined;
  registries: Registry[];
  onSave: (registryId: string | number) => void | Promise<void>;
  saving?: boolean;
};

export default function CatalogImageRegistryPicker({
  registryId,
  registries,
  onSave,
  saving = false,
}: Props) {
  const [selectedId, setSelectedId] = useState(
    registryId != null && registryId !== "" ? String(registryId) : "",
  );

  useEffect(() => {
    const next =
      registryId != null && registryId !== "" ? String(registryId) : "";
    const oci = ociImageRegistries(registries);
    if (oci.length === 0) {
      setSelectedId(next);
      return;
    }
    setSelectedId(
      oci.some((registry) => String(registry.id) === next) ? next : "",
    );
  }, [registryId, registries]);

  const options = useMemo(() => ociImageRegistries(registries), [registries]);

  const currentIsOci = isOciImageRegistry(
    findRegistryById(registries, selectedId || registryId),
  );

  return (
    <div className="space-y-2">
      <select
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
        className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
      >
        <option value="">Select an image registry</option>
        {options.map((registry) => (
          <option key={String(registry.id)} value={String(registry.id)}>
            {registry.url || registry.id}
          </option>
        ))}
      </select>
      {selectedId ? (
        <ResourceLink
          path="/config/Registries"
          query={{ registryId: selectedId }}
        >
          {selectedId}
        </ResourceLink>
      ) : (
        <span className="text-gray-400">N/A</span>
      )}
      <button
        type="button"
        disabled={saving || !selectedId || !currentIsOci}
        onClick={() => onSave(selectedId)}
        className="px-3 py-1.5 text-sm rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save registry"}
      </button>
    </div>
  );
}
