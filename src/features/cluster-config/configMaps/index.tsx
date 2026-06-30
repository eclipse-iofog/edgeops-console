/* eslint-disable react-hooks/rules-of-hooks */
import React, { useEffect, useState } from "react";
import CustomDataTable from "@/components/ui/CustomDataTable";
import {
  ControllerContext,
  useResourceList,
  useResourceStore,
} from "@/app/providers";
import { FeedbackContext } from "@/app/providers";
import SlideOver from "@/components/ui/SlideOver";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/theme-tomorrow";
import "ace-builds/src-noconflict/mode-yaml";
import yaml from "js-yaml";
import { useLocation } from "react-router-dom";
import lget from "lodash/get";
import {
  Trash2 as DeleteOutlineIcon,
  Pencil as EditOutlinedIcon,
} from "lucide-react";
import CustomLoadingModal from "@/components/ui/CustomLoadingModal";
import UnsavedChangesModal from "@/components/ui/UnsavedChangesModal";
import { useTerminal } from "@/app/providers";
import { useUnifiedYamlUpload } from "../../../hooks/useUnifiedYamlUpload";
import {
  CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
  isAllowedControllerApiVersion,
  invalidControllerApiVersionMessage,
} from "@/lib/constants/constants";

function ConfigMaps() {
  const {
    items: configMaps,
    loading: listLoading,
  } = useResourceList("configMaps");
  const configMapsStore = useResourceStore("configMaps");
  const [detailFetching, setDetailFetching] = useState(false);
  const { request } = React.useContext(ControllerContext);
  const { pushFeedback } = React.useContext(FeedbackContext);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedConfigMap, setSelectedConfigMap] = useState<any | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const { addYamlSession } = useTerminal();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const configMapName = params.get("configMapName");
  const [dirtyEditors, setDirtyEditors] = React.useState<
    Record<string, boolean>
  >({});
  const [editorValues, setEditorValues] = React.useState<
    Record<string, string>
  >({});
  const handleRowClick = (row: any) => {
    if (row.name) {
      fetchConfigMapItem(row.name);
    }
  };

  useEffect(() => {
    if (configMapName && configMaps) {
      const found = configMaps.find(
        (config: any) => config.name === configMapName,
      );
      if (found) {
        handleRowClick(found);
        setIsOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configMapName, configMaps]);

  async function fetchConfigMapItem(configMapName: string) {
    try {
      setDetailFetching(true);
      const itemResponse = await request(`/api/v3/configmaps/${configMapName}`);
      if (!itemResponse.ok) {
        pushFeedback({ message: itemResponse.message, type: "error" });
        setDetailFetching(false);
        return;
      }
      const responseItem = await itemResponse.json();
      setSelectedConfigMap(responseItem);
      setIsOpen(true);
      setDetailFetching(false);
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error" });
      setDetailFetching(false);
    }
  }

  const handleRefreshConfigMap = async () => {
    if (!selectedConfigMap?.name) return;
    try {
      const itemResponse = await request(
        `/api/v3/configmaps/${selectedConfigMap.name}`,
      );
      if (itemResponse.ok) {
        const responseItem = await itemResponse.json();
        setSelectedConfigMap(responseItem);
      }
    } catch (e) {
      console.error("Error refreshing config map data:", e);
    }
  };

  const refreshFunctions = React.useMemo(() => {
    const map = new Map();
    map.set("ConfigMap", async () => {
      await configMapsStore.fetch({ silent: true });
    });
    return map;
  }, [configMapsStore]);

  const { processYamlFile: processUnifiedYaml } = useUnifiedYamlUpload({
    request,
    pushFeedback,
    refreshFunctions,
  });

  const handleEditYaml = () => {
    const { name, immutable, useVault, data = {} } = selectedConfigMap || {};

    const yamlObj = {
      apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
      kind: "ConfigMap",
      metadata: { name },
      spec: { immutable, useVault },
    };
    let yamlHeader = yaml
      .dump(yamlObj, {
        noRefs: true,
        indent: 2,
        lineWidth: -1,
      })
      .trimEnd();

    let dataSection = "data:\n";
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string" && value.includes("\n")) {
        dataSection += `  ${key}: |\n`;
        for (const line of value.split("\n")) {
          dataSection += `    ${line}\n`;
        }
      } else {
        dataSection += `  ${key}: ${value}\n`;
      }
    }

    const yamlString = `${yamlHeader}\n${dataSection}`;

    addYamlSession({
      title: `ConfigMap YAML: ${selectedConfigMap?.name}`,
      content: yamlString,
      isDirty: false,
      onSave: async (content: string) => {
        try {
          const parsedDoc = yaml.load(content);
          const [configMap, err] = await parseConfigMap(parsedDoc);

          if (err) {
            pushFeedback({ message: err, type: "error" });
            return;
          }

          await handleYamlUpdate(configMap, "PATCH");
        } catch (e: any) {
          pushFeedback({ message: e.message, type: "error", uuid: "error" });
        }
      },
    });
  };

  async function handleYamlUpdate(configMap: any, method?: string) {
    try {
      const name = configMap.name;

      const res = await request(
        `/api/v3/configmaps${method === "PATCH" && name ? `/${name}` : ""}`,
        {
          method: method,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(configMap),
        },
      );

      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
      } else {
        pushFeedback({
          message: `${name} ${method === "POST" ? "Added" : "Updated"}`,
          type: "success",
        });
        setIsOpen(false);
        await configMapsStore.fetch({ silent: true });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  }

  const parseConfigMap = async (doc: any) => {
    if (!isAllowedControllerApiVersion(doc.apiVersion)) {
      return [{}, invalidControllerApiVersionMessage(doc.apiVersion)];
    }
    if (doc.kind !== "ConfigMap") {
      return [{}, `Invalid kind ${doc.kind}`];
    }
    if (!doc.metadata || !doc.data) {
      return [{}, "Invalid YAML format"];
    }
    const configMap = {
      name: lget(doc, "metadata.name", lget(doc, "spec.name", undefined)),
      immutable: lget(doc, "spec.immutable", false),
      useVault: lget(doc, "spec.useVault", false),
      data: lget(doc, "data", {}),
    };

    return [configMap];
  };

  const handleSave = async (key: string, updatedYamlString: string) => {
    try {
      const { name, immutable, useVault, data = {} } = selectedConfigMap || {};

      const yamlObj = {
        apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
        kind: "ConfigMap",
        metadata: { name },
        spec: { immutable, useVault },
      };

      const yamlHeader = yaml
        .dump(yamlObj, {
          noRefs: true,
          indent: 2,
          lineWidth: -1,
        })
        .trimEnd();

      let dataSection = "data:\n";
      for (const [dataKey, value] of Object.entries(data)) {
        if (typeof value === "string" && value.includes("\n")) {
          dataSection += `  ${dataKey}: |\n`;
          for (const line of value.split("\n")) {
            dataSection += `    ${line}\n`;
          }
        } else {
          dataSection += `  ${dataKey}: ${value}\n`;
        }
      }

      const yamlString = `${yamlHeader}\n${dataSection}`;
      const parsedObj = yaml.load(yamlString) as any;

      if (!parsedObj?.data) {
        parsedObj.data = {};
      }

      parsedObj.data[key] = updatedYamlString;

      const [configMap, err] = await parseConfigMap(parsedObj);
      if (err) {
        return pushFeedback({ message: err, type: "error" });
      }

      if (!selectedConfigMap?.name) {
        return pushFeedback({
          message: "ConfigMap name is required",
          type: "error",
        });
      }

      const res = await request(
        `/api/v3/configmaps/${selectedConfigMap.name}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(configMap),
        },
      );

      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
      } else {
        pushFeedback({
          message: `${selectedConfigMap.name} Updated`,
          type: "success",
        });
        setIsOpen(false);
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const handleDelete = async (key: string) => {
    try {
      const { name, immutable, useVault, data = {} } = selectedConfigMap || {};

      const yamlObj = {
        apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
        kind: "ConfigMap",
        metadata: { name },
        spec: { immutable, useVault },
      };

      const yamlHeader = yaml
        .dump(yamlObj, {
          noRefs: true,
          indent: 2,
          lineWidth: -1,
        })
        .trimEnd();

      let dataSection = "data:\n";
      for (const [dataKey, value] of Object.entries(data)) {
        if (dataKey === key) continue;

        if (typeof value === "string" && value.includes("\n")) {
          dataSection += `  ${dataKey}: |\n`;
          for (const line of value.split("\n")) {
            dataSection += `    ${line}\n`;
          }
        } else {
          dataSection += `  ${dataKey}: ${value}\n`;
        }
      }

      const yamlString = `${yamlHeader}\n${dataSection}`;
      const parsedObj = yaml.load(yamlString) as any;

      const [configMap, err] = await parseConfigMap(parsedObj);
      if (err) {
        return pushFeedback({ message: err, type: "error" });
      }

      if (!selectedConfigMap?.name) {
        return pushFeedback({
          message: "ConfigMap name is required",
          type: "error",
        });
      }

      const res = await request(
        `/api/v3/configmaps/${selectedConfigMap.name}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(configMap),
        },
      );

      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
      } else {
        pushFeedback({
          message: `${selectedConfigMap.name} Deleted key ${key}`,
          type: "success",
        });
        setIsOpen(false);
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const handleDeleteConfigMap = async () => {
    try {
      if (!selectedConfigMap?.name) {
        pushFeedback({ message: "No config map selected", type: "error" });
        return;
      }

      const res = await request(
        `/api/v3/configmaps/${selectedConfigMap.name}`,
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
          message: `ConfigMap ${selectedConfigMap.name} deleted`,
          type: "success",
        });
        setShowDeleteConfirmModal(false);
        setIsOpen(false);
        setSelectedConfigMap(null);
        await configMapsStore.fetch({ silent: true });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const showLoadingModal = listLoading || detailFetching;

  const columns = [
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
      key: "immutable",
      header: "immutable",
      render: (row: any) => <span>{row.immutable.toString() || "-"}</span>,
    },
  ];

  const slideOverFields = [
    {
      label: "Config Map Details",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "Name",
      render: (row: any) => row.name || "N/A",
    },
    {
      label: "Immutable",
      render: (row: any) => row.immutable.toString() || "N/A",
    },
    {
      label: "Use Vault",
      render: (row: any) => row.useVault.toString() || "N/A",
    },
    {
      label: "Data",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (node: any) => {
        const entries = Object.entries(node?.data || {});

        const handleChange = (
          key: string,
          newValue: string,
          originalValue: string,
        ) => {
          setEditorValues((prev) => ({ ...prev, [key]: newValue }));
          const isDirty = newValue !== originalValue;
          setDirtyEditors((prev) => ({ ...prev, [key]: isDirty }));
        };

        return (
          <div className="space-y-6">
            {entries.map(([key, rawValue], index) => {
              let parsed: any = null;

              try {
                if (typeof rawValue === "string") {
                  parsed = JSON.parse(rawValue);
                } else if (typeof rawValue === "object") {
                  parsed = rawValue;
                } else {
                  parsed = rawValue;
                }
              } catch (e) {
                parsed = rawValue;
              }

              const finalContent =
                typeof parsed === "object" ? yaml.dump(parsed) : (parsed ?? "");

              const lineHeight = 10;
              const minLines = 10;
              const maxLines = 30;
              const lineCount = Math.max(
                minLines,
                Math.min(
                  finalContent.toString()?.split("\n")?.length,
                  maxLines,
                ),
              );
              const dynamicHeight = `${lineCount * lineHeight}px`;

              const displayValue = editorValues[key] ?? finalContent.toString();

              return (
                <div key={index}>
                  <div className="flex justify-between">
                    <h2 className="text-sm font-semibold text-gray-300 mb-2">
                      {key}
                    </h2>
                    <div className="flex space-x-2">
                      {dirtyEditors[key] && (
                        <button
                          onClick={() => {
                            handleSave(key, displayValue);
                            setDirtyEditors((prev) => ({
                              ...prev,
                              [key]: false,
                            }));
                          }}
                          className="hover:text-green-600 hover:bg-white rounded"
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          handleDelete(key);
                        }}
                        className="hover:text-red-600 hover:bg-white rounded"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </button>
                    </div>
                  </div>

                  <AceEditor
                    mode="yaml"
                    theme="tomorrow"
                    name={`editor-${key}`}
                    value={displayValue}
                    showPrintMargin={false}
                    setOptions={{
                      useWorker: false,
                      wrap: true,
                      tabSize: 2,
                    }}
                    onChange={(newValue) =>
                      handleChange(key, newValue, finalContent.toString())
                    }
                    onLoad={(editor) => {
                      editor.renderer.setPadding(10);
                      editor.renderer.setScrollMargin(10);
                      editor.getSession().setUseWrapMode(true);
                      setTimeout(() => editor.resize(), 300);
                    }}
                    style={{
                      width: "100%",
                      height: dynamicHeight,
                      borderRadius: "4px",
                    }}
                  />
                </div>
              );
            })}
          </div>
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
            message="Fetching Service Details"
            spinnerSize="lg"
            spinnerColor="text-green-500"
            overlayOpacity={60}
          />
        </>
      ) : (
        <>
          <div className="bg-gray-900 text-white p-4">
            <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
              Config Maps List
            </h1>

            <CustomDataTable
              columns={columns}
              data={configMaps}
              getRowKey={(row: any) => row.id}
              uploadDropzone
              uploadFunction={processUnifiedYaml}
            />
            <SlideOver
              open={isOpen}
              onClose={() => setIsOpen(false)}
              onDelete={() => setShowDeleteConfirmModal(true)}
              onEditYaml={handleEditYaml}
              title={selectedConfigMap?.name || "Config Map Details"}
              data={selectedConfigMap}
              fields={slideOverFields}
              customWidth={600}
              enablePolling={true}
              onRefresh={handleRefreshConfigMap}
            />

            <UnsavedChangesModal
              open={showDeleteConfirmModal}
              onCancel={() => setShowDeleteConfirmModal(false)}
              onConfirm={handleDeleteConfigMap}
              title={`Deleting Config Map ${selectedConfigMap?.name}`}
              message={
                "This action will remove the config map from the system. If any Volume Mounts are using this config map, they will be deleted and If any microservices are using this config map, they will need to be updated to use a different config map. This is not reversible."
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

export default ConfigMaps;
