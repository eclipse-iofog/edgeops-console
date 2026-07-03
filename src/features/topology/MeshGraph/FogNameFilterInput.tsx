import React, { useState } from "react";
import { X } from "lucide-react";

import { addFogNameBadge } from "@/lib/networkTopology/filters";

type FogNameFilterInputProps = {
  fogNames: string[];
  onChange: (fogNames: string[]) => void;
};

function commitTokens(
  fogNames: string[],
  raw: string,
  onChange: (fogNames: string[]) => void,
): string {
  const parts = raw.split(/[,;\s]+/).filter(Boolean);
  if (parts.length === 0) {
    return raw.trim() ? raw : "";
  }

  let next = fogNames;
  for (const part of parts) {
    next = addFogNameBadge(next, part);
  }
  onChange(next);
  return "";
}

export default function FogNameFilterInput({
  fogNames,
  onChange,
}: FogNameFilterInputProps) {
  const [draft, setDraft] = useState("");

  const removeFogName = (name: string) => {
    onChange(fogNames.filter((item) => item !== name));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const remainder = commitTokens(fogNames, draft, onChange);
      setDraft(remainder);
      return;
    }

    if (
      event.key === "Backspace" &&
      draft.length === 0 &&
      fogNames.length > 0
    ) {
      onChange(fogNames.slice(0, -1));
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (/[,;\s]/.test(value)) {
      const remainder = commitTokens(fogNames, value, onChange);
      setDraft(remainder);
      return;
    }
    setDraft(value);
  };

  const handleBlur = () => {
    if (draft.trim()) {
      const remainder = commitTokens(fogNames, draft, onChange);
      setDraft(remainder);
    }
  };

  return (
    <div className="flex min-w-[240px] max-w-lg flex-1 flex-wrap items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-800 px-2 py-1.5 focus-within:border-cyan-500">
      {fogNames.map((name) => (
        <span
          key={name}
          className="inline-flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-500/15 px-2 py-0.5 text-xs text-cyan-100"
        >
          {name}
          <button
            type="button"
            aria-label={`Remove ${name} filter`}
            className="rounded-full p-0.5 text-cyan-200/80 hover:bg-cyan-500/20 hover:text-white"
            onClick={() => removeFogName(name)}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={
          fogNames.length === 0 ? "Type fog name, press Space or Enter…" : ""
        }
        className="min-w-[140px] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm text-white placeholder:text-gray-500 focus:outline-none"
      />
    </div>
  );
}
