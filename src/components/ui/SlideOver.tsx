import React, { Fragment, useState, useRef, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  X as XMarkIcon,
  RotateCcw as RestartAltIcon,
  Trash2 as DeleteOutlineIcon,
  Pencil as EditOutlinedIcon,
  PlayCircle as PlayCircleFilledOutlined,
  StopCircle as StopOutlined,
  Upload as PublishOutlined,
  FileText as DescriptionOutlined,
  Key as VpnKeyIcon,
  ArrowUpDown as VersionChangeIcon,
} from "lucide-react";
import { usePollingConfig } from "@/app/providers";

type Field<T> = {
  label: string;
  render: (data: T) => React.ReactNode;
  isSectionHeader?: boolean;
  isFullSection?: boolean;
};

type SlideOverProps<T> = {
  open: boolean;
  onClose: () => void;
  title?: string;
  data: T | null;
  fields: Field<T>[];
  onRestart?: () => void;
  onDelete?: () => void;
  onStartStop?: () => void;
  startStopValue?: string;
  onEditYaml?: () => void;
  onPublish?: () => void;
  onDetails?: () => void;
  onClean?: () => void;
  customWidth?: number;
  onTerminal?: () => void;
  onLogs?: () => void;
  onAttach?: () => void;
  onDetach?: () => void;
  onProvisionKey?: () => void;
  onVersionChange?: () => void;
  enablePolling?: boolean;
  onRefresh?: () => void | Promise<void>;
};

const SlideOver = <T,>({
  open,
  onClose,
  title,
  data,
  fields,
  onRestart,
  onStartStop,
  startStopValue,
  onDelete,
  onEditYaml,
  onPublish,
  onDetails,
  onClean,
  onTerminal,
  onLogs,
  onAttach,
  onDetach,
  onProvisionKey,
  onVersionChange,
  customWidth,
  enablePolling = false,
  onRefresh,
}: SlideOverProps<T>) => {
  const [width, setWidth] = useState(customWidth ? customWidth : 480);
  const isResizing = useRef(false);
  const { getSlideoverInterval } = usePollingConfig();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onRefreshRef = useRef(onRefresh);

  // Keep onRefresh ref up to date
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  // Set up polling when slideover is open and polling is enabled
  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only set up polling if slideover is open, polling is enabled, and refresh callback exists
    if (open && enablePolling && onRefreshRef.current) {
      const interval = getSlideoverInterval();
      intervalRef.current = setInterval(() => {
        // Only call refresh if slideover is still open
        if (onRefreshRef.current) {
          const result = onRefreshRef.current();
          if (result instanceof Promise) {
            result.catch((error) => {
              console.error("Error refreshing slideover data:", error);
            });
          }
        }
      }, interval);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open, enablePolling, getSlideoverInterval]);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const stopResizing = () => {
    isResizing.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  const resize = (e: MouseEvent) => {
    if (isResizing.current) {
      const newWidth = window.innerWidth - e.clientX;
      const clamped = Math.min(
        Math.max(newWidth, 320),
        window.innerWidth - 100,
      );
      setWidth(clamped);
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      // Clean up body styles when component unmounts
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, []);

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-500"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-500"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 transition-opacity z-[100]" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden z-[100]">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel
                  className="pointer-events-auto h-full max-h-screen bg-gray-800 text-white shadow-xl overflow-y-auto relative flex flex-col z-[100]"
                  style={{ width: `${width}px` }}
                >
                  <div
                    onMouseDown={startResizing}
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize z-50 bg-gray-700 hover:bg-gray-600 transition-colors"
                    style={{ cursor: "col-resize" }}
                  />

                  <div className="flex items-start justify-between p-4 border-b border-gray-700">
                    <Dialog.Title className="text-lg font-medium">
                      {title || "Details"}
                    </Dialog.Title>
                    <div className="flex items-center gap-2">
                      {onAttach && (
                        <button
                          onClick={onAttach}
                          className="hover:text-white hover:bg-sky-500 rounded"
                          title="Attach"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                          >
                            <path
                              fill="none"
                              stroke="#fff"
                              stroke-linecap="square"
                              stroke-width="2"
                              d="m20.506 12.313l-7.778 7.778a6 6 0 0 1-8.485-8.485l7.778-7.778a4 4 0 1 1 5.657 5.657L9.9 17.263a2 2 0 1 1-2.829-2.829l7.071-7.07"
                            />
                          </svg>
                        </button>
                      )}
                      {onDetach && (
                        <button
                          onClick={onDetach}
                          className="hover:text-white hover:bg-sky-500 rounded"
                          title="Detach"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                          >
                            <path
                              fill="none"
                              stroke="#fff"
                              stroke-width="2"
                              d="m4 4l16 16m2-8l-5.28 5.28M15 19l-2 2c-6 6-15-3-9-9l2-2m2-2l5-5c4-4 10 2 6 6l-5 5m-2 2l-2 2c-2 2-5-1-3-3l2-2m2-2l5-5"
                            />
                          </svg>
                        </button>
                      )}
                      {onTerminal && (
                        <button
                          onClick={onTerminal}
                          className="hover:text-white hover:bg-sky-500 rounded"
                          title="Terminal"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                          >
                            <path
                              fill="currentColor"
                              d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h16q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20zm0-2h16V8H4zm3.5-1l-1.4-1.4L8.675 13l-2.6-2.6L7.5 9l4 4zm4.5 0v-2h6v2z"
                            />
                          </svg>
                        </button>
                      )}
                      {onLogs && (
                        <button
                          onClick={onLogs}
                          className="hover:text-white hover:bg-sky-500 rounded"
                          title="Logs"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <path d="M14 2v6h6" />
                            <path d="M16 13H8" />
                            <path d="M16 17H8" />
                            <path d="M10 9H8" />
                          </svg>
                        </button>
                      )}
                      {onProvisionKey && (
                        <button
                          onClick={onProvisionKey}
                          className="hover:text-white hover:bg-sky-500 rounded"
                          title="Provision Key"
                        >
                          <VpnKeyIcon size={20} />
                        </button>
                      )}
                      {onClean && (
                        <button
                          onClick={onClean}
                          className="hover:text-white hover:bg-sky-500 rounded"
                          title="Clean"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                          >
                            <g
                              fill="none"
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                            >
                              <path d="m21 3l-8 8.5m-3.554-.415c-2.48.952-4.463.789-6.446.003c.5 6.443 3.504 8.92 7.509 9.912c0 0 3.017-2.134 3.452-7.193c.047-.548.07-.821-.043-1.13c-.114-.309-.338-.53-.785-.973c-.736-.728-1.103-1.092-1.54-1.184c-.437-.09-1.007.128-2.147.565" />
                              <path d="M4.5 16.446S7 16.93 9.5 15m-1-7.75a1.25 1.25 0 1 1-2.5 0a1.25 1.25 0 0 1 2.5 0M11 4v.1" />
                            </g>
                          </svg>
                        </button>
                      )}
                      {onPublish && (
                        <button
                          onClick={onPublish}
                          className="hover:text-white hover:bg-sky-500 rounded"
                          title="Publish"
                        >
                          <PublishOutlined size={20} />
                        </button>
                      )}
                      {onDetails && (
                        <button
                          onClick={onDetails}
                          className="hover:text-white hover:bg-sky-500 rounded"
                          title="Details"
                        >
                          <DescriptionOutlined size={20} />
                        </button>
                      )}
                      {onEditYaml && (
                        <button
                          onClick={onEditYaml}
                          className="hover:text-white hover:bg-sky-500 rounded"
                          title="Edit"
                        >
                          <EditOutlinedIcon size={20} />
                        </button>
                      )}
                      {onVersionChange && (
                        <button
                          onClick={onVersionChange}
                          className="hover:text-white hover:bg-sky-500 rounded"
                          title="Version change"
                        >
                          <VersionChangeIcon size={20} />
                        </button>
                      )}
                      {onStartStop &&
                        (!startStopValue ? (
                          <button
                            onClick={onStartStop}
                            className="hover:text-white hover:bg-sky-500 rounded"
                            title="Start"
                          >
                            <PlayCircleFilledOutlined size={20} />
                          </button>
                        ) : (
                          <button
                            onClick={onStartStop}
                            className="hover:text-red-600 hover:bg-sky-500 rounded"
                            title="Stop"
                          >
                            <StopOutlined size={20} />
                          </button>
                        ))}
                      {onRestart && (
                        <button
                          onClick={onRestart}
                          className="hover:text-white hover:bg-sky-500 rounded"
                          title="Restart"
                        >
                          <RestartAltIcon size={20} />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={onDelete}
                          className="hover:text-red-600 hover:bg-sky-500 rounded"
                          title="Delete"
                        >
                          <DeleteOutlineIcon size={20} />
                        </button>
                      )}
                      <button
                        onClick={onClose}
                        className="hover:text-black hover:bg-sky-500 rounded"
                      >
                        <XMarkIcon size={20} />
                      </button>
                    </div>
                  </div>

                  <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
                    {data ? (
                      <dl className="divide-y divide-gray-700">
                        {fields.map((field, idx) =>
                          field.isSectionHeader ? (
                            <div key={idx} className="py-3">
                              <h3 className="text-lg font-semibold text-white">
                                {field.label}
                              </h3>
                            </div>
                          ) : field.isFullSection ? (
                            <div key={idx} className="py-3 flex flex-col">
                              <dd className="mt-1 text-sm text-white sm:mt-0 sm:col-span-3">
                                {field.render(data)}
                              </dd>
                            </div>
                          ) : (
                            <div
                              key={idx}
                              className="py-3 sm:grid sm:grid-cols-[minmax(120px,150px)_1fr] sm:gap-2 flex flex-col"
                            >
                              <dt className="text-sm font-medium text-gray-300 content-center">
                                {field.label}
                              </dt>
                              <dd className="mt-1 text-sm text-white sm:mt-0 truncate min-h-6">
                                {field.render(data)}
                              </dd>
                            </div>
                          ),
                        )}
                      </dl>
                    ) : (
                      <p className="text-sm text-gray-400">
                        No data available.
                      </p>
                    )}
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default SlideOver;
