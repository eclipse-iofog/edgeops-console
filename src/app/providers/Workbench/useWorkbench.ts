import { useContext } from "react";

import { WorkbenchContext, type WorkbenchContextValue } from "./WorkbenchProvider";

export function useWorkbench(): WorkbenchContextValue {
  const context = useContext(WorkbenchContext);
  if (!context) {
    throw new Error("useWorkbench must be used within a WorkbenchProvider");
  }
  return context;
}
