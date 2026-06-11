import React, { useMemo, useState } from "react";
import {
  Copy as CopyIcon,
  Check as CheckIcon,
  Braces as DecodeIcon,
} from "lucide-react";
import CustomActionModal from "@/components/ui/CustomActionModal";

const decodeJwtPayload = (jwt: string) => {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) {
      return { error: "Invalid JWT format" };
    }
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const decoded = atob(padded);
    return { payload: JSON.parse(decoded) };
  } catch (e: any) {
    return { error: e?.message || "Failed to decode JWT" };
  }
};

export const CopyableBlock = ({
  value,
  canDecodeJwt = false,
}: {
  value?: string;
  canDecodeJwt?: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  const [openDecode, setOpenDecode] = useState(false);

  const decoded = useMemo(
    () => (value && canDecodeJwt ? decodeJwtPayload(value) : null),
    [value, canDecodeJwt],
  );

  const handleCopy = async () => {
    if (!value) {
      return;
    }
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          className="p-1 rounded bg-gray-700 hover:bg-gray-600"
          onClick={handleCopy}
          title="Copy"
        >
          {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
        </button>
        {canDecodeJwt && (
          <button
            className="p-1 rounded bg-gray-700 hover:bg-gray-600"
            onClick={() => setOpenDecode(true)}
            title="Decode JWT"
            disabled={!value}
          >
            <DecodeIcon size={14} />
          </button>
        )}
      </div>
      <pre className="text-xs whitespace-pre-wrap break-all bg-gray-800 p-3 rounded border border-gray-700">
        {value || "N/A"}
      </pre>

      <CustomActionModal
        open={openDecode}
        title="Decoded JWT Payload"
        onCancel={() => setOpenDecode(false)}
        cancelLabel="Close"
        child={
          <pre className="text-xs whitespace-pre-wrap break-all bg-gray-100 p-3 rounded border border-gray-300 max-h-[60vh] overflow-auto">
            {decoded?.error
              ? decoded.error
              : JSON.stringify(decoded?.payload || {}, null, 2)}
          </pre>
        }
      />
    </div>
  );
};
