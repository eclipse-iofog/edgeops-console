import React, { Fragment, useState, useRef, useEffect } from "react";
import { Transition } from "@headlessui/react";
import {
  X as XMarkIcon,
  X as CloseIcon,
  Minus as MinimizeIcon,
  Square as MaximizeIcon,
  Monitor as TerminalIcon,
  FileText as CodeIcon,
  List as ListAltIcon,
} from "lucide-react";

import UnsavedChangesModal from "@/components/ui/UnsavedChangesModal";

type DrawerTab = {
  id: string;
  title: string;
  content: React.ReactNode;
  onClose?: () => void;
};

type ResizableBottomDrawerProps = {
  open: boolean;
  isEdit: boolean;
  onClose: () => void;
  onSave: () => void;
  title?: string;
  children: React.ReactNode;
  showUnsavedChangesModal?: boolean;
  unsavedModalTitle?: string;
  unsavedModalMessage?: string;
  unsavedModalCancelLabel?: string;
  unsavedModalConfirmLabel?: string;
  // Tab support
  tabs?: DrawerTab[];
  activeTabId?: string;
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  // Custom action buttons
  customActions?: React.ReactNode;
  // Left offset to account for sidebar
  leftOffset?: number;
};

const ResizableBottomDrawer = ({
  open,
  isEdit,
  onClose,
  onSave,
  title,
  children,
  showUnsavedChangesModal = true,
  unsavedModalTitle = "Changes Not Saved",
  unsavedModalMessage = "Are you sure you want to exit? All unsaved changes will be lost.",
  unsavedModalCancelLabel = "Stay",
  unsavedModalConfirmLabel = "Exit Anyway",
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  customActions,
  leftOffset = 0,
}: ResizableBottomDrawerProps) => {
  const [height, setHeight] = useState(300);
  const [lastHeight, setLastHeight] = useState(300);
  const [minimized, setMinimized] = useState(false);
  const isResizing = useRef(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Update CSS variable for drawer height
  useEffect(() => {
    if (open) {
      document.documentElement.style.setProperty(
        "--terminal-drawer-height",
        `${height}px`,
      );
    } else {
      document.documentElement.style.setProperty(
        "--terminal-drawer-height",
        "0px",
      );
    }
    return () => {
      if (!open) {
        document.documentElement.style.setProperty(
          "--terminal-drawer-height",
          "0px",
        );
      }
    };
  }, [open, height]);

  const startResizing = () => {
    if (!minimized) isResizing.current = true;
  };

  const stopResizing = () => {
    isResizing.current = false;
  };

  const resize = (e: MouseEvent) => {
    if (isResizing.current) {
      const newHeight = window.innerHeight - e.clientY;
      const clamped = Math.min(
        Math.max(newHeight, 200),
        window.innerHeight - 100,
      );
      setHeight(clamped);
      setLastHeight(clamped);
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, []);

  const handleCloseClick = () => {
    if (isEdit && showUnsavedChangesModal) {
      setShowConfirmModal(true);
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowConfirmModal(false);
    onClose();
  };

  const toggleMinimize = () => {
    if (minimized) {
      setHeight(lastHeight);
      setMinimized(false);
    } else {
      setLastHeight(height);
      setHeight(40);
      setMinimized(true);
    }
  };

  return (
    <>
      <Transition show={open} as={Fragment}>
        <div
          className="fixed inset-0 z-50 pointer-events-none"
          style={{ backgroundColor: "transparent" }}
        >
          <Transition.Child
            as={Fragment}
            enter="transform transition ease-in-out duration-300"
            enterFrom="translate-y-full"
            enterTo="translate-y-0"
            leave="transform transition ease-in-out duration-200"
            leaveFrom="translate-y-0"
            leaveTo="translate-y-full"
          >
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: leftOffset > 0 ? `${leftOffset}px` : "0px",
                width: leftOffset > 0 ? `calc(100% - ${leftOffset}px)` : "100%",
                height: height,
                backgroundColor: "#1f2937",
                zIndex: 51,
                pointerEvents: "auto",
              }}
            >
              <div
                className="text-white flex flex-col h-full"
                style={{
                  height: "100%",
                  width: "100%",
                  borderLeft: leftOffset > 0 ? "1px solid #6b7280" : "none",
                  backgroundColor: "#1f2937",
                  boxShadow:
                    "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                }}
              >
                {!minimized && (
                  <div
                    className="w-full h-3 cursor-row-resize bg-gray-700"
                    onMouseDown={startResizing}
                  />
                )}

                <div className="flex items-center justify-between border-b border-gray-700">
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {tabs && tabs.length > 0 ? (
                      <div
                        className="flex items-center overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
                        style={{ scrollbarWidth: "thin" }}
                      >
                        <div className="flex items-center space-x-1 px-4 py-2">
                          {tabs.map((tab) => (
                            <div
                              key={tab.id}
                              className={`flex items-center px-4 py-2 rounded-t-md cursor-pointer transition-colors flex-shrink-0 ${
                                activeTabId === tab.id
                                  ? "bg-gray-700 text-white border-b-2 border-yellow-400"
                                  : "bg-gray-600 text-gray-300 hover:bg-gray-650"
                              }`}
                              onClick={() => onTabChange?.(tab.id)}
                            >
                              {tab.title.includes("Shell:") ? (
                                <TerminalIcon
                                  className="mr-2 text-yellow-400 flex-shrink-0"
                                  fontSize="small"
                                />
                              ) : tab.title.includes("YAML:") ? (
                                <CodeIcon
                                  className="mr-2 text-blue-400 flex-shrink-0"
                                  fontSize="small"
                                />
                              ) : tab.title.includes("Logs:") ? (
                                <ListAltIcon
                                  className="mr-2 text-green-400 flex-shrink-0"
                                  fontSize="small"
                                />
                              ) : null}
                              <span className="text-sm font-medium whitespace-nowrap">
                                {tab.title}
                              </span>
                              {onTabClose && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTabClose(tab.id);
                                  }}
                                  className="ml-2 text-gray-400 hover:text-white rounded p-0.5 flex-shrink-0"
                                >
                                  <CloseIcon size={18} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <h2 className="text-lg font-medium truncate px-4 py-2">
                        {title || "Details"}
                      </h2>
                    )}
                  </div>
                  <div className="flex gap-2 items-center px-4 py-2 flex-shrink-0 border-l border-gray-700 bg-gray-800">
                    {customActions && (
                      <div className="flex gap-2 items-center mr-2">
                        {customActions}
                      </div>
                    )}

                    <button
                      onClick={toggleMinimize}
                      className="flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 rounded p-1 w-6 h-6"
                    >
                      {minimized ? (
                        <MaximizeIcon size={18} />
                      ) : (
                        <MinimizeIcon size={18} />
                      )}
                    </button>

                    <button
                      onClick={handleCloseClick}
                      className="text-gray-400 hover:text-white hover:bg-gray-700 rounded p-1"
                    >
                      <XMarkIcon size={18} />
                    </button>
                  </div>
                </div>

                {/* Resource Information Bar */}
                {tabs && tabs.length > 0 && activeTabId && !minimized && (
                  <div className="px-4 py-2 bg-gray-800 border-b border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-300">
                          {(() => {
                            const activeTab = tabs.find(
                              (tab) => tab.id === activeTabId,
                            );
                            if (!activeTab) return "";
                            if (activeTab.title?.includes("Shell:")) {
                              const shellTarget = activeTab.title.replace(
                                /^.*Shell:\s*/,
                                "",
                              );
                              return `Shell into ${shellTarget}`;
                            } else if (
                              activeTab.title?.includes(
                                "Application Template Form:",
                              )
                            ) {
                              return `Deploying Application from ${activeTab.title.replace("Application Template Form: ", "")} Template`;
                            } else if (activeTab.title?.includes("YAML:")) {
                              return `Editing ${activeTab.title.replace("YAML: ", "")} YAML`;
                            } else if (activeTab.title?.includes("Logs:")) {
                              const logTarget = activeTab.title.replace(
                                /^.*Logs:\s*/,
                                "",
                              );
                              return `Viewing logs for ${logTarget}`;
                            }
                            return "";
                          })()}
                        </span>
                      </div>
                      {tabs
                        .find((tab) => tab.id === activeTabId)
                        ?.title?.includes("YAML:") &&
                        isEdit && (
                          <button
                            onClick={onSave}
                            className="text-white bg-[#e76467ff] hover:bg-[#d55a5d] rounded px-3 py-1 text-sm font-medium transition-colors"
                          >
                            Save Changes
                          </button>
                        )}
                      {tabs
                        .find((tab) => tab.id === activeTabId)
                        ?.title?.includes("Deploy") &&
                        isEdit && (
                          <button
                            onClick={onSave}
                            className="text-white bg-green-600 hover:bg-green-700 rounded px-3 py-1 text-sm font-medium transition-colors"
                          >
                            Deploy
                          </button>
                        )}
                    </div>
                  </div>
                )}

                <div
                  className={`${minimized ? "h-10 overflow-hidden" : "flex-1 overflow-hidden"}`}
                >
                  {tabs && tabs.length > 0 ? (
                    <div className="h-full w-full relative">
                      {tabs.map((tab) => (
                        <div
                          key={tab.id}
                          className={`absolute inset-0 h-full w-full ${
                            tab.id === activeTabId ? "visible" : "invisible"
                          }`}
                        >
                          {tab.content}
                        </div>
                      ))}
                    </div>
                  ) : (
                    children
                  )}
                </div>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Transition>

      {showUnsavedChangesModal && (
        <UnsavedChangesModal
          open={showConfirmModal}
          onCancel={() => setShowConfirmModal(false)}
          onConfirm={handleConfirmClose}
          title={unsavedModalTitle}
          message={unsavedModalMessage}
          cancelLabel={unsavedModalCancelLabel}
          confirmLabel={unsavedModalConfirmLabel}
        />
      )}
    </>
  );
};

export default ResizableBottomDrawer;
