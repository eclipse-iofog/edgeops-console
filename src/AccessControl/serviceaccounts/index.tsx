import React, { useEffect, useState } from "react";
import CustomDataTable from "@/components/ui/CustomDataTable";
import {
  ControllerContext,
  useResourceList,
  useResourceStore,
} from "@/app/providers";
import { FeedbackContext } from "@/app/providers";
import SlideOver from "@/components/ui/SlideOver";
import { useLocation } from "react-router-dom";
import "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/theme-tomorrow";
import "ace-builds/src-noconflict/mode-yaml";
import yaml from "js-yaml";
import CustomLoadingModal from "@/components/ui/CustomLoadingModal";
import UnsavedChangesModal from "@/components/ui/UnsavedChangesModal";
import { useTerminal } from "@/app/providers";
import { parseServiceAccount } from "@/lib/yaml/parseServiceAccountYaml";
import { useUnifiedYamlUpload } from "../../hooks/useUnifiedYamlUpload";
import { CANONICAL_DISPLAY_CONTROLLER_API_VERSION } from "@/lib/constants/constants";

function ServiceAccounts() {
  const {
    items: serviceAccounts,
    loading: listLoading,
  } = useResourceList("serviceAccounts");
  const serviceAccountsStore = useResourceStore("serviceAccounts");
  const [detailFetching, setDetailFetching] = useState(false);
  const { request } = React.useContext(ControllerContext);
  const { pushFeedback } = React.useContext(FeedbackContext);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedServiceAccount, setSelectedServiceAccount] = useState<
    any | null
  >(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const { addYamlSession } = useTerminal();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const serviceAccountName = params.get("serviceAccountName");

  const handleRowClick = (row: any) => {
    const appName = row?.applicationName ?? row?.application?.name;
    if (row.name && appName) {
      fetchServiceAccountItem(appName, row.name);
    }
  };

  useEffect(() => {
    if (serviceAccountName && serviceAccounts?.length) {
      const found = serviceAccounts.find(
        (sa: any) => sa.name === serviceAccountName,
      );
      if (found) {
        const appName = found.applicationName ?? found.application?.name;
        if (appName) {
          fetchServiceAccountItem(appName, found.name);
          setIsOpen(true);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceAccountName, serviceAccounts]);

  async function fetchServiceAccountItem(appName: string, name: string) {
    try {
      setDetailFetching(true);
      const itemResponse = await request(
        `/api/v3/serviceaccounts/${appName}/${name}`,
      );
      if (!itemResponse.ok) {
        pushFeedback({ message: itemResponse.message, type: "error" });
        setDetailFetching(false);
        return;
      }
      const responseItem = await itemResponse.json();
      const serviceAccount = responseItem.serviceAccount || responseItem;
      setSelectedServiceAccount(serviceAccount);
      setIsOpen(true);
      setDetailFetching(false);
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error" });
      setDetailFetching(false);
    }
  }

  const handleRefreshServiceAccount = async () => {
    const appName =
      selectedServiceAccount?.applicationName ??
      selectedServiceAccount?.application?.name;
    if (!appName || !selectedServiceAccount?.name) return;
    try {
      const itemResponse = await request(
        `/api/v3/serviceaccounts/${appName}/${selectedServiceAccount.name}`,
      );
      if (itemResponse.ok) {
        const responseItem = await itemResponse.json();
        const serviceAccount = responseItem.serviceAccount || responseItem;
        setSelectedServiceAccount(serviceAccount);
      }
    } catch (e) {
      console.error("Error refreshing service account data:", e);
    }
  };

  const refreshFunctions = React.useMemo(() => {
    const map = new Map();
    map.set("ServiceAccount", async () => {
      await serviceAccountsStore.fetch({ silent: true });
    });
    return map;
  }, [serviceAccountsStore]);

  const { processYamlFile: processUnifiedYaml } = useUnifiedYamlUpload({
    request,
    pushFeedback,
    refreshFunctions,
  });

  const handleEditYaml = () => {
    if (!selectedServiceAccount) return;
    const sa = selectedServiceAccount?.serviceAccount || selectedServiceAccount;
    const appName = sa?.applicationName ?? sa?.application?.name;
    const yamlObj: any = {
      apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
      kind: "ServiceAccount",
      metadata: {
        name: sa?.name,
        ...(appName && { applicationName: appName }),
      },
    };

    if (sa?.roleRef) {
      yamlObj.roleRef = sa.roleRef;
    }

    const yamlString = yaml.dump(yamlObj, { noRefs: true, indent: 2 });

    addYamlSession({
      title: `ServiceAccount YAML: ${sa?.name}`,
      content: yamlString,
      isDirty: false,
      onSave: async (content: string) => {
        try {
          const parsedDoc = yaml.load(content);
          const [serviceAccount, err] = await parseServiceAccount(parsedDoc);

          if (err) {
            pushFeedback({ message: err, type: "error" });
            return;
          }

          await handleYamlUpdate(serviceAccount, "PATCH");
        } catch (e: any) {
          pushFeedback({ message: e.message, type: "error", uuid: "error" });
        }
      },
    });
  };

  async function handleYamlUpdate(serviceAccount: any, method?: string) {
    try {
      const name = serviceAccount.name;
      const appName = serviceAccount.applicationName;

      const path =
        method === "PATCH" && appName
          ? `/api/v3/serviceaccounts/${appName}/${name}`
          : "/api/v3/serviceaccounts";

      const res = await request(path, {
        method: method === "PATCH" ? "PATCH" : "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(serviceAccount),
      });

      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
      } else {
        pushFeedback({
          message: `${name} ${method === "POST" ? "Added" : "Updated"}`,
          type: "success",
        });
        setIsOpen(false);
        await serviceAccountsStore.fetch({ silent: true });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  }

  const handleDeleteServiceAccount = async () => {
    try {
      const appName =
        selectedServiceAccount?.applicationName ??
        selectedServiceAccount?.application?.name;
      if (!appName || !selectedServiceAccount?.name) {
        pushFeedback({ message: "No service account selected", type: "error" });
        return;
      }

      const res = await request(
        `/api/v3/serviceaccounts/${appName}/${selectedServiceAccount.name}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        pushFeedback({
          message: res.message,
          type: "error",
        });
      } else {
        pushFeedback({
          message: `ServiceAccount ${selectedServiceAccount.name} deleted`,
          type: "success",
        });
        setShowDeleteConfirmModal(false);
        setIsOpen(false);
        setSelectedServiceAccount(null);
        await serviceAccountsStore.fetch({ silent: true });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const showLoadingModal = listLoading || detailFetching;

  const columns = [
    {
      key: "applicationName",
      header: "Application",
      render: (row: any) => {
        const appName = row?.applicationName ?? row?.application?.name ?? "-";
        return (
          <span
            className="cursor-pointer text-blue-400 hover:underline"
            onClick={() => handleRowClick(row)}
          >
            {appName}
          </span>
        );
      },
    },
    {
      key: "name",
      header: "Name",
      render: (row: any) => (
        <div
          className="cursor-pointer text-blue-400 hover:underline"
          onClick={() => handleRowClick(row)}
        >
          {row.name}
        </div>
      ),
    },
    {
      key: "roleRef",
      header: "Role Reference",
      render: (row: any) => {
        const roleRef = row?.roleRef || row?.serviceAccount?.roleRef;
        return <span>{roleRef?.name || "-"}</span>;
      },
    },
  ];

  const slideOverFields = [
    {
      label: "ServiceAccount Details",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "Application",
      render: (row: any) => {
        const sa = row?.serviceAccount || row;
        return sa?.applicationName ?? sa?.application?.name ?? "N/A";
      },
    },
    {
      label: "Name",
      render: (row: any) => {
        const sa = row?.serviceAccount || row;
        return sa?.name || "N/A";
      },
    },
    {
      label: "Role Reference",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (sa: any) => {
        // Handle both nested and root-level structures
        const saData = sa?.serviceAccount || sa;
        const roleRef = saData?.roleRef;
        if (roleRef) {
          return (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400 font-medium">Kind: </span>
                  <span className="text-white">{roleRef.kind || "N/A"}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Name: </span>
                  <span className="text-white">{roleRef.name || "N/A"}</span>
                </div>
                {roleRef.apiGroup && (
                  <div>
                    <span className="text-gray-400 font-medium">
                      API Group:{" "}
                    </span>
                    <span className="text-white">{roleRef.apiGroup}</span>
                  </div>
                )}
              </div>
            </div>
          );
        }
        return (
          <div className="text-sm text-gray-400">No role reference defined</div>
        );
      },
    },
  ];

  return (
    <>
      {showLoadingModal ? (
        <>
          <CustomLoadingModal
            open={true}
            message="Fetching ServiceAccount Details"
            spinnerSize="lg"
            spinnerColor="text-green-500"
            overlayOpacity={60}
          />
        </>
      ) : (
        <>
          <div className="bg-gray-900 text-white p-4">
            <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
              Service Accounts
            </h1>

            <CustomDataTable
              columns={columns}
              data={serviceAccounts}
              getRowKey={(row: any) =>
                row.applicationName && row.name
                  ? `${row.applicationName}/${row.name}`
                  : row.name
              }
              uploadDropzone
              uploadFunction={processUnifiedYaml}
            />
            <SlideOver
              open={isOpen}
              onClose={() => setIsOpen(false)}
              onDelete={() => setShowDeleteConfirmModal(true)}
              onEditYaml={handleEditYaml}
              title={
                selectedServiceAccount?.name
                  ? [
                      selectedServiceAccount.applicationName ??
                        selectedServiceAccount.application?.name,
                      selectedServiceAccount.name,
                    ]
                      .filter(Boolean)
                      .join(" / ") || selectedServiceAccount.name
                  : "ServiceAccount Details"
              }
              data={selectedServiceAccount}
              fields={slideOverFields}
              customWidth={600}
              enablePolling={true}
              onRefresh={handleRefreshServiceAccount}
            />

            <UnsavedChangesModal
              open={showDeleteConfirmModal}
              onCancel={() => setShowDeleteConfirmModal(false)}
              onConfirm={handleDeleteServiceAccount}
              title={`Deleting ServiceAccount ${selectedServiceAccount?.name}`}
              message={
                "This action will remove the service account from the system. This is not reversible."
              }
              cancelLabel={"Cancel"}
              confirmLabel={"Delete"}
            />
          </div>
        </>
      )}
    </>
  );
}

export default ServiceAccounts;
