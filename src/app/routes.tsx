import { Routes } from "react-router-dom";

import { createWorkbenchRouteElements } from "@/app/providers/Workbench/routeComponentMap";

type AppRoutesProps = {
  collapsed: boolean;
};

export default function AppRoutes({ collapsed }: AppRoutesProps) {
  return (
    <Routes>{createWorkbenchRouteElements({ collapsed })}</Routes>
  );
}
