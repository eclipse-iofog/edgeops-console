import React, { useMemo, useState } from "react";
import CustomDataTable from "@/components/ui/CustomDataTable";
import {
  ControllerContext,
  useData,
  useResourceList,
  useResourceStore,
  useTerminal,
} from "@/app/providers";
import { FeedbackContext } from "@/app/providers";
import UnsavedChangesModal from "@/components/ui/UnsavedChangesModal";
import CustomLoadingModal from "@/components/ui/CustomLoadingModal";
import SlideOver from "@/components/ui/SlideOver";
import { format, formatDistanceToNow } from "date-fns";
import yaml from "js-yaml";
import { useLocation } from "react-router-dom";
import { useUnifiedYamlUpload } from "../../../hooks/useUnifiedYamlUpload";
import {
  dumpMicroserviceTemplateYaml,
  parseMicroserviceTemplateYaml,
} from "@/lib/yaml/parseMicroserviceTemplateYaml";

function controllerErrorMessage(res: any, fallback: string) {
  return res?.message || res?.statusText || fallback;
}

function variableKeys(row: any): string[] {
  const variables = row?.variables;
  if (Array.isArray(variables)) {
    return variables.map((variable: any) => variable?.key).filter(Boolean);
  }
  if (variables && typeof variables === "object") {
    return Object.keys(variables);
  }
  return [];
}

function unwrapTemplate(payload: any) {
  return payload?.microserviceTemplate || payload;
}

function MicroserviceTemplates() {
  const {
    items: microserviceTemplates,
    loading: listLoading,
  } = useResourceList("microserviceTemplates");
  const microserviceTemplatesStore = useResourceStore("microserviceTemplates");
  const [detailFetching, setDetailFetching] = useState(false);
  const { request } = React.useContext(ControllerContext);
  const { pushFeedback } = React.useContext(FeedbackContext);
  const { refreshData } = useData();
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const microserviceTemplateName = params.get("microserviceTemplateName");
  const { addYamlSession, addDeploySession } = useTerminal();

  const catalog = useMemo(
    () => (microserviceTemplates as any[]) || [],
    [microserviceTemplates],
  );

  const handleRowClick = (row: any) => {
    if (row.name) {
      fetchTemplateItem(row.name);
    }
  };

  React.useEffect(() => {
    if (microserviceTemplateName && catalog.length) {
      const found = catalog.find(
        (item: any) => item.name === microserviceTemplateName,
      );
      if (found) {
        handleRowClick(found);
        setIsOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microserviceTemplateName, catalog]);

  async function fetchTemplateItem(name: string) {
    try {
      setDetailFetching(true);
      const itemResponse = await request(
        `/api/v3/microserviceTemplates/${name}`,
      );
      if (!itemResponse.ok) {
        pushFeedback({
          message: controllerErrorMessage(
            itemResponse,
            "Failed to fetch microservice template",
          ),
          type: "error",
        });
        setDetailFetching(false);
        return;
      }
      const responseItem = await itemResponse.json();
      setSelectedTemplate(unwrapTemplate(responseItem));
      setIsOpen(true);
      setDetailFetching(false);
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error" });
      setDetailFetching(false);
    }
  }

  const handleRefreshTemplate = async () => {
    if (!selectedTemplate?.name) return;
    try {
      const itemResponse = await request(
        `/api/v3/microserviceTemplates/${selectedTemplate.name}`,
      );
      if (itemResponse.ok) {
        const responseItem = await itemResponse.json();
        setSelectedTemplate(unwrapTemplate(responseItem));
      }
    } catch (e) {
      console.error("Error refreshing microservice template data:", e);
    }
  };

  const refreshFunctions = React.useMemo(() => {
    const map = new Map();
    map.set("MicroserviceTemplate", async () => {
      await microserviceTemplatesStore.fetch({ silent: true });
    });
    map.set("Microservice", async () => {
      await refreshData();
    });
    return map;
  }, [microserviceTemplatesStore, refreshData]);

  const { processYamlFile: processUnifiedYaml } = useUnifiedYamlUpload({
    request,
    pushFeedback,
    refreshFunctions,
  });

  const removeTemplate = async (item: any) => {
    try {
      const res = await request(`/api/v3/microserviceTemplates/${item.name}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        pushFeedback({
          message: controllerErrorMessage(
            res,
            "Failed to delete microservice template",
          ),
          type: "error",
        });
      } else {
        pushFeedback({
          message: "Microservice template deleted",
          type: "success",
        });
        setShowDeleteConfirmModal(false);
        setIsOpen(false);
        setSelectedTemplate(null);
        await microserviceTemplatesStore.fetch({ silent: true });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  async function handleYamlUpdate(content: string) {
    try {
      const parsedDoc = yaml.load(content);
      const [templateItem, err] = await parseMicroserviceTemplateYaml(parsedDoc);
      if (err) {
        pushFeedback({ message: err, type: "error" });
        return;
      }
      const { name: _name, ...updateBody } = templateItem;
      const res = await request(
        `/api/v3/microserviceTemplates/${selectedTemplate?.name}`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "content-type": "application/json",
          },
          body: JSON.stringify(updateBody),
        },
      );
      if (!res.ok) {
        pushFeedback({
          message: controllerErrorMessage(res, "Something went wrong"),
          type: "error",
        });
        return;
      }
      pushFeedback({
        message: `${selectedTemplate?.name} Updated`,
        type: "success",
      });
      setIsOpen(false);
      await microserviceTemplatesStore.fetch({ silent: true });
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  }

  const handleEditYaml = () => {
    if (!selectedTemplate) return;

    const yamlString = dumpMicroserviceTemplateYaml(selectedTemplate);

    addYamlSession({
      title: `MS Template YAML: ${selectedTemplate?.name}`,
      content: yamlString,
      isDirty: false,
      onSave: async (content: string) => {
        await handleYamlUpdate(content);
      },
    });
  };

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
      key: "description",
      header: "Description",
      render: (row: any) => <span>{row.description || "-"}</span>,
    },
    {
      key: "variables",
      header: "Variables",
      render: (row: any) => {
        const keys = variableKeys(row);
        return <span>{keys.length ? keys.join(", ") : "-"}</span>;
      },
    },
  ];

  const slideOverFields = [
    {
      label: "Microservice Template Details",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "Name",
      render: (row: any) => row.name || "N/A",
    },
    {
      label: "Description",
      render: (row: any) => row.description || "N/A",
    },
    ...(selectedTemplate?.createdAt
      ? [
          {
            label: "Created",
            render: (row: any) => {
              const date = new Date(row.createdAt);
              return (
                <>
                  {formatDistanceToNow(date, { addSuffix: true })} <br />
                  <span className="text-xs text-gray-400">
                    {format(date, "PPpp")}
                  </span>
                </>
              );
            },
          },
        ]
      : []),
    ...(selectedTemplate?.updatedAt
      ? [
          {
            label: "Updated",
            render: (row: any) => {
              const date = new Date(row.updatedAt);
              return (
                <>
                  {formatDistanceToNow(date, { addSuffix: true })} <br />
                  <span className="text-xs text-gray-400">
                    {format(date, "PPpp")}
                  </span>
                </>
              );
            },
          },
        ]
      : []),
    {
      label: "Variables",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (node: any) => {
        const variables = node?.variables || [];

        if (!Array.isArray(variables) || variables.length === 0) {
          return (
            <div className="text-sm text-gray-400">No variables available.</div>
          );
        }

        const tableData = variables.map((variable: any, index: number) => ({
          key: variable.key || `variable-${index}`,
          description: variable.description,
          defaultValue: variable.defaultValue,
        }));

        return (
          <CustomDataTable
            columns={[
              {
                key: "key",
                header: "Key",
                formatter: ({ row }: any) => (
                  <span className="text-white">{row.key}</span>
                ),
              },
              {
                key: "description",
                header: "Description",
                formatter: ({ row }: any) => (
                  <span className="text-white">{row.description || "-"}</span>
                ),
              },
              {
                key: "defaultValue",
                header: "Default Value",
                formatter: ({ row }: any) => {
                  const value = row.defaultValue;
                  if (value === null || value === undefined || value === "") {
                    return (
                      <span className="text-gray-400 italic">No default</span>
                    );
                  }
                  return <span className="text-white">{String(value)}</span>;
                },
              },
            ]}
            data={tableData}
            getRowKey={(row: any) => row.key}
          />
        );
      },
    },
  ];

  const showLoadingModal = listLoading || detailFetching;

  return (
    <>
      {showLoadingModal ? (
        <CustomLoadingModal
          open={true}
          message="Fetching MS Template List"
          spinnerSize="lg"
          spinnerColor="text-green-500"
          overlayOpacity={60}
        />
      ) : (
        <>
          <div className="bg-gray-900 text-white p-4">
            <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
              Microservice Templates
            </h1>

            <CustomDataTable
              columns={columns}
              data={catalog}
              getRowKey={(row: any) => row.name}
              uploadDropzone
              uploadFunction={processUnifiedYaml}
              closeMenuRowKey={selectedTemplate?.name}
            />
          </div>
          <SlideOver
            open={isOpen}
            onClose={() => setIsOpen(false)}
            onPublish={() => {
              if (selectedTemplate) {
                addDeploySession({
                  title: `Microservice Template Form: ${selectedTemplate.name}`,
                  template: selectedTemplate,
                  kind: "microserviceTemplate",
                  isDirty: false,
                });
              }
            }}
            onDelete={() => setShowDeleteConfirmModal(true)}
            onEditYaml={handleEditYaml}
            title={selectedTemplate?.name || "Microservice Template Details"}
            data={selectedTemplate}
            fields={slideOverFields}
            customWidth={900}
            enablePolling={true}
            onRefresh={handleRefreshTemplate}
          />
          <UnsavedChangesModal
            open={showDeleteConfirmModal}
            onCancel={() => {
              setShowDeleteConfirmModal(false);
            }}
            onConfirm={() => removeTemplate(selectedTemplate)}
            title={`Delete ${selectedTemplate?.name}`}
            message={
              "This action will remove the microservice template from the system. This is not reversible."
            }
            cancelLabel={"Cancel"}
            confirmLabel={"Delete"}
          />
        </>
      )}
    </>
  );
}

export default MicroserviceTemplates;
