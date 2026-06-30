import React, { useEffect, useState } from "react";
import CustomDataTable from "@/components/ui/CustomDataTable";
import SlideOver from "@/components/ui/SlideOver";
import { ControllerContext } from "@/app/providers";
import { FeedbackContext } from "@/app/providers";
import CustomActionModal from "@/components/ui/CustomActionModal";
import { CopyableBlock } from "../components/SecureTextTools";
import { useUnifiedYamlUpload } from "../../hooks/useUnifiedYamlUpload";

function Accounts() {
  const { request } = React.useContext(ControllerContext);
  const { pushFeedback } = React.useContext(FeedbackContext);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showEnsureModal, setShowEnsureModal] = useState(false);
  const [appName, setAppName] = useState("");
  const [ensureNatsRule, setEnsureNatsRule] = useState("");

  const fetchAccounts = async () => {
    const res = await request("/api/v3/nats/accounts");
    if (!res?.ok) {
      pushFeedback({
        message: res?.message || "Failed to fetch NATs accounts",
        type: "error",
      });
      return;
    }
    const data = await res.json();
    setAccounts(data.accounts || []);
  };

  useEffect(() => {
    fetchAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshFunctions = React.useMemo(() => {
    const map = new Map();
    map.set("NatsAccountRule", async () => fetchAccounts());
    map.set("NatsUserRule", async () => fetchAccounts());
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { processYamlFile: processUnifiedYaml } = useUnifiedYamlUpload({
    request,
    pushFeedback,
    refreshFunctions,
  });

  const handleEnsure = async () => {
    if (!appName) {
      pushFeedback({ message: "Application name is required", type: "error" });
      return;
    }

    const body: { natsRule?: string } = {};
    if (ensureNatsRule?.trim()) body.natsRule = ensureNatsRule.trim();

    const res = await request(
      `/api/v3/nats/accounts/${encodeURIComponent(appName)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: Object.keys(body).length ? JSON.stringify(body) : undefined,
      },
    );

    if (!res?.ok) {
      pushFeedback({
        message: res?.message || "Failed to ensure NATs account",
        type: "error",
      });
      return;
    }

    pushFeedback({
      message: `NATs account ensured for application ${appName}`,
      type: "success",
    });
    setShowEnsureModal(false);
    setAppName("");
    setEnsureNatsRule("");
    fetchAccounts();
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (row: any) => (
        <div
          className="cursor-pointer text-blue-400 hover:underline"
          onClick={() => {
            setSelectedAccount(row);
            setIsOpen(true);
          }}
        >
          {row.name}
        </div>
      ),
    },
    { key: "publicKey", header: "Public Key" },
    {
      key: "applicationId",
      header: "Application ID",
      render: (row: any) => row.applicationId ?? "-",
    },
    {
      key: "isSystem",
      header: "System",
      render: (row: any) => (row.isSystem ? "Yes" : "No"),
    },
    {
      key: "isLeafSystem",
      header: "Leaf System",
      render: (row: any) => (row.isLeafSystem ? "Yes" : "No"),
    },
  ];

  const fields = [
    { label: "Name", render: (row: any) => row?.name || "N/A" },
    { label: "Public Key", render: (row: any) => row?.publicKey || "N/A" },
    {
      label: "Application ID",
      render: (row: any) => row?.applicationId ?? "N/A",
    },
    { label: "System", render: (row: any) => (row?.isSystem ? "Yes" : "No") },
    {
      label: "Leaf System",
      render: (row: any) => (row?.isLeafSystem ? "Yes" : "No"),
    },
    {
      label: "JWT",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (row: any) => <CopyableBlock value={row?.jwt} canDecodeJwt />,
    },
  ];

  return (
    <div className="bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
        NATs Accounts
      </h1>
      <div className="mb-4">
        <button
          className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
          onClick={() => setShowEnsureModal(true)}
        >
          Ensure Account By Application
        </button>
      </div>
      <CustomDataTable
        columns={columns}
        data={accounts}
        getRowKey={(row: any) => row.id || row.name}
        uploadDropzone
        uploadFunction={processUnifiedYaml}
      />

      <SlideOver
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={selectedAccount?.name || "NATs Account"}
        data={selectedAccount}
        fields={fields}
        customWidth={700}
      />

      <CustomActionModal
        open={showEnsureModal}
        title="Ensure NATs Account"
        onCancel={() => setShowEnsureModal(false)}
        onConfirm={handleEnsure}
        confirmLabel="Ensure"
        child={
          <div className="flex flex-col gap-2">
            <label className="text-sm text-gray-700">Application Name</label>
            <input
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
              placeholder="my-application"
            />
            <label className="text-sm text-gray-700">
              NATS Account Rule (optional)
            </label>
            <input
              value={ensureNatsRule}
              onChange={(e) => setEnsureNatsRule(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
              placeholder="e.g. application-account-rule"
            />
          </div>
        }
      />
    </div>
  );
}

export default Accounts;
