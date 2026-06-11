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
        <NavLink to="/dashboard" onClick={onReturnHome}>
          <img src={sidebarLogomark} className="w-7 mt-2" alt={LOGO_ALT_TEXT} />
        </NavLink>
      </div>

      <nav
        aria-label="Main navigation"
        className="sidebar-nav-scroll flex-1 overflow-y-auto overflow-x-hidden border-t border-gray-500 px-2 py-2"
      >
        <div className="flex flex-col gap-0.5">
          <SidebarNavItem
            to="/dashboard"
            icon={<DashboardIcon size={18} />}
            end
            collapsed={collapsed}
          >
            Overview
          </SidebarNavItem>

          <SidebarNavGroup
            label="Nodes"
            icon={<StorageRounded size={18} />}
            collapsed={collapsed}
            paths={["/nodes/list", "/nodes/Map"]}
          >
            <SidebarNavItem to="/nodes/list" collapsed={collapsed}>
              List
            </SidebarNavItem>
            <SidebarNavItem to="/nodes/Map" collapsed={collapsed}>
              Map
            </SidebarNavItem>
          </SidebarNavGroup>

          <SidebarNavGroup
            label="Workloads"
            icon={<LayersRounded size={18} />}
            collapsed={collapsed}
            paths={[
              "/Workloads/MicroservicesList",
              "/Workloads/SystemMicroservicesList",
              "/Workloads/ApplicationList",
              "/Workloads/SystemApplicationList",
            ]}
          >
            <SidebarNavItem
              to="/Workloads/MicroservicesList"
              collapsed={collapsed}
            >
              Microservices
            </SidebarNavItem>
            <SidebarNavItem
              to="/Workloads/SystemMicroservicesList"
              collapsed={collapsed}
            >
              System Microservices
            </SidebarNavItem>
            <SidebarNavItem
              to="/Workloads/ApplicationList"
              collapsed={collapsed}
            >
              Application
            </SidebarNavItem>
            <SidebarNavItem
              to="/Workloads/SystemApplicationList"
              collapsed={collapsed}
            >
              System Application
            </SidebarNavItem>
          </SidebarNavGroup>

          <SidebarNavGroup
            label="Config"
            icon={<MiscellaneousServicesIcon size={18} />}
            collapsed={collapsed}
            paths={[
              "/config/AppTemplates",
              "/config/CatalogMicroservices",
              "/config/Registries",
              "/config/ConfigMaps",
              "/config/secret",
              "/config/VolumeMounts",
              "/config/certificates",
            ]}
          >
            <SidebarNavItem to="/config/AppTemplates" collapsed={collapsed}>
              App Templates
            </SidebarNavItem>
            <SidebarNavItem
              to="/config/CatalogMicroservices"
              collapsed={collapsed}
            >
              Catalog Microservices
            </SidebarNavItem>
            <SidebarNavItem to="/config/Registries" collapsed={collapsed}>
              Registries
            </SidebarNavItem>
            <SidebarNavItem to="/config/ConfigMaps" collapsed={collapsed}>
              Config Maps
            </SidebarNavItem>
            <SidebarNavItem to="/config/secret" collapsed={collapsed}>
              Secrets
            </SidebarNavItem>
            <SidebarNavItem to="/config/VolumeMounts" collapsed={collapsed}>
              Volume Mounts
            </SidebarNavItem>
            <SidebarNavItem to="/config/certificates" collapsed={collapsed}>
              Certificates
            </SidebarNavItem>
          </SidebarNavGroup>

          <SidebarNavGroup
            label="Network"
            icon={<Hub size={18} />}
            collapsed={collapsed}
            paths={["/config/services"]}
          >
            <SidebarNavItem to="/config/services" collapsed={collapsed}>
              Services
            </SidebarNavItem>
          </SidebarNavGroup>

          {isNatsEnabled ? (
            <SidebarNavGroup
              label="MessageBus"
              icon={<MessageBusIcon size={18} />}
              collapsed={collapsed}
              paths={[
                "/messagebus/operators",
                "/messagebus/accounts",
                "/messagebus/users",
              ]}
            >
              <SidebarNavItem
                to="/messagebus/operators"
                collapsed={collapsed}
              >
                Operators
              </SidebarNavItem>
              <SidebarNavItem to="/messagebus/accounts" collapsed={collapsed}>
                Accounts
              </SidebarNavItem>
              <SidebarNavItem to="/messagebus/users" collapsed={collapsed}>
                Users
              </SidebarNavItem>
            </SidebarNavGroup>
          ) : null}

          <SidebarNavGroup
            label="Access Control"
            icon={<AccessControlIcon size={18} />}
            collapsed={collapsed}
            paths={[
              "/access-control/roles",
              "/access-control/rolebindings",
              "/access-control/serviceaccounts",
              "/access-control/nats-account-rules",
              "/access-control/nats-user-rules",
            ]}
          >
            <SidebarNavItem to="/access-control/roles" collapsed={collapsed}>
              Roles
            </SidebarNavItem>
            <SidebarNavItem
              to="/access-control/rolebindings"
              collapsed={collapsed}
            >
              Role Bindings
            </SidebarNavItem>
            <SidebarNavItem
              to="/access-control/serviceaccounts"
              collapsed={collapsed}
            >
              Service Accounts
            </SidebarNavItem>
            <SidebarNavItem
              to="/access-control/nats-account-rules"
              collapsed={collapsed}
            >
              NATs Account Rules
            </SidebarNavItem>
            <SidebarNavItem
              to="/access-control/nats-user-rules"
              collapsed={collapsed}
            >
              NATs User Rules
            </SidebarNavItem>
          </SidebarNavGroup>

          {isEmbeddedAuth ? (
            <SidebarNavGroup
              label="IAM"
              icon={<UsersIcon size={18} />}
              collapsed={collapsed}
              paths={[
                "/account",
                "/access-control/users",
                "/access-control/groups",
              ]}
            >
              <SidebarNavItem to="/account" collapsed={collapsed}>
                My Account
              </SidebarNavItem>
              <SidebarNavItem to="/access-control/users" collapsed={collapsed}>
                Users
              </SidebarNavItem>
              <SidebarNavItem to="/access-control/groups" collapsed={collapsed}>
                Groups
              </SidebarNavItem>
            </SidebarNavGroup>
          ) : (
            <SidebarNavItem
              to="/account"
              icon={<UserCircleIcon size={18} />}
              collapsed={collapsed}
            >
              My Account
            </SidebarNavItem>
          )}

          <SidebarNavItem
            to="/events"
            icon={<EventIcon size={18} />}
            collapsed={collapsed}
          >
            Events
          </SidebarNavItem>

          <SidebarNavItem
            to="/config/pollingSettings"
            icon={<TuneIcon size={18} />}
            collapsed={collapsed}
          >
            Console Config
          </SidebarNavItem>

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
