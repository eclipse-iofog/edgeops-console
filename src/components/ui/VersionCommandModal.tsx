import React, { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  X as CloseOutlinedIcon,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";
import {
  CRITICAL_AGENT_VERSION_WARNING,
  VersionCommand,
  VersionCommandConfig,
} from "@/lib/agentCritical";

type VersionCommandModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (config: VersionCommandConfig) => void;
  nodeName?: string;
  currentVersion?: string;
  isReadyToUpgrade?: boolean;
  isReadyToRollback?: boolean;
  isCriticalAgent?: boolean;
};

const VersionCommandModal: React.FC<VersionCommandModalProps> = ({
  open,
  onClose,
  onConfirm,
  nodeName = "Node",
  currentVersion,
  isReadyToUpgrade = false,
  isReadyToRollback = false,
  isCriticalAgent = false,
}) => {
  const [versionCommand, setVersionCommand] =
    useState<VersionCommand>("upgrade");
  const [semver, setSemver] = useState("");

  const canSubmit =
    versionCommand === "upgrade" ? isReadyToUpgrade : isReadyToRollback;

  useEffect(() => {
    if (open) {
      setSemver("");
      if (isReadyToUpgrade) {
        setVersionCommand("upgrade");
      } else if (isReadyToRollback) {
        setVersionCommand("rollback");
      } else {
        setVersionCommand("upgrade");
      }
    }
  }, [open, isReadyToUpgrade, isReadyToRollback]);

  const handleConfirm = () => {
    if (!canSubmit) return;

    const config: VersionCommandConfig = {
      versionCommand,
      ...(semver.trim() ? { semver: semver.trim() } : {}),
    };
    onConfirm(config);
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
                  Version Change
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-800 transition"
                >
                  <CloseOutlinedIcon size={20} />
                </button>
              </div>

              <div className="mb-4 text-sm text-gray-600">
                Agent: <strong>{nodeName}</strong>
                {currentVersion ? (
                  <>
                    {" "}
                    · Current version: <strong>{currentVersion}</strong>
                  </>
                ) : null}
              </div>

              {isCriticalAgent && (
                <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                  {CRITICAL_AGENT_VERSION_WARNING}
                </div>
              )}

              {!isReadyToUpgrade && !isReadyToRollback && (
                <div className="mb-4 rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  This agent is not ready to upgrade or rollback. Check the
                  readiness flags on the agent details panel.
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Command
                  </label>
                  <div className="space-y-2">
                    <label
                      className={`flex items-center gap-2 ${
                        !isReadyToUpgrade ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="versionCommand"
                        value="upgrade"
                        checked={versionCommand === "upgrade"}
                        onChange={() => setVersionCommand("upgrade")}
                        disabled={!isReadyToUpgrade}
                        className="mr-1"
                      />
                      <ArrowUpCircle size={18} className="text-blue-600" />
                      <span className="text-sm">Upgrade</span>
                      {!isReadyToUpgrade && (
                        <span className="text-xs text-gray-500">
                          (not ready)
                        </span>
                      )}
                    </label>
                    <label
                      className={`flex items-center gap-2 ${
                        !isReadyToRollback ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="versionCommand"
                        value="rollback"
                        checked={versionCommand === "rollback"}
                        onChange={() => setVersionCommand("rollback")}
                        disabled={!isReadyToRollback}
                        className="mr-1"
                      />
                      <ArrowDownCircle size={18} className="text-orange-600" />
                      <span className="text-sm">Rollback</span>
                      {!isReadyToRollback && (
                        <span className="text-xs text-gray-500">
                          (not ready)
                        </span>
                      )}
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Target version (optional)
                  </label>
                  <input
                    type="text"
                    value={semver}
                    onChange={(e) => setSemver(e.target.value)}
                    placeholder="e.g. v1.0.0"
                    className="w-full px-3 py-2 border border-gray-300 rounded"
                  />
                  <p className="text-gray-500 text-xs mt-1">
                    Leave empty to let the controller choose the target version.
                  </p>
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
                  disabled={!canSubmit}
                  className={`px-4 py-2 rounded text-white ${
                    canSubmit
                      ? versionCommand === "upgrade"
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-orange-600 hover:bg-orange-700"
                      : "bg-gray-400 cursor-not-allowed"
                  }`}
                >
                  Continue
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default VersionCommandModal;
