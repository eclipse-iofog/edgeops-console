import React, { useCallback, useRef, useEffect } from "react";
import DeployApplicationTemplate from "@/Catalog/Application/DeployApplicationTemplate";

interface StableDeployTabProps {
  sessionId: string;
  template: any;
  onClose: () => void;
  onDirtyChange: (isDirty: boolean) => void;
  onDeployFunctionChange?: (deployFunction: any) => void;
}

const StableDeployTab: React.FC<StableDeployTabProps> = ({
  sessionId,
  template,
  onClose,
  onDirtyChange,
  onDeployFunctionChange,
}) => {
  const deployFunctionRef = useRef<any>(null);

  const handleDeployFunction = useCallback(
    (deployData: any) => {
      deployFunctionRef.current = deployData;
      // Mark as dirty if there are changes
      const hasChanges = deployData.isValid && deployData.loading === false;
      onDirtyChange(hasChanges);

      // Pass deploy function to parent for header button
      if (onDeployFunctionChange) {
        onDeployFunctionChange(deployData);
      }
    },
    [onDirtyChange, onDeployFunctionChange],
  );

  // Pass deploy function to parent whenever it changes
  useEffect(() => {
    if (onDeployFunctionChange && deployFunctionRef.current) {
      onDeployFunctionChange(deployFunctionRef.current);
    }
  }, [onDeployFunctionChange]);

  return (
    <div className="h-full flex flex-col">
      <DeployApplicationTemplate
        template={template}
        close={onClose}
        onDeploy={handleDeployFunction}
      />
    </div>
  );
};

export default StableDeployTab;
