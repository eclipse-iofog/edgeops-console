import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import classNames from "classnames";

type CustomLoadingModalProps = {
  open: boolean;
  message?: string;
  overlayOpacity?: number;
  spinnerSize?: "sm" | "md" | "lg";
  spinnerColor?: string;
  className?: string;
};

const sizeClasses = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

const CustomLoadingModal = ({
  open,
  message = "Loading...",
  overlayOpacity = 50,
  spinnerSize = "md",
  spinnerColor = "text-blue-500",
  className = "",
}: CustomLoadingModalProps) => {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={() => {}}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div
            className="fixed inset-0"
            style={{
              backgroundColor: `rgb(0 0 0 / ${overlayOpacity / 100})`,
            }}
          />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel
            className={classNames(
              "flex flex-col items-center justify-center space-y-4 p-6 rounded-lg bg-white shadow-xl",
              className,
            )}
          >
            <svg
              className={classNames(
                "animate-spin",
                sizeClasses[spinnerSize],
                spinnerColor,
              )}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            {message && <p className="text-sm text-gray-700">{message}</p>}
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
};

export default CustomLoadingModal;
