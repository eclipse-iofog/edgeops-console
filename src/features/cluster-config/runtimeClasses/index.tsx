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
import { parseRuntimeClassYaml } from "@/lib/yaml/parseRuntimeClassYaml";
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

function RuntimeClasses() {
  const { data } = useData();
  const {
    items: runtimeClasses,
    loading: listLoading,
  } = useResourceList("runtimeClasses");
  const runtimeClassesStore = useResourceStore("runtimeClasses");
  const [detailFetching, setDetailFetching] = useState(false);
  const { request } = React.useContext(ControllerContext);
  const { pushFeedback } = React.useContext(FeedbackContext);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRuntimeClass, setSelectedRuntimeClass] = useState<any | null>(
    null,
  );
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const runtimeClassName = params.get("runtimeClassName");
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
        ([uuid, agent]: [string, any]) => {
          const isEdgelet = agent.containerEngine === "edgelet";
          const engine = agent.containerEngine || "unknown";
          return {
            value: uuid,
            label: isEdgelet
              ? agent.name
              : `${agent.name} (${engine} — Runtime Classes attach to Edgelet only)`,
            isDisabled: !isEdgelet,
          };
        },
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

  const handleRowClick = (row: any) => {
    if (row.name) {
      fetchRuntimeClassItem(row.name);
    }
  };

  useEffect(() => {
    if (runtimeClassName && runtimeClasses) {
      const found = (runtimeClasses as any[]).find(
        (runtimeClass: any) => runtimeClass.name === runtimeClassName,
      );
      if (found) {
        handleRowClick(found);
        setIsOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runtimeClassName, runtimeClasses]);

  async function fetchRuntimeClassItem(name: string) {
    try {
      setDetailFetching(true);
      const itemResponse = await request(`/api/v3/runtimeClasses/${name}`);
      if (!itemResponse.ok) {
        pushFeedback({
          message: controllerErrorMessage(
            itemResponse,
            "Failed to fetch runtime class",
          ),
          type: "error",
        });
        setDetailFetching(false);
        return;
      }
      const responseItem = await itemResponse.json();
      setSelectedRuntimeClass(responseItem);
      const fogUuidsResponse = await request(
        `/api/v3/runtimeClasses/${name}/link`,
      );
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
    map.set("RuntimeClass", async () => {
      await runtimeClassesStore.fetch({ silent: true });
    });
    return map;
  }, [runtimeClassesStore]);

  const { processYamlFile: processUnifiedYaml } = useUnifiedYamlUpload({
    request,
    pushFeedback,
    refreshFunctions,
  });

  const handleRefreshRuntimeClass = async () => {
    if (!selectedRuntimeClass?.name) return;
    try {
      const itemResponse = await request(
        `/api/v3/runtimeClasses/${selectedRuntimeClass.name}`,
      );
      if (itemResponse.ok) {
        const responseItem = await itemResponse.json();
        setSelectedRuntimeClass(responseItem);
      }
      const fogUuidsResponse = await request(
        `/api/v3/runtimeClasses/${selectedRuntimeClass.name}/link`,
      );
      if (fogUuidsResponse.ok) {
        const fogUuidsData = await fogUuidsResponse.json();
        setLinkedAgentItems(
          mapLinkedAgents(fogUuidsData.fogUuids, data?.reducedAgents?.byUUID),
        );
      }
    } catch (e) {
      console.error("Error refreshing runtime class data:", e);
    }
  };

  const attachRuntimeClass = async () => {
    try {
      const res = await request(
        `/api/v3/runtimeClasses/${selectedRuntimeClass.name}/link`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            fogUuids: agentsToAttach.map((item: any) => item.value),
          }),
        },
      );

      if (!res.ok) {
        pushFeedback({
          message: controllerErrorMessage(
            res,
            "Failed to attach runtime class",
          ),
          type: "error",
        });
        return;
      }
      pushFeedback({ message: "Runtime Class Attached", type: "success" });
      setShowAttachModal(false);
      setAgentsToAttach([]);
      setIsOpen(false);
      await runtimeClassesStore.fetch({ silent: true });
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const detachRuntimeClass = async () => {
    try {
      const res = await request(
        `/api/v3/runtimeClasses/${selectedRuntimeClass.name}/link`,
        {
          method: "DELETE",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            fogUuids: agentsToDetach.map((item: any) => item.value),
          }),
        },
      );

      if (!res.ok) {
        pushFeedback({
          message: controllerErrorMessage(
            res,
            "Failed to detach runtime class",
          ),
          type: "error",
        });
        return;
      }
      pushFeedback({ message: "Runtime Class Detached", type: "success" });
      setShowDetachModal(false);
      setAgentsToDetach([]);
      setIsOpen(false);
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const handleDeleteRuntimeClass = async () => {
    try {
      if (!selectedRuntimeClass?.name) {
        pushFeedback({ message: "No runtime class selected", type: "error" });
        return;
      }

      const res = await request(
        `/api/v3/runtimeClasses/${selectedRuntimeClass.name}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        pushFeedback({
          message: controllerErrorMessage(res, "Failed to delete runtime class"),
          type: "error",
        });
      } else {
        pushFeedback({
          message: `RuntimeClass ${selectedRuntimeClass.name} deleted`,
          type: "success",
        });
        setShowDeleteConfirmModal(false);
        setIsOpen(false);
        setSelectedRuntimeClass(null);
        await runtimeClassesStore.fetch({ silent: true });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const handleEditYaml = () => {
    const yamlDump = {
      apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
      kind: "RuntimeClass",
      metadata: {
        name: selectedRuntimeClass?.name,
      },
      handler: selectedRuntimeClass?.handler,
    };

    const yamlString = yaml.dump(yamlDump, { noRefs: true, indent: 2 });

    addYamlSession({
      title: `RuntimeClass YAML: ${selectedRuntimeClass?.name}`,
      content: yamlString,
      isDirty: false,
      onSave: async (content: string) => {
        try {
          const parsedDoc = yaml.load(content);

          const [runtimeClassItem, err] =
            await parseRuntimeClassYaml(parsedDoc);

          if (err) {
            pushFeedback({ message: err, type: "error" });
            return;
          }

          await handleYamlUpdate(runtimeClassItem);
        } catch (e: any) {
          pushFeedback({ message: e.message, type: "error", uuid: "error" });
        }
      },
    });
  };

  async function handleYamlUpdate(parsed: any) {
    try {
      const { name: _name, ...updateBody } = parsed;
      const res = await request(
        `/api/v3/runtimeClasses/${selectedRuntimeClass?.name}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(updateBody),
        },
      );

      if (res === null || !res.ok) {
        pushFeedback({
          message: controllerErrorMessage(res, "Something went wrong"),
          type: "error",
        });
      } else {
        const updatedName =
          parsed.name || selectedRuntimeClass?.name || "RuntimeClass";
        pushFeedback({
          message: `RuntimeClass: ${updatedName} Updated`,
          type: "success",
        });
        setIsOpen(false);
        await runtimeClassesStore.fetch({ silent: true });
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
      key: "handler",
      header: "Handler",
      render: (row: any) => <span>{row.handler || "-"}</span>,
    },
  ];

  const slideOverFields = [
    {
      label: "Runtime Class Details",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "Name",
      render: (row: any) => row.name || "N/A",
    },
    {
      label: "Handler",
      render: (row: any) => row.handler || "N/A",
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
            message="Fetching Runtime Class List"
            spinnerSize="lg"
            spinnerColor="text-green-500"
            overlayOpacity={60}
          />
        </>
      ) : (
        <>
          <div className="bg-gray-900 text-white p-4">
            <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
              Runtime Classes
            </h1>

            <CustomDataTable
              columns={columns}
              data={(runtimeClasses as any[]) || []}
              getRowKey={(row: any) => row.name || Math.random()}
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
              title={selectedRuntimeClass?.name || "Runtime Class Details"}
              data={selectedRuntimeClass}
              fields={slideOverFields}
              customWidth={600}
              enablePolling={true}
              onRefresh={handleRefreshRuntimeClass}
            />
          </div>

          <CustomActionModal
            open={showAttachModal}
            onConfirm={attachRuntimeClass}
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
            title={`Attach ${selectedRuntimeClass?.name}`}
          />

          <CustomActionModal
            open={showDetachModal}
            onConfirm={detachRuntimeClass}
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
            title={`Detach from ${selectedRuntimeClass?.name}`}
          />

          <UnsavedChangesModal
            open={showDeleteConfirmModal}
            onCancel={() => setShowDeleteConfirmModal(false)}
            onConfirm={handleDeleteRuntimeClass}
            title={`Deleting Runtime Class ${selectedRuntimeClass?.name}`}
            message={
              "This action will delete the runtime class. If any microservices pin this runtime, the Controller will refuse the delete. This is not reversible."
            }
            cancelLabel={"Cancel"}
            confirmLabel={"Delete"}
          />
        </>
      )}
    </>
  );
}

export default RuntimeClasses;
