import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

type SidebarNavGroupProps = {
  label: string;
  icon?: ReactNode;
  collapsed: boolean;
  paths: string[];
  children: ReactNode;
};

function isPathActive(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export default function SidebarNavGroup({
  label,
  icon,
  collapsed,
  paths,
  children,
}: SidebarNavGroupProps) {
  const { pathname } = useLocation();
  const childActive = paths.some((path) => isPathActive(pathname, path));
  const [open, setOpen] = useState(childActive);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (childActive) {
      setOpen(true);
    }
  }, [childActive]);

  useEffect(() => {
    setFlyoutOpen(false);
  }, [pathname, collapsed]);

  useEffect(() => {
    if (!flyoutOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setFlyoutOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [flyoutOpen]);

  const groupButtonClass = [
    "flex w-full items-center gap-x-3 rounded-lg px-3 py-2 text-sm transition-colors",
    collapsed ? "justify-center px-2" : "",
    childActive
      ? "text-white"
      : "text-gray-300 hover:bg-gray-800 hover:text-white",
  ]
    .filter(Boolean)
    .join(" ");

  if (collapsed) {
    return (
      <div ref={rootRef} className="relative">
        <button
          type="button"
          title={label}
          aria-expanded={flyoutOpen}
          aria-haspopup="true"
          className={groupButtonClass}
          onClick={() => setFlyoutOpen((value) => !value)}
        >
          {icon ? (
            <span className="shrink-0 text-gray-400 [&>svg]:size-[18px]">
              {icon}
            </span>
          ) : null}
        </button>

        {flyoutOpen ? (
          <div
            role="menu"
            className="absolute left-full top-0 z-50 ml-1 min-w-[220px] rounded-lg border border-gray-600 bg-gray-800 py-1 shadow-lg"
          >
            <div className="border-b border-gray-600 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              {label}
            </div>
            <div className="flex flex-col gap-0.5 p-1">
              {React.Children.map(children, (child) => {
                if (!React.isValidElement(child)) {
                  return child;
                }
                return React.cloneElement(
                  child as React.ReactElement<{ collapsed?: boolean; nested?: boolean }>,
                  { collapsed: false, nested: false },
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        className={groupButtonClass}
        onClick={() => setOpen((value) => !value)}
      >
        {icon ? (
          <span className="shrink-0 text-gray-400 [&>svg]:size-[18px]">{icon}</span>
        ) : null}
        <span className="flex-1 truncate text-left">{label}</span>
        <ChevronDown
          className={[
            "size-4 shrink-0 text-gray-400 transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
        />
      </button>
      {open ? (
        <div className="mt-0.5 flex flex-col gap-0.5 pb-1">
          {React.Children.map(children, (child) => {
            if (!React.isValidElement(child)) {
              return child;
            }
            return React.cloneElement(
              child as React.ReactElement<{ nested?: boolean }>,
              { nested: true },
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
