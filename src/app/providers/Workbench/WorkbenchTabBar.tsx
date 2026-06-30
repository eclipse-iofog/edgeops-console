import { X } from "lucide-react";

import { useWorkbench } from "./useWorkbench";

export default function WorkbenchTabBar() {
  const { tabs, activeTabId, previewTabId, focusTab, closeTab } = useWorkbench();

  if (tabs.length === 0) {
    return null;
  }

  return (
    <div
      className="mb-4 border-b border-gray-700"
      role="tablist"
      aria-label="Workbench tabs"
    >
      <div
        className="flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="flex items-center gap-1 pb-0">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const isPreview = !tab.pinned && tab.id === previewTabId;

            return (
              <div
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                className={[
                  "group flex max-w-[220px] items-center gap-2 rounded-t-md px-3 py-2 text-sm transition-colors flex-shrink-0 cursor-pointer",
                  isActive
                    ? "bg-gray-800 text-white border-b-2 border-yellow-400"
                    : "bg-gray-800/60 text-gray-300 hover:bg-gray-800 hover:text-white",
                ].join(" ")}
                onClick={() => focusTab(tab.id)}
              >
                <span
                  className={[
                    "truncate",
                    isPreview ? "italic text-gray-400" : "font-medium",
                  ].join(" ")}
                >
                  {tab.title}
                </span>
                <button
                  type="button"
                  aria-label={`Close ${tab.title}`}
                  className={[
                    "rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white",
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                  ].join(" ")}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeTab(tab.id);
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
