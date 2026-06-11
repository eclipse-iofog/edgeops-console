import { Dialog, Transition } from "@headlessui/react";
import React, { Fragment } from "react";
import { X as CloseOutlinedIcon } from "lucide-react";

type CustomActionModalProps = {
  open: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  child?: React.ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmColor?: string;
  title?: string;
};

const CustomActionModal = ({
  open,
  onConfirm,
  onCancel,
  cancelLabel = "Cancel",
  confirmLabel = "Close Anyway",
  confirmColor,
  child,
  title,
}: CustomActionModalProps) => {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[110]"
        onClose={onCancel || (() => {})}
      >
        {/* Background */}
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

        {/* Centered panel */}
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
            <Dialog.Panel className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded bg-white text-black shadow-xl p-6 relative">
              {/* Title & Close Icon */}
              {(title || onCancel) && (
                <div className="flex justify-between items-start mb-4">
                  {title && (
                    <Dialog.Title className="text-xl font-semibold">
                      {title}
                    </Dialog.Title>
                  )}
                  {onCancel && (
                    <button
                      onClick={onCancel}
                      className="text-gray-500 hover:text-gray-800 transition"
                    >
                      <CloseOutlinedIcon fontSize="small" />
                    </button>
                  )}
                </div>
              )}

              {/* Content */}
              <div className="mb-6 min-h-[10vh]">{child}</div>

              {/* Footer Buttons */}
              {(onCancel || onConfirm) && (
                <div className="flex justify-end space-x-2">
                  {onCancel && (
                    <button
                      onClick={onCancel}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
                    >
                      {cancelLabel}
                    </button>
                  )}
                  {onConfirm && (
                    <button
                      onClick={onConfirm}
                      className={`px-4 py-2 ${
                        confirmColor
                          ? `bg-${confirmColor}-600 hover:bg-${confirmColor}-700`
                          : "bg-red-600 hover:bg-red-700"
                      } text-white rounded`}
                    >
                      {confirmLabel}
                    </button>
                  )}
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CustomActionModal;
