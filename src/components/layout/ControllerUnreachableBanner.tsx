import React from "react";
import { useController } from "@/app/providers";

export default function ControllerUnreachableBanner() {
  const { isControllerHealthy } = useController();

  if (isControllerHealthy) {
    return null;
  }

  return (
    <div
      role="alert"
      className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100"
    >
      Controller unreachable — data refresh is paused while connectivity is
      restored.
    </div>
  );
}
