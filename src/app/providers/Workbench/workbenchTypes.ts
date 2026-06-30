export const MAX_WORKBENCH_TABS = 12;

export type WorkbenchTab = {
  id: string;
  path: string;
  search: string;
  title: string;
  pinned: boolean;
  createdAt: number;
};

export type OpenTabParams = {
  path: string;
  title?: string;
  search?: string;
  pinned?: boolean;
};

export type OpenTabResult = "focused" | "opened" | "replaced" | "blocked";
