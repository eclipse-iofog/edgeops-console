import React, { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X as CloseOutlinedIcon } from "lucide-react";
import { readStorageWithMigration } from "@/lib/storage/migrateKey";

export type LogTailConfig = {
  tail: number;
  follow: boolean;
  since: string | null;
  until: string | null;
};

type LogConfigModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (config: LogTailConfig) => void;
  logSourceName?: string;
  logSourceType?: "node" | "microservice" | "system-microservice";
};

const LEGACY_STORAGE_KEY_PREFIX = "ecn-viewer-log-config-";
const STORAGE_KEY_PREFIX = "edgeops-console-log-config-";

const getLogConfigStorageKey = (logSourceType: string) =>
  `${STORAGE_KEY_PREFIX}${logSourceType}`;

const LogConfigModal: React.FC<LogConfigModalProps> = ({
  open,
  onClose,
  onConfirm,
  logSourceName = "Resource",
  logSourceType = "microservice",
}) => {
  const [tail, setTail] = useState(100);
  const [follow, setFollow] = useState(true);
  const [since, setSince] = useState<string>("");
  const [until, setUntil] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load saved config from localStorage
  useEffect(() => {
    if (open) {
      const storageKey = getLogConfigStorageKey(logSourceType);
      const legacyKey = `${LEGACY_STORAGE_KEY_PREFIX}${logSourceType}`;
      const saved = readStorageWithMigration(
        localStorage,
        storageKey,
        legacyKey,
      );
      if (saved) {
        try {
          const config = JSON.parse(saved) as LogTailConfig;
          setTail(config.tail || 100);
          setFollow(config.follow !== false);
          setSince(config.since || "");
          setUntil(config.until || "");
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }, [open, logSourceType]);

  const validateISO8601 = (dateStr: string): boolean => {
    if (!dateStr) return true; // Empty is valid (optional)
    // Match controller's regex: requires Z or timezone offset
    const iso8601Regex =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})$/;
    return iso8601Regex.test(dateStr);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (tail < 1 || tail > 10000) {
      newErrors.tail = "Tail lines must be between 1 and 10000";
    }

    if (since && !validateISO8601(since)) {
      newErrors.since =
        "Since date must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ssZ)";
    }

    if (until && !validateISO8601(until)) {
      newErrors.until =
        "Until date must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ or YYYY-MM-DDTHH:mm:ssZ)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!validate()) {
      return;
    }

    const config: LogTailConfig = {
      tail,
      follow,
      since: since || null,
      until: until || null,
    };

    // Save to localStorage
    const storageKey = getLogConfigStorageKey(logSourceType);
    localStorage.setItem(storageKey, JSON.stringify(config));

    onConfirm(config);
  };

  const applyPreset = (preset: "100" | "1000" | "hour" | "all") => {
    setErrors({});
    switch (preset) {
      case "100":
        setTail(100);
        setFollow(true);
        setSince("");
        setUntil("");
        break;
      case "1000":
        setTail(1000);
        setFollow(true);
        setSince("");
        setUntil("");
        break;
      case "hour":
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        setTail(10000);
        setFollow(true);
        setSince(oneHourAgo.toISOString()); // Use full ISO string with Z
        setUntil("");
        break;
      case "all":
        setTail(10000);
        setFollow(true);
        setSince("");
        setUntil("");
        break;
    }
  };

  const formatDateTimeLocal = (isoString: string): string => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleSinceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      const date = new Date(value);
      setSince(date.toISOString()); // Use full ISO string with Z
    } else {
      setSince("");
    }
  };

  const handleUntilChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      const date = new Date(value);
      setUntil(date.toISOString()); // Use full ISO string with Z
    } else {
      setUntil("");
    }
  };

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[110]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 z-[110]" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4 z-[110]">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="scale-95 opacity-0"
            enterTo="scale-100 opacity-100"
            leave="ease-in duration-200"
            leaveFrom="scale-100 opacity-100"
            leaveTo="scale-95 opacity-0"
          >
            <Dialog.Panel className="w-full max-w-md rounded bg-white text-black shadow-xl p-6 relative">
              <div className="flex justify-between items-start mb-4">
                <Dialog.Title className="text-xl font-semibold">
                  Configure Log Viewing
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-800 transition"
                >
                  <CloseOutlinedIcon fontSize="small" />
                </button>
              </div>

              <div className="mb-4 text-sm text-gray-600">
                Viewing logs for: <strong>{logSourceName}</strong>
              </div>

              <div className="space-y-4 mb-6">
                {/* Tail Lines */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tail Lines (1-10000)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={tail}
                    onChange={(e) => setTail(parseInt(e.target.value) || 100)}
                    className={`w-full px-3 py-2 border rounded ${
                      errors.tail ? "border-red-500" : "border-gray-300"
                    }`}
                  />
                  {errors.tail && (
                    <p className="text-red-500 text-xs mt-1">{errors.tail}</p>
                  )}
                </div>

                {/* Follow Toggle */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="follow"
                    checked={follow}
                    onChange={(e) => setFollow(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="follow" className="text-sm font-medium">
                    Follow logs (stream new lines)
                  </label>
                </div>

                {/* Advanced Options */}
                <div>
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-blue-600 hover:text-blue-800 mb-2"
                  >
                    {showAdvanced ? "▼" : "▶"} Advanced Options
                  </button>

                  {showAdvanced && (
                    <div className="mt-2 space-y-4 pl-4 border-l-2 border-gray-200">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Since (optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={formatDateTimeLocal(since)}
                          onChange={handleSinceChange}
                          className={`w-full px-3 py-2 border rounded ${
                            errors.since ? "border-red-500" : "border-gray-300"
                          }`}
                        />
                        {errors.since && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.since}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Until (optional)
                        </label>
                        <input
                          type="datetime-local"
                          value={formatDateTimeLocal(until)}
                          onChange={handleUntilChange}
                          className={`w-full px-3 py-2 border rounded ${
                            errors.until ? "border-red-500" : "border-gray-300"
                          }`}
                        />
                        {errors.until && (
                          <p className="text-red-500 text-xs mt-1">
                            {errors.until}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Presets */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Quick Presets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => applyPreset("100")}
                      className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100"
                    >
                      Last 100 lines
                    </button>
                    <button
                      onClick={() => applyPreset("1000")}
                      className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100"
                    >
                      Last 1000 lines
                    </button>
                    <button
                      onClick={() => applyPreset("hour")}
                      className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100"
                    >
                      Last hour
                    </button>
                    <button
                      onClick={() => applyPreset("all")}
                      className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100"
                    >
                      All logs
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  View Logs
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default LogConfigModal;
