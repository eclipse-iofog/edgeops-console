import React, { useEffect, useState } from "react";
// import { RotateCcw as RotateIcon } from "lucide-react";
import { ControllerContext } from "@/app/providers";
import { FeedbackContext } from "@/app/providers";
import { useUnifiedYamlUpload } from "../../hooks/useUnifiedYamlUpload";
import YamlUploadDropzone from "@/components/yaml/YamlUploadDropzone";
import { CopyableBlock } from "../components/SecureTextTools";

function Operators() {
  const { request } = React.useContext(ControllerContext);
  const { pushFeedback } = React.useContext(FeedbackContext);
  const [operator, setOperator] = useState<any | null>(null);
  // const [showRotateModal, setShowRotateModal] = useState(false);
  const [hub, setHub] = useState<any | null>(null);

  const fetchData = async () => {
    const operatorRes = await request("/api/v3/nats/operator");
    if (operatorRes?.ok) {
      const data = await operatorRes.json();
      setOperator(data);
    }

    const hubRes = await request("/api/v3/nats/hub");
    if (hubRes?.ok) {
      const data = await hubRes.json();
      setHub(data);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshFunctions = React.useMemo(() => {
    const map = new Map();
    map.set("NatsAccountRule", async () => fetchData());
    map.set("NatsUserRule", async () => fetchData());
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { processYamlFile: processUnifiedYaml } = useUnifiedYamlUpload({
    request,
    pushFeedback,
    refreshFunctions,
  });

  // const handleRotate = async () => {
  //   const res = await request("/api/v3/nats/operator/rotate", {
  //     method: "POST",
  //   });
  //   if (!res?.ok) {
  //     pushFeedback({
  //       message: res?.message || "Failed to rotate operator",
  //       type: "error",
  //     });
  //     return;
  //   }
  //   pushFeedback({
  //     message: "NATs operator rotation has been scheduled.",
  //     type: "success",
  //   });
  //   setShowRotateModal(false);
  //   fetchData();
  // };

  return (
    <div className="bg-gray-900 text-white overflow-auto p-4">
      <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
        NATs Operators
      </h1>

      <div className="flex gap-2 mb-4 items-center">
        {/* <button
          className="px-3 py-2 rounded bg-yellow-600 hover:bg-yellow-700 text-white text-sm flex items-center gap-2"
          onClick={() => setShowRotateModal(true)}
        >
          <RotateIcon size={14} />
          Rotate Operator
        </button> */}
        <YamlUploadDropzone onUpload={processUnifiedYaml} />
      </div>

      <div className="space-y-4">
        <div className="bg-gray-800 rounded border border-gray-700 p-4 text-sm">
          <div className="mb-2">
            <span className="text-gray-400">Operator: </span>
            <span>{operator?.name || "N/A"}</span>
          </div>
          <div>
            <span className="text-gray-400">Public Key: </span>
            <span>{operator?.publicKey || "N/A"}</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded border border-gray-700 p-4 text-sm">
          <div className="text-gray-300 font-semibold mb-2">Operator JWT</div>
          <CopyableBlock value={operator?.jwt} canDecodeJwt />
        </div>

        <div className="bg-gray-800 rounded border border-gray-700 p-4 text-sm">
          <div className="text-gray-300 font-semibold mb-2">NATs Hub</div>
          <pre className="text-xs whitespace-pre-wrap break-all bg-gray-900 p-3 rounded border border-gray-700">
            {JSON.stringify(hub || {}, null, 2)}
          </pre>
        </div>
      </div>

      {/* <UnsavedChangesModal
        open={showRotateModal}
        onCancel={() => setShowRotateModal(false)}
        onConfirm={handleRotate}
        title="Rotate NATs Operator"
        message="Rotating the operator key re-signs NATs accounts/users and can impact messaging authentication cluster-wide. During reconciliation, clients may see temporary auth failures and require reconnects. Proceed only in a planned maintenance window with rollback readiness."
        cancelLabel="Cancel"
        confirmLabel="Rotate"
      /> */}
    </div>
  );
}

export default Operators;
