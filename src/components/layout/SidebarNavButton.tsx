import type { ReactNode } from "react";

type SidebarNavButtonProps = {
  icon?: ReactNode;
  collapsed?: boolean;
  onClick: () => void;
  children: ReactNode;
};

const buttonBase =
  "flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm transition-colors w-full text-gray-300 hover:bg-gray-800 hover:text-white focus:outline-none focus:bg-gray-800";

export default function SidebarNavButton({
  icon,
  collapsed = false,
  onClick,
  children,
}: SidebarNavButtonProps) {
  return (
    <button
      type="button"
      title={collapsed ? String(children) : undefined}
      onClick={onClick}
      className={[buttonBase, collapsed ? "justify-center px-2" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {icon ? (
        <span className="shrink-0 text-gray-400 [&>svg]:size-[18px]">{icon}</span>
      ) : null}
      {!collapsed ? <span className="truncate">{children}</span> : null}
    </button>
  );
}
