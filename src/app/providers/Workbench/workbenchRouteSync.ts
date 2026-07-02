import type { WorkbenchTab } from "./workbenchTypes";

export type RouteLocation = {
  pathname: string;
  search: string;
};

/** Returns a navigate target when the active tab URL differs from the current location. */
export function getTabNavigateTarget(
  activeTab: WorkbenchTab | undefined,
  location: RouteLocation,
): string | null {
  if (!activeTab) {
    return null;
  }

  const target = `${activeTab.path}${activeTab.search}`;
  const current = `${location.pathname}${location.search}`;

  return target !== current ? target : null;
}
