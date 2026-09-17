import React, { useCallback, useRef, useEffect } from "react";
import DeployApplicationTemplate from "@/Catalog/Application/DeployApplicationTemplate";
import DeployMicroserviceTemplate from "@/Catalog/Microservice/DeployMicroserviceTemplate";
import type { DeployFormKind } from "@/app/providers/Terminal/TerminalProvider";

interface StableDeployTabProps {
  sessionId: string;
  template: any;
  kind?: DeployFormKind;
  onClose: () => void;
  onDirtyChange: (isDirty: boolean) => void;
  onDeployFunctionChange?: (deployFunction: any) => void;
}

const StableDeployTab: React.FC<StableDeployTabProps> = ({
  template,
  kind,
  onClose,
  onDirtyChange,
  onDeployFunctionChange,
}) => {
  const deployFunctionRef = useRef<any>(null);

  const handleDeployFunction = useCallback(
    (deployData: any) => {
      deployFunctionRef.current = deployData;
      const hasChanges = deployData.isValid && deployData.loading === false;
      onDirtyChange(hasChanges);

      if (onDeployFunctionChange) {
        onDeployFunctionChange(deployData);
      }
    },
    [onDirtyChange, onDeployFunctionChange],
  );

  useEffect(() => {
    if (onDeployFunctionChange && deployFunctionRef.current) {
      onDeployFunctionChange(deployFunctionRef.current);
    }
  }, [onDeployFunctionChange]);

  return (
    <div className="h-full flex flex-col">
      {kind === "microserviceTemplate" ? (
        <DeployMicroserviceTemplate
          template={template}
          close={onClose}
          onDeploy={handleDeployFunction}
        />
      ) : (
        <DeployApplicationTemplate
          template={template}
          close={onClose}
          onDeploy={handleDeployFunction}
        />
      )}
    </div>
  );
};

export default StableDeployTab;
