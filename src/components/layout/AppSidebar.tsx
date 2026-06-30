import React from "react";
import { NavLink } from "react-router-dom";
import {
  Settings as MiscellaneousServicesIcon,
  LogOut as ExitToAppIcon,
  LayoutDashboard as DashboardIcon,
  ChevronLeft as ChevronLeftSharp,
  ChevronRight as ChevronRightSharp,
  Network as Hub,
  Database as StorageRounded,
  Layers as LayersRounded,
  Calendar as EventIcon,
  SlidersHorizontal as TuneIcon,
  ShieldCheck as AccessControlIcon,
  Waypoints as MessageBusIcon,
  UserCircle as UserCircleIcon,
  Users as UsersIcon,
} from "lucide-react";

import { getApiV3BaseUrl } from "@/auth/api";
import { LOGO_ALT_TEXT, sidebarLogomark, DOCS_URL, GITHUB_URL, LICENSE_URL } from "@/config/distribution";
import { getRouteTitle,
  getSidebarGroupPaths,
  SIDEBAR_ACCOUNT_STANDALONE_PATH,
  SIDEBAR_BOTTOM_PATHS,
  SIDEBAR_NAV_GROUPS,
  SIDEBAR_TOP_PATHS,
  type SidebarNavGroupDef,
} from "@/config/navigation";
import { useWorkbench } from "@/app/providers";
import SidebarNavButton from "./SidebarNavButton";
import SidebarNavGroup from "./SidebarNavGroup";
import SidebarNavItem from "./SidebarNavItem";
import {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
} from "./sidebarConstants";

type AppSidebarProps = {
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  collapsed: boolean;
  isPinned: boolean;
  isNatsEnabled: boolean;
  isEmbeddedAuth: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onTogglePin: () => void;
  onLogout: () => void | Promise<void>;
  onReturnHome: () => void;
  controllerVersion?: string;
  consoleVersion?: string;
  accessToken?: string;
};

const SIDEBAR_GROUP_ICONS: Record<
  SidebarNavGroupDef["id"],
  React.ReactNode
> = {
  nodes: <StorageRounded size={18} />,
  workloads: <LayersRounded size={18} />,
  config: <MiscellaneousServicesIcon size={18} />,
  network: <Hub size={18} />,
  messagebus: <MessageBusIcon size={18} />,
  "access-control": <AccessControlIcon size={18} />,
  iam: <UsersIcon size={18} />,
};

const SIDEBAR_STANDALONE_ICONS: Partial<Record<string, React.ReactNode>> = {
  "/dashboard": <DashboardIcon size={18} />,
  "/events": <EventIcon size={18} />,
  "/config/pollingSettings": <TuneIcon size={18} />,
  [SIDEBAR_ACCOUNT_STANDALONE_PATH]: <UserCircleIcon size={18} />,
};

function shouldRenderSidebarGroup(
  group: SidebarNavGroupDef,
  isNatsEnabled: boolean,
  isEmbeddedAuth: boolean,
): boolean {
  if (group.requiresNats && !isNatsEnabled) {
    return false;
  }
  if (group.requiresEmbeddedAuth && !isEmbeddedAuth) {
    return false;
  }
  return true;
}

export default function AppSidebar({
  sidebarRef,
  collapsed,
  isPinned,
  isNatsEnabled,
  isEmbeddedAuth,
  onMouseEnter,
  onMouseLeave,
  onTogglePin,
  onLogout,
  onReturnHome,
  controllerVersion,
  consoleVersion,
  accessToken,
}: AppSidebarProps) {
  const { openTab, getActiveTab } = useWorkbench();
  const activePath = getActiveTab()?.path ?? null;

  const handleNavigate = (path: string, options?: { pinned?: boolean }) => {
    openTab({
      path,
      title: getRouteTitle(path),
      pinned: options?.pinned,
    });
  };

  return (
    <aside
      ref={sidebarRef}
      style={{
        width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED,
      }}
      className={[
        "h-screen shrink-0 flex flex-col overflow-hidden bg-gray-900 border-r border-gray-500",
        "transition-[width] duration-200 ease-in-out",
      ].join(" ")}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="flex justify-center py-4">
        <NavLink
          to="/dashboard"
          onClick={(event) => {
            event.preventDefault();
            onReturnHome();
            handleNavigate("/dashboard");
          }}
        >
          <img src={sidebarLogomark} className="w-7 mt-2" alt={LOGO_ALT_TEXT} />
        </NavLink>
      </div>

      <nav
        aria-label="Main navigation"
        className="sidebar-nav-scroll flex-1 overflow-y-auto overflow-x-hidden border-t border-gray-500 px-2 py-2"
      >
        <div className="flex flex-col gap-0.5">
          {SIDEBAR_TOP_PATHS.map((path) => (
            <SidebarNavItem
              key={path}
              to={path}
              icon={SIDEBAR_STANDALONE_ICONS[path]}
              end={path === "/dashboard"}
              collapsed={collapsed}
              activePath={activePath}
              onNavigate={handleNavigate}
            >
              {getRouteTitle(path)}
            </SidebarNavItem>
          ))}

          {SIDEBAR_NAV_GROUPS.filter((group) =>
            shouldRenderSidebarGroup(group, isNatsEnabled, isEmbeddedAuth),
          ).map((group) => (
            <SidebarNavGroup
              key={group.id}
              label={group.label}
              icon={SIDEBAR_GROUP_ICONS[group.id]}
              collapsed={collapsed}
              paths={getSidebarGroupPaths(group)}
            >
              {group.childPaths.map((path) => (
                <SidebarNavItem
                  key={path}
                  to={path}
                  collapsed={collapsed}
                  activePath={activePath}
                  onNavigate={handleNavigate}
                >
                  {getRouteTitle(path)}
                </SidebarNavItem>
              ))}
            </SidebarNavGroup>
          ))}

          {!isEmbeddedAuth ? (
            <SidebarNavItem
              to={SIDEBAR_ACCOUNT_STANDALONE_PATH}
              icon={SIDEBAR_STANDALONE_ICONS[SIDEBAR_ACCOUNT_STANDALONE_PATH]}
              collapsed={collapsed}
              activePath={activePath}
              onNavigate={handleNavigate}
            >
              {getRouteTitle(SIDEBAR_ACCOUNT_STANDALONE_PATH)}
            </SidebarNavItem>
          ) : null}

          {SIDEBAR_BOTTOM_PATHS.map((path) => (
            <SidebarNavItem
              key={path}
              to={path}
              icon={SIDEBAR_STANDALONE_ICONS[path]}
              collapsed={collapsed}
              activePath={activePath}
              onNavigate={handleNavigate}
            >
              {getRouteTitle(path)}
            </SidebarNavItem>
          ))}

          <SidebarNavButton
            icon={<ExitToAppIcon size={18} />}
            collapsed={collapsed}
            onClick={() => {
              void onLogout();
            }}
          >
            Logout
          </SidebarNavButton>
        </div>
      </nav>

      <div className="flex flex-col gap-3 px-3 py-4 border-t border-gray-500">
        <button
          type="button"
          className="w-full text-xs bg-gray-700 text-white py-2 rounded hover:bg-gray-600 transition flex items-center justify-center"
          onClick={onTogglePin}
        >
          {!collapsed ? (
            <span className="mr-2">{isPinned ? "Unpin Sidebar" : "Pin Sidebar"}</span>
          ) : null}
          {isPinned ? (
            <ChevronLeftSharp size={18} />
          ) : (
            <ChevronRightSharp size={18} />
          )}
        </button>

        {!collapsed ? (
          <>
            <div className="flex justify-center items-center text-white text-xs space-x-8">
              <span
                className="cursor-pointer underline"
                onClick={() => window.open(DOCS_URL, "_blank")}
              >
                Docs
              </span>
              <span
                className="cursor-pointer underline"
                onClick={() => window.open(GITHUB_URL, "_blank")}
              >
                GitHub
              </span>
              <a
                className="underline underline-offset-2"
                href={`/#/api?authToken=${accessToken}&baseUrl=${encodeURIComponent(getApiV3BaseUrl())}`}
                target="_parent"
              >
                API
              </a>
              <span
                className="cursor-pointer underline"
                onClick={() => window.open(LICENSE_URL, "_blank")}
              >
                License
              </span>
            </div>

            <div className="text-white text-xs text-center">
              <p>Controller v{controllerVersion}</p>
              <p>EdgeOps Console v{consoleVersion}</p>
            </div>
          </>
        ) : null}
        <span
          className="text-white text-xs text-center cursor-pointer"
          onClick={() => window.open("https://datasance.com/", "_blank")}
        >
          © {new Date().getFullYear()} Datasance
        </span>
      </div>
    </aside>
  );
}
