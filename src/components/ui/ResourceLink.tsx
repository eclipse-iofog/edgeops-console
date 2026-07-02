import type { MouseEvent, ReactNode } from "react";

import { useWorkbench } from "@/app/providers";

export const RESOURCE_LINK_CLASS =
  "text-blue-400 underline cursor-pointer bg-transparent border-0 p-0 text-left";

type ResourceLinkProps = {
  path: string;
  search?: string;
  query?: Record<string, string | number | undefined | null>;
  children: ReactNode;
  className?: string;
};

export function buildResourceSearch(
  search?: string,
  query?: Record<string, string | number | undefined | null>,
): string {
  if (query) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(query)) {
      if (value != null && value !== "") {
        params.set(key, String(value));
      }
    }

    const serialized = params.toString();
    return serialized ? `?${serialized}` : "";
  }

  if (!search) {
    return "";
  }

  return search.startsWith("?") ? search : `?${search}`;
}

export default function ResourceLink({
  path,
  search,
  query,
  children,
  className,
}: ResourceLinkProps) {
  const { openTab } = useWorkbench();

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    openTab({
      path,
      search: buildResourceSearch(search, query),
    });
  };

  const mergedClassName = className
    ? `${RESOURCE_LINK_CLASS} ${className}`
    : RESOURCE_LINK_CLASS;

  return (
    <button type="button" className={mergedClassName} onClick={handleClick}>
      {children}
    </button>
  );
}
