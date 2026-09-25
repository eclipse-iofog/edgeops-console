import React, { useEffect, useState, useMemo } from "react";
import CustomDataTable from "@/components/ui/CustomDataTable";
import {
  ControllerContext,
  useResourceList,
  useResourceStore,
} from "@/app/providers";
import { FeedbackContext } from "@/app/providers";
import SlideOver from "@/components/ui/SlideOver";
import ResourceLink from "@/components/ui/ResourceLink";
import { useLocation } from "react-router-dom";
import { useData } from "@/app/providers";
import { StatusColor, StatusType } from "@/lib/constants/Enums/StatusColor";
import CustomLoadingModal from "@/components/ui/CustomLoadingModal";
import CustomActionModal from "@/components/ui/CustomActionModal";
import CustomSelect from "@/components/ui/CustomSelect";
import UnsavedChangesModal from "@/components/ui/UnsavedChangesModal";
import yaml from "js-yaml";
import { useTerminal } from "@/app/providers";
import { parseKnowledgeYaml } from "@/lib/yaml/parseKnowledgeYaml";
import { useUnifiedYamlUpload } from "../../../hooks/useUnifiedYamlUpload";
import { CANONICAL_DISPLAY_CONTROLLER_API_VERSION } from "@/lib/constants/constants";

type LinkedAgentItem = {
  value: string;
  label: string;
  status: string;
};

function controllerErrorMessage(res: any, fallback: string) {
  return res?.message || res?.statusText || fallback;
}

function mapLinkedAgents(
  fogUuids: unknown,
  byUUID: Record<string, any> | undefined,
): LinkedAgentItem[] {
  return (Array.isArray(fogUuids) ? fogUuids : [])
    .map((uuid: string) => {
      const agent = byUUID?.[uuid];
      return agent
        ? { value: uuid, label: agent.name, status: agent.daemonStatus }
        : null;
    })
    .filter((item): item is LinkedAgentItem => item !== null);
}

function Knowledge() {
  const { data } = useData();
  const { items: knowledge, loading: listLoading } = useResourceList("knowledge");
  const knowledgeStore = useResourceStore("knowledge");
  const { items: registries } = useResourceList("registries");
  const [detailFetching, setDetailFetching] = useState(false);
  const { request } = React.useContext(ControllerContext);
  const { pushFeedback } = React.useContext(FeedbackContext);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedKnowledge, setSelectedKnowledge] = useState<any | null>(null);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const knowledgeName = params.get("knowledgeName");
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showDetachModal, setShowDetachModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const { addYamlSession } = useTerminal();

  const [allAgentOptions, setAllAgentOptions] = useState<any[]>([]);
  const [linkedAgentItems, setLinkedAgentItems] = useState<LinkedAgentItem[]>(
    [],
  );
  const [agentsToAttach, setAgentsToAttach] = useState<any[]>([]);
  const [agentsToDetach, setAgentsToDetach] = useState<any[]>([]);

  useEffect(() => {
    if (data?.reducedAgents?.byUUID) {
      const allOptions = Object.entries(data.reducedAgents.byUUID).map(
        ([uuid, agent]: [string, any]) => ({
          value: uuid,
          label: agent.name,
        }),
      );
      setAllAgentOptions(allOptions);
    }
  }, [data]);

  const linkedAgentUuidsSet = useMemo(
    () => new Set(linkedAgentItems.map((item) => item.value)),
    [linkedAgentItems],
  );

  const availableToAttachOptions = useMemo(() => {
    return allAgentOptions.filter(
      (option) => !linkedAgentUuidsSet.has(option.value),
    );
  }, [allAgentOptions, linkedAgentUuidsSet]);

  const registriesById = useMemo(() => {
    const map = new Map<string, any>();
    for (const registry of registries as any[]) {
      if (registry?.id != null) {
        map.set(String(registry.id), registry);
      }
    }
    return map;
  }, [registries]);

  const isHuggingFaceRegistry = (registryId: unknown) => {
    if (registryId == null || registryId === "") {
      return false;
    }
    return registriesById.get(String(registryId))?.type === "hf";
  };

  const handleRowClick = (row: any) => {
    if (row.name) {
      fetchKnowledgeItem(row.name);
    }
  };

  useEffect(() => {
    if (knowledgeName && knowledge) {
      const found = (knowledge as any[]).find(
        (item: any) => item.name === knowledgeName,
      );
      if (found) {
        handleRowClick(found);
        setIsOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knowledgeName, knowledge]);

  async function fetchKnowledgeItem(name: string) {
    try {
      setDetailFetching(true);
      const itemResponse = await request(`/api/v3/knowledge/${name}`);
      if (!itemResponse.ok) {
        pushFeedback({
          message: controllerErrorMessage(
            itemResponse,
            "Failed to fetch knowledge",
          ),
          type: "error",
        });
        setDetailFetching(false);
        return;
      }
      const responseItem = await itemResponse.json();
      setSelectedKnowledge(responseItem);
      const fogUuidsResponse = await request(`/api/v3/knowledge/${name}/link`);
      if (!fogUuidsResponse.ok) {
        pushFeedback({
          message: controllerErrorMessage(
            fogUuidsResponse,
            "Failed to fetch linked fog nodes",
          ),
          type: "error",
        });
        setDetailFetching(false);
        return;
      }
      const fogUuidsData = await fogUuidsResponse.json();
      setLinkedAgentItems(
        mapLinkedAgents(fogUuidsData.fogUuids, data?.reducedAgents?.byUUID),
      );

      setIsOpen(true);
      setDetailFetching(false);
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error" });
      setDetailFetching(false);
    }
  }

  const refreshFunctions = React.useMemo(() => {
    const map = new Map();
    map.set("Knowledge", async () => {
      await knowledgeStore.fetch({ silent: true });
    });
    return map;
  }, [knowledgeStore]);

  const { processYamlFile: processUnifiedYaml } = useUnifiedYamlUpload({
    request,
    pushFeedback,
    refreshFunctions,
  });

  const handleRefreshKnowledge = async () => {
    if (!selectedKnowledge?.name) return;
    try {
      const itemResponse = await request(
        `/api/v3/knowledge/${selectedKnowledge.name}`,
      );
      if (itemResponse.ok) {
        const responseItem = await itemResponse.json();
        setSelectedKnowledge(responseItem);
      }
      const fogUuidsResponse = await request(
        `/api/v3/knowledge/${selectedKnowledge.name}/link`,
      );
      if (fogUuidsResponse.ok) {
        const fogUuidsData = await fogUuidsResponse.json();
        setLinkedAgentItems(
          mapLinkedAgents(fogUuidsData.fogUuids, data?.reducedAgents?.byUUID),
        );
      }
    } catch (e) {
      console.error("Error refreshing knowledge:", e);
    }
  };

  const attachKnowledge = async () => {
    try {
      const res = await request(`/api/v3/knowledge/${selectedKnowledge.name}/link`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          fogUuids: agentsToAttach.map((item: any) => item.value),
        }),
      });

      if (!res.ok) {
        pushFeedback({
          message: controllerErrorMessage(res, "Failed to attach knowledge"),
          type: "error",
        });
        return;
      }
      pushFeedback({ message: "Knowledge attached", type: "success" });
      setShowAttachModal(false);
      setAgentsToAttach([]);
      setIsOpen(false);
      await knowledgeStore.fetch({ silent: true });
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const detachKnowledge = async () => {
    try {
      const res = await request(`/api/v3/knowledge/${selectedKnowledge.name}/link`, {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          fogUuids: agentsToDetach.map((item: any) => item.value),
        }),
      });

      if (!res.ok) {
        pushFeedback({
          message: controllerErrorMessage(res, "Failed to detach knowledge"),
          type: "error",
        });
        return;
      }
      pushFeedback({ message: "Knowledge detached", type: "success" });
      setShowDetachModal(false);
      setAgentsToDetach([]);
      setIsOpen(false);
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const handleDeleteKnowledge = async () => {
    try {
      if (!selectedKnowledge?.name) {
        pushFeedback({ message: "No knowledge selected", type: "error" });
        return;
      }

      const res = await request(`/api/v3/knowledge/${selectedKnowledge.name}`, {
        method: "DELETE",
      });

      if (!res?.ok) {
        pushFeedback({
          message: controllerErrorMessage(res, "Failed to delete knowledge"),
          type: "error",
        });
      } else {
        pushFeedback({
          message: `Knowledge ${selectedKnowledge.name} deleted`,
          type: "success",
        });
        setShowDeleteConfirmModal(false);
        setIsOpen(false);
        setSelectedKnowledge(null);
        await knowledgeStore.fetch({ silent: true });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const handleEditYaml = () => {
    const spec: Record<string, unknown> = {
      repo: selectedKnowledge?.repo,
      registryId: selectedKnowledge?.registryId,
    };
    if (selectedKnowledge?.revision != null) {
      spec.revision = selectedKnowledge.revision;
    }
    if (selectedKnowledge?.format) {
      spec.format = selectedKnowledge.format;
    }
    if (
      isHuggingFaceRegistry(selectedKnowledge?.registryId) &&
      Array.isArray(selectedKnowledge?.files)
    ) {
      spec.files = selectedKnowledge.files;
    }

    const yamlDump = {
      apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
      kind: "Knowledge",
      metadata: {
        name: selectedKnowledge?.name,
      },
      spec,
    };

    const yamlString = yaml.dump(yamlDump, { noRefs: true, indent: 2 });

    addYamlSession({
      title: `Knowledge YAML: ${selectedKnowledge?.name}`,
      content: yamlString,
      isDirty: false,
      onSave: async (content: string) => {
        try {
          const parsedDoc = yaml.load(content);

          const [knowledgeItem, err] = await parseKnowledgeYaml(parsedDoc);

          if (err) {
            pushFeedback({ message: err, type: "error" });
            return;
          }

          await handleYamlUpdate(knowledgeItem);
        } catch (e: any) {
          pushFeedback({ message: e.message, type: "error", uuid: "error" });
        }
      },
    });
  };

  async function handleYamlUpdate(parsed: any) {
    try {
      const { name: _name, ...updateBody } = parsed;
      const res = await request(`/api/v3/knowledge/${selectedKnowledge?.name}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(updateBody),
      });

      if (res === null || !res.ok) {
        pushFeedback({
          message: controllerErrorMessage(res, "Something went wrong"),
          type: "error",
        });
      } else {
        const updatedName = parsed.name || selectedKnowledge?.name || "Knowledge";
        pushFeedback({
          message: `Knowledge: ${updatedName} Updated`,
          type: "success",
        });
        setIsOpen(false);
        await knowledgeStore.fetch({ silent: true });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
      throw e;
    }
  }

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
      key: "repo",
      header: "Repo",
      render: (row: any) => <span>{row.repo || "-"}</span>,
    },
    {
      key: "registryId",
      header: "Registry",
      render: (row: any) => {
        if (row.registryId == null || row.registryId === "") {
          return <span>-</span>;
        }
        return (
          <ResourceLink
            path="/config/Registries"
            query={{ registryId: String(row.registryId) }}
          >
            {row.registryId}
          </ResourceLink>
        );
      },
    },
    {
      key: "format",
      header: "Format",
      render: (row: any) => <span>{row.format || "-"}</span>,
    },
  ];

  const slideOverFields = [
    {
      label: "Knowledge Details",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "uuid",
      render: (row: any) => row.uuid || "N/A",
    },
    {
      label: "Name",
      render: (row: any) => row.name || "N/A",
    },
    {
      label: "Repo",
      render: (row: any) => row.repo || "N/A",
    },
    {
      label: "Revision",
      render: (row: any) =>
        row.revision != null && row.revision !== "" ? row.revision : "N/A",
    },
    {
      label: "Registry",
      render: (row: any) => {
        if (row.registryId == null || row.registryId === "") {
          return <span className="text-gray-400">N/A</span>;
        }
        return (
          <ResourceLink
            path="/config/Registries"
            query={{ registryId: String(row.registryId) }}
          >
            {row.registryId}
          </ResourceLink>
        );
      },
    },
    {
      label: "Files",
      render: (row: any) => {
        if (!isHuggingFaceRegistry(row.registryId)) {
          return (
            <span className="text-gray-400">
              N/A — files apply when the registry type is Hugging Face
            </span>
          );
        }
        if (!Array.isArray(row.files) || row.files.length === 0) {
          return <span className="text-gray-400">N/A</span>;
        }
        return <span>{row.files.join(", ")}</span>;
      },
    },
    {
      label: "Format",
      render: (row: any) => row.format || "N/A",
    },
    {
      label: "Format hint",
      isFullSection: true,
      render: () => (
        <p className="text-xs text-gray-400">
          Known values: markdown, pdf, jsonl, parquet, arrow, sqlite, faiss,
          chroma, lance. Any other text is stored as unknown. Empty means
          omitted.
        </p>
      ),
    },
    {
      label: "Linked Fog Nodes",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "Fog Nodes",
      render: () => {
        if (!Array.isArray(linkedAgentItems) || linkedAgentItems.length === 0) {
          return (
            <div className="flex items-center space-x-2 text-gray-400">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <span>No fog nodes linked</span>
            </div>
          );
        }

        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <svg
                className="w-4 h-4 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm font-medium text-gray-300">
                {linkedAgentItems.length} fog node
                {linkedAgentItems.length !== 1 ? "s" : ""} linked
              </span>
            </div>
            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden backdrop-blur-sm">
              <div className="divide-y divide-gray-700/50">
                {linkedAgentItems.map((linkedItem: LinkedAgentItem) => {
                  const statusKey = linkedItem.status;
                  const bgColor =
                    StatusColor[statusKey as StatusType] ?? "#9CA3AF";

                  return (
                    <div
                      key={linkedItem.value}
                      className="p-3 hover:bg-gray-750/50 transition-all duration-200 group"
                    >
                      <ResourceLink
                        path="/nodes/list"
                        query={{ agentId: linkedItem.value }}
                        className="flex items-center justify-between w-full"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: bgColor }}
                          ></div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-300 group-hover:text-blue-400 transition-colors duration-200">
                              {linkedItem.value}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {linkedItem.label || "Unknown Agent"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="hidden group-hover:block">
                            <svg
                              className="w-4 h-4 text-blue-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </div>
                          <svg
                            className="w-4 h-4 text-gray-500 group-hover:text-blue-400 transition-colors duration-200"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </ResourceLink>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      },
    },
  ];

  const showLoadingModal = listLoading || detailFetching;

  return (
    <>
      {showLoadingModal ? (
        <>
          <CustomLoadingModal
            open={true}
            message="Fetching AI Knowledge Catalog"
            spinnerSize="lg"
            spinnerColor="text-green-500"
            overlayOpacity={60}
          />
        </>
      ) : (
        <>
          <div className="bg-gray-900 text-white p-4">
            <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
              AI Knowledge Catalog
            </h1>

            <CustomDataTable
              columns={columns}
              data={(knowledge as any[]) || []}
              getRowKey={(row: any) => row.uuid || row.name || Math.random()}
              uploadDropzone
              uploadFunction={processUnifiedYaml}
            />

            <SlideOver
              open={isOpen}
              onClose={() => setIsOpen(false)}
              onAttach={() => setShowAttachModal(true)}
              onDetach={() => {
                setAgentsToDetach([]);
                setShowDetachModal(true);
              }}
              onDelete={() => setShowDeleteConfirmModal(true)}
              onEditYaml={handleEditYaml}
              title={selectedKnowledge?.name || "Knowledge Details"}
              data={selectedKnowledge}
              fields={slideOverFields}
              customWidth={600}
              enablePolling={true}
              onRefresh={handleRefreshKnowledge}
            />
          </div>

          <CustomActionModal
            open={showAttachModal}
            onConfirm={attachKnowledge}
            onCancel={() => {
              setShowAttachModal(false);
              setAgentsToAttach([]);
            }}
            confirmLabel="Attach"
            confirmColor="blue"
            child={
              <div className="h-[14vh]">
                <CustomSelect
                  options={availableToAttachOptions}
                  selected={agentsToAttach}
                  setSelected={setAgentsToAttach}
                  isMulti
                  isClearable
                  placeholder="Select agent(s) to attach..."
                  className="bg-white rounded shadow"
                />
              </div>
            }
            title={`Attach ${selectedKnowledge?.name}`}
          />

          <CustomActionModal
            open={showDetachModal}
            onConfirm={detachKnowledge}
            onCancel={() => {
              setShowDetachModal(false);
              setAgentsToDetach([]);
            }}
            confirmLabel="Detach"
            confirmColor="blue"
            child={
              <div className="h-[14vh]">
                <CustomSelect
                  options={linkedAgentItems}
                  selected={agentsToDetach}
                  setSelected={setAgentsToDetach}
                  isMulti
                  isClearable
                  placeholder="Select agent(s) to detach..."
                  className="bg-white rounded shadow"
                />
              </div>
            }
            title={`Detach from ${selectedKnowledge?.name}`}
          />

          <UnsavedChangesModal
            open={showDeleteConfirmModal}
            onCancel={() => setShowDeleteConfirmModal(false)}
            onConfirm={handleDeleteKnowledge}
            title={`Deleting Knowledge ${selectedKnowledge?.name}`}
            message={
              "This action will delete the knowledge document. If any microservices still bind this name, the Controller will refuse the delete. This is not reversible."
            }
            cancelLabel={"Cancel"}
            confirmLabel={"Delete"}
          />
        </>
      )}
    </>
  );
}

export default Knowledge;
