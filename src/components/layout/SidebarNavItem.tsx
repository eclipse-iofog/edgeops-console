import { useRef } from "react";
import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

type SidebarNavItemProps = {
  to: string;
  icon?: ReactNode;
  end?: boolean;
  collapsed?: boolean;
  nested?: boolean;
  activePath?: string | null;
  onNavigate?: (path: string, options?: { pinned?: boolean }) => void;
  children: ReactNode;
};

const linkBase =
  "flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm transition-colors w-full";
const linkActive = "bg-gray-700 text-white font-semibold";
const linkInactive =
  "text-gray-300 hover:bg-gray-800 hover:text-white focus:outline-none focus:bg-gray-800";

const DOUBLE_CLICK_DELAY_MS = 250;

export default function SidebarNavItem({
  to,
  icon,
  end = false,
  collapsed = false,
  nested = false,
  activePath = null,
  onNavigate,
  children,
}: SidebarNavItemProps) {
  const clickTimerRef = useRef<number | null>(null);

  const isItemActive =
    activePath != null &&
    (end ? activePath === to : activePath === to || activePath.startsWith(`${to}/`));

  const handleNavigate = (pinned: boolean) => {
    onNavigate?.(to, { pinned });
  };

  return (
    <NavLink
      to={to}
      end={end}
      onClick={(event) => {
        event.preventDefault();

        if (clickTimerRef.current != null) {
          window.clearTimeout(clickTimerRef.current);
        }

        clickTimerRef.current = window.setTimeout(() => {
          clickTimerRef.current = null;
          handleNavigate(false);
        }, DOUBLE_CLICK_DELAY_MS);
      }}
      onDoubleClick={(event) => {
        event.preventDefault();

        if (clickTimerRef.current != null) {
          window.clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }

        handleNavigate(true);
      }}
      title={collapsed ? String(children) : undefined}
      className={[
        linkBase,
        nested && !collapsed ? "pl-10" : "",
        collapsed ? "justify-center px-2" : "",
        isItemActive ? linkActive : linkInactive,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon ? (
        <span
          className={[
            "shrink-0 [&>svg]:size-[18px]",
            isItemActive ? "text-white" : "text-gray-400",
          ].join(" ")}
        >
          {icon}
        </span>
      ) : null}
      {!collapsed ? <span className="truncate">{children}</span> : null}
    </NavLink>
  );
}
