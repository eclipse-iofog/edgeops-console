import React from "react";
import { mdiKubernetes } from "@mdi/js";

type KubernetesIconProps = {
  className?: string;
  size?: number;
};

export default function KubernetesIcon({
  className,
  size = 20,
}: KubernetesIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <path d={mdiKubernetes} fill="currentColor" />
    </svg>
  );
}
