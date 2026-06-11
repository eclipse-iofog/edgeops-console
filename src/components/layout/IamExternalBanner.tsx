import React from "react";
import { useLocation } from "react-router-dom";
import { getAuthMode } from "@/auth";
import { isIamRoute } from "./iamRoutes";

export default function IamExternalBanner() {
  const { pathname } = useLocation();
  const authMode = getAuthMode();

  if (authMode !== "external" || !isIamRoute(pathname)) {
    return null;
  }

  return (
    <div
      role="status"
      className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
    >
      Identity is managed by an external provider. User and group administration
      is not available in the viewer.
    </div>
  );
}
