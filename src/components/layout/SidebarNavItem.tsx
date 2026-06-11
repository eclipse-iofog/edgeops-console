import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";

type SidebarNavItemProps = {
  to: string;
  icon?: ReactNode;
  end?: boolean;
  collapsed?: boolean;
  nested?: boolean;
  children: ReactNode;
};

const linkBase =
  "flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm transition-colors w-full";
const linkActive = "bg-gray-700 text-white font-semibold";
const linkInactive =
  "text-gray-300 hover:bg-gray-800 hover:text-white focus:outline-none focus:bg-gray-800";

export default function SidebarNavItem({
  to,
  icon,
  end = false,
  collapsed = false,
  nested = false,
  children,
}: SidebarNavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? String(children) : undefined}
      className={({ isActive }) =>
        [
          linkBase,
          nested && !collapsed ? "pl-10" : "",
          collapsed ? "justify-center px-2" : "",
          isActive ? linkActive : linkInactive,
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      {({ isActive }) => (
        <>
          {icon ? (
            <span
              className={[
                "shrink-0 [&>svg]:size-[18px]",
                isActive ? "text-white" : "text-gray-400",
              ].join(" ")}
            >
              {icon}
            </span>
          ) : null}
          {!collapsed ? <span className="truncate">{children}</span> : null}
        </>
      )}
    </NavLink>
  );
}
