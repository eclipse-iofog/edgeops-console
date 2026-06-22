import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputTheme = "light" | "dark";

type PasswordInputProps = {
  id?: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
  theme?: PasswordInputTheme;
  trailingActions?: React.ReactNode;
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
};

const themeClasses: Record<PasswordInputTheme, string> = {
  light: "border rounded bg-white text-gray-900 px-2 py-1 pr-16 text-sm",
  dark: "border border-gray-600 rounded bg-gray-900 text-white px-2 py-1.5 pr-10 text-sm",
};

const toggleClasses: Record<PasswordInputTheme, string> = {
  light: "text-gray-600 hover:text-gray-900 p-0.5",
  dark: "text-gray-400 hover:text-white p-0.5",
};

export default function PasswordInput({
  id,
  value,
  onChange,
  disabled = false,
  required = false,
  autoComplete,
  placeholder,
  className,
  theme = "light",
  trailingActions,
  visible,
  onVisibleChange,
}: PasswordInputProps) {
  const [internalVisible, setInternalVisible] = useState(false);
  const isControlled = visible !== undefined;
  const isVisible = isControlled ? visible : internalVisible;

  const toggleVisible = () => {
    const next = !isVisible;
    if (isControlled) {
      onVisibleChange?.(next);
      return;
    }
    setInternalVisible(next);
  };

  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        id={id}
        type={isVisible ? "text" : "password"}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={`w-full ${themeClasses[theme]}`}
      />
      <div className="absolute inset-y-0 right-2 flex items-center gap-1">
        {trailingActions}
        <button
          type="button"
          onClick={toggleVisible}
          disabled={disabled}
          className={toggleClasses[theme]}
          aria-label={isVisible ? "Hide password" : "Show password"}
        >
          {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}
