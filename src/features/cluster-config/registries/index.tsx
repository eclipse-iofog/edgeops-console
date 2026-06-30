import React, { useEffect, useState } from "react";
import CustomDataTable from "@/components/ui/CustomDataTable";
import {
  ControllerContext,
  useResourceList,
  useResourceStore,
} from "@/app/providers";
import { FeedbackContext } from "@/app/providers";
import SlideOver from "@/components/ui/SlideOver";
import CryptoTextBox from "@/components/ui/CustomCryptoTextBox";
import CustomLoadingModal from "@/components/ui/CustomLoadingModal";
import UnsavedChangesModal from "@/components/ui/UnsavedChangesModal";
import { useLocation } from "react-router-dom";
import yaml from "js-yaml";
import { useTerminal } from "@/app/providers";
import { parseRegistries } from "@/lib/yaml/parseRegistriesYaml";
import { useUnifiedYamlUpload } from "../../../hooks/useUnifiedYamlUpload";
import { CANONICAL_DISPLAY_CONTROLLER_API_VERSION } from "@/lib/constants/constants";

function Registries() {
  const {
    items: registries,
    loading: listLoading,
  } = useResourceList("registries");
  const registriesStore = useResourceStore("registries");
  const [detailFetching, setDetailFetching] = useState(false);
  const { request } = React.useContext(ControllerContext);
  const { pushFeedback } = React.useContext(FeedbackContext);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRegistry, setSelectedRegistry] = useState<any | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const registryId = params.get("registryId");
  const { addYamlSession } = useTerminal();

  const handleRowClick = (row: any) => {
    if (row?.id != null) {
      fetchRegistryItem(row.id);
    }
  };

  async function fetchRegistryItem(id: number | string) {
    try {
      setDetailFetching(true);
      const itemResponse = await request(`/api/v3/registries/${id}`);
      if (!itemResponse.ok) {
        pushFeedback({ message: itemResponse.message, type: "error" });
        setDetailFetching(false);
        return;
      }
      const responseItem = await itemResponse.json();
      setSelectedRegistry(responseItem);
      setIsOpen(true);
      setDetailFetching(false);
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error" });
      setDetailFetching(false);
    }
  }

  const handleRefreshRegistry = async () => {
    if (!selectedRegistry?.id) return;
    try {
      const itemResponse = await request(
        `/api/v3/registries/${selectedRegistry.id}`,
      );
      if (itemResponse.ok) {
        const responseItem = await itemResponse.json();
        setSelectedRegistry(responseItem);
      }
    } catch (e) {
      console.error("Error refreshing registry data:", e);
    }
  };

  const refreshFunctions = React.useMemo(() => {
    const map = new Map();
    map.set("Registry", async () => {
      await registriesStore.fetch({ silent: true });
    });
    return map;
  }, [registriesStore]);

  const { processYamlFile: processUnifiedYaml } = useUnifiedYamlUpload({
    request,
    pushFeedback,
    refreshFunctions,
  });

  useEffect(() => {
    if (registryId && registries.length > 0) {
      const found = registries.find(
        (item: any) => item.id.toString() === registryId,
      );
      if (found) {
        fetchRegistryItem(found.id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registryId, registries]);

  const handleEditYaml = () => {
    const name = selectedRegistry?.url.replace(/\./g, "-") || "untitled";

    const yamlObj = {
      apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
      kind: "Registry",
      metadata: {
        name: name,
      },
      spec: {
        id: selectedRegistry?.id,
        url: selectedRegistry?.url,
        private: !selectedRegistry?.isPublic,
        username: selectedRegistry?.username,
        email: selectedRegistry?.userEmail,
        password: selectedRegistry?.password,
      },
    };

    const yamlString = yaml.dump(yamlObj, {
      noRefs: true,
      indent: 2,
      lineWidth: -1,
    });

    addYamlSession({
      title: `Registry YAML: ${name}`,
      content: yamlString,
      isDirty: false,
      onSave: async (content: string) => {
        try {
          const parsedDoc = yaml.load(content);
          const [registry, err] = await parseRegistries(parsedDoc);

          if (err) {
            pushFeedback({ message: err, type: "error" });
            return;
          }

          await handleYamlUpdate(registry, "PATCH");
        } catch (e: any) {
          pushFeedback({ message: e.message, type: "error", uuid: "error" });
        }
      },
    });
  };

  async function handleYamlUpdate(registries: any, method?: string) {
    try {
      const { id, ...registryBody } = registries;
      const patchId =
        method === "PATCH" ? (id ?? selectedRegistry?.id) : undefined;

      const res = await request(
        `/api/v3/registries${method === "PATCH" && patchId ? `/${patchId}` : ""}`,
        {
          method: method,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(registryBody),
        },
      );

      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
      } else {
        const registryName =
          method === "POST" ? registries.url : patchId || "New";
        pushFeedback({
          message: `Registry ${registryName} ${method === "POST" ? "Added" : "Updated"}`,
          type: "success",
        });
        if (method === "PATCH") {
          setIsOpen(false);
        }
        await registriesStore.fetch({ silent: true });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  }

  const handleDeleteRegistry = async () => {
    try {
      if (!selectedRegistry?.id) {
        pushFeedback({ message: "No registry selected", type: "error" });
        return;
      }

      const res = await request(`/api/v3/registries/${selectedRegistry.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        pushFeedback({
          message: res.message,
          type: "error",
        });
      } else {
        pushFeedback({
          message: `Registry ${selectedRegistry.url || selectedRegistry.id} deleted`,
          type: "success",
        });
        setShowDeleteConfirmModal(false);
        setIsOpen(false);
        setSelectedRegistry(null);
        await registriesStore.fetch({ silent: true });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const columns = [
    {
      key: "id",
      header: "ID",
      render: (row: any) => <span>{row.id || "-"}</span>,
    },
    {
      key: "url",
      header: "URL",
      render: (row: any) => (
        <div
          className="cursor-pointer text-blue-400 hover:underline"
          onClick={() => handleRowClick(row)}
        >
          {row.url || "-"}
        </div>
      ),
    },
    {
      key: "isPublic",
      header: "PRIVATE",
      render: (row: any) => <span>{row.isPublic ? "false" : "true"}</span>,
    },
  ];

  const slideOverFields = [
    {
      label: "ID",
      render: (row: any) => row.id ?? "N/A",
    },
    {
      label: "URL",
      render: (row: any) => row.url || "N/A",
    },
    {
      label: "Username",
      render: (row: any) => row.username || "N/A",
    },
    {
      label: "User Email",
      render: (row: any) => row.userEmail || "N/A",
    },
    {
      label: "Password",
      isFullSection: true,
      render: (row: any) => (
        <div className="py-3 flex flex-col">
          <div className="text-sm font-medium text-gray-300 mb-1">Password</div>
          <div className="text-sm text-white break-all bg-gray-800 rounded px-2 py-1">
            <CryptoTextBox data={row?.password ?? ""} mode="plain" />
          </div>
        </div>
      ),
    },
    {
      label: "Private",
      render: (row: any) => <span>{row.isPublic ? "false" : "true"}</span>,
    },
  ];

  const showLoadingModal = listLoading || detailFetching;

  return (
    <>
      {showLoadingModal ? (
        <>
          <CustomLoadingModal
            open={true}
            message="Fetching Registries"
            spinnerSize="lg"
            spinnerColor="text-green-500"
            overlayOpacity={60}
          />
        </>
      ) : (
        <>
          <div className="bg-gray-900 text-white p-4">
            <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
              Registries
            </h1>

            <CustomDataTable
              columns={columns}
              data={registries}
              getRowKey={(row: any) => row.id}
              uploadDropzone
              uploadFunction={processUnifiedYaml}
            />
          </div>
        </>
      )}
      <SlideOver
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onDelete={() => setShowDeleteConfirmModal(true)}
        title={selectedRegistry?.url || "Registry Details"}
        data={selectedRegistry}
        fields={slideOverFields}
        customWidth={600}
        onEditYaml={handleEditYaml}
        enablePolling={true}
        onRefresh={handleRefreshRegistry}
      />

      <UnsavedChangesModal
        open={showDeleteConfirmModal}
        onCancel={() => setShowDeleteConfirmModal(false)}
        onConfirm={handleDeleteRegistry}
        title={`Deleting Registry ${selectedRegistry?.url || selectedRegistry?.id}`}
        message={
          "This action will remove the registry from the system If no microservice is using this registry. This is not reversible."
        }
        cancelLabel={"Cancel"}
        confirmLabel={"Delete"}
      />
    </>
  );
}

export default Registries;
