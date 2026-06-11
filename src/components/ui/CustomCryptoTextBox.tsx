import React, { useState, useMemo, useRef, useLayoutEffect } from "react";
import {
  Eye as VisibilityIcon,
  EyeOff as VisibilityOffIcon,
  Copy as FileCopyIcon,
  Check as CheckIcon,
} from "lucide-react";

type Props = {
  data: string;
  mode: "plain" | "encrypted";
};

const CryptoTextBox: React.FC<Props> = ({ data, mode }) => {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineHeightRef = useRef<number>(0);
  const [rows, setRows] = useState(1);

  const encoded = useMemo(() => {
    try {
      return mode === "plain"
        ? btoa(decodeURIComponent(encodeURIComponent(data)))
        : data;
    } catch {
      return "Invalid base64";
    }
  }, [data, mode]);

  const decoded = useMemo(() => {
    try {
      return mode === "plain"
        ? data
        : decodeURIComponent(encodeURIComponent(atob(data)));
    } catch {
      return "Invalid base64";
    }
  }, [data, mode]);

  const displayValue = visible ? decoded : encoded;
  const trimmedDisplayValue = useMemo(
    () => displayValue.replace(/\n+$/, ""),
    [displayValue],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  useLayoutEffect(() => {
    if (!visible) {
      setRows(1);
      return;
    }
    const ta = textareaRef.current;
    if (!ta) return;

    if (!lineHeightRef.current) {
      const lh = parseFloat(getComputedStyle(ta).lineHeight || "20");
      lineHeightRef.current = lh || 20;
    }
    const style = getComputedStyle(ta);
    const padding =
      parseFloat(style.paddingTop || "0") +
      parseFloat(style.paddingBottom || "0");
    const border =
      parseFloat(style.borderTopWidth || "0") +
      parseFloat(style.borderBottomWidth || "0");
    const contentHeight = ta.scrollHeight - padding - border;
    const neededRows = Math.ceil(contentHeight / lineHeightRef.current);
    setRows(Math.max(1, neededRows));
  }, [trimmedDisplayValue, visible]);

  return (
    <div className="relative w-full max-w-full sm:max-w-md md:max-w-lg lg:max-w-2xl">
      <textarea
        ref={textareaRef}
        readOnly
        value={trimmedDisplayValue}
        rows={rows}
        className="w-full resize-none px-4 py-2 pr-20 border border-gray-300 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none break-words whitespace-pre-wrap text-sm"
        style={{ wordBreak: "break-word", height: "auto", overflow: "hidden" }}
      />

      <button
        onClick={() => setVisible(!visible)}
        className="absolute top-2 right-12 sm:top-1/2 sm:-translate-y-1/2 text-gray-300 hover:text-white bg-gray-800"
        title="Toggle visibility"
      >
        {visible ? <VisibilityOffIcon /> : <VisibilityIcon />}
      </button>

      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 sm:top-1/2 sm:-translate-y-1/2 text-gray-300 hover:text-white bg-gray-800"
        title={copied ? "Copied!" : "Copy to clipboard"}
      >
        {copied ? <CheckIcon /> : <FileCopyIcon />}
      </button>
    </div>
  );
};

export default CryptoTextBox;
