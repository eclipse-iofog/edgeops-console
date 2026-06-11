import React, { useState, useEffect, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X as CloseOutlinedIcon } from "lucide-react";

export type ExecConfig = {
  action: "enable" | "disable";
  image?: string;
};

type ExecConfigModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (config: ExecConfig) => void;
  nodeName?: string;
};

const ExecConfigModal: React.FC<ExecConfigModalProps> = ({
  open,
  onClose,
  onConfirm,
  nodeName = "Node",
}) => {
  const [action, setAction] = useState<"enable" | "disable">("enable");
  const [image, setImage] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setAction("enable");
      setImage("");
      setErrors({});
    }
  }, [open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (action === "enable" && image.trim() && !image.includes("/")) {
      newErrors.image =
        "Image must be in format: registry/image:tag (e.g., ghcr.io/datasance/node-debugger:latest)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!validate()) {
      return;
    }

    const config: ExecConfig = {
      action,
      ...(action === "enable" && image.trim() ? { image: image.trim() } : {}),
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
                  Configure Exec Session
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-800 transition"
                >
                  <CloseOutlinedIcon fontSize="small" />
                </button>
              </div>

              <div className="mb-4 text-sm text-gray-600">
                Managing exec session for: <strong>{nodeName}</strong>
              </div>

              <div className="space-y-4 mb-6">
                {/* Action Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Action
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="action"
                        value="enable"
                        checked={action === "enable"}
                        onChange={() => setAction("enable")}
                        className="mr-2"
                      />
                      <span className="text-sm">Enable Exec Session</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="action"
                        value="disable"
                        checked={action === "disable"}
                        onChange={() => setAction("disable")}
                        className="mr-2"
                      />
                      <span className="text-sm">Disable Exec Session</span>
                    </label>
                  </div>
                </div>

                {/* Debugger Image Input (only shown when enable is selected) */}
                {action === "enable" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Debugger Image (optional)
                    </label>
                    <input
                      type="text"
                      value={image}
                      onChange={(e) => setImage(e.target.value)}
                      placeholder="e.g., ghcr.io/datasance/node-debugger:latest"
                      className={`w-full px-3 py-2 border rounded ${
                        errors.image ? "border-red-500" : "border-gray-300"
                      }`}
                    />
                    {errors.image && (
                      <p className="text-red-500 text-xs mt-1">
                        {errors.image}
                      </p>
                    )}
                    <p className="text-gray-500 text-xs mt-1">
                      Leave empty to use default debugger image
                    </p>
                  </div>
                )}
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
                  className={`px-4 py-2 rounded text-white ${
                    action === "enable"
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {action === "enable" ? "Enable" : "Disable"}
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ExecConfigModal;
