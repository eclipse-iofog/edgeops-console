import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

type UnsavedChangesModalProps = {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmColor?: string;
  warning?: string;
};

const UnsavedChangesModal = ({
  open,
  onConfirm,
  onCancel,
  title = "Unsaved Changes",
  message = "You have unsaved changes. If you close the panel now, your changes will be lost. Do you want to continue?",
  cancelLabel = "Cancel",
  confirmLabel = "Close Anyway",
  confirmColor,
  warning,
}: UnsavedChangesModalProps) => {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[110]" onClose={onCancel}>
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
          <Dialog.Panel className="w-full max-w-md rounded bg-white text-black shadow-xl p-6">
            <Dialog.Title className="text-lg font-semibold">
              {title}
            </Dialog.Title>
            {warning ? (
              <p className="mt-2 text-sm font-bold text-red-700">{warning}</p>
            ) : null}
            <div className="mt-2 text-sm text-gray-700 whitespace-pre-line">
              {message}
            </div>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 ${confirmColor ? confirmColor + "-600" : "bg-red-600"} text-white hover:${confirmColor ? confirmColor + "-700" : "bg-red-700"} rounded`}
              >
                {confirmLabel}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
};

export default UnsavedChangesModal;
