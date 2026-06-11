import React, { useEffect, useState, useMemo } from "react";
import CustomDataTable from "@/components/ui/CustomDataTable";
import { ControllerContext } from "@/app/providers";
import { FeedbackContext } from "@/app/providers";
import SlideOver from "@/components/ui/SlideOver";
import { NavLink } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useData } from "@/app/providers";
import { StatusColor, StatusType } from "@/lib/constants/Enums/StatusColor";
import CustomLoadingModal from "@/components/ui/CustomLoadingModal";
import CustomActionModal from "@/components/ui/CustomActionModal";
import CustomSelect from "@/components/ui/CustomSelect";
import UnsavedChangesModal from "@/components/ui/UnsavedChangesModal";
import yaml from "js-yaml";
import { useTerminal } from "@/app/providers";
import { parseVolumeMount } from "@/lib/yaml/parseVolumeMountsYaml";
import { useUnifiedYamlUpload } from "../../../hooks/useUnifiedYamlUpload";
import { CANONICAL_DISPLAY_CONTROLLER_API_VERSION } from "@/lib/constants/constants";

function VolumeMounts() {
  const { data } = useData();
  const [fetching, setFetching] = React.useState(true);
  const [volumeMounts, setVolumeMounts] = React.useState<any[]>([]);
  const { request } = React.useContext(ControllerContext);
  const { pushFeedback } = React.useContext(FeedbackContext);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedVolume, setselectedVolume] = useState<any | null>(null);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const volumeMountName = params.get("volumeMountName");
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showDetachModal, setShowDetachModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const { addYamlSession } = useTerminal();

  const [allAgentOptions, setAllAgentOptions] = useState<any[]>([]);
  const [linkedAgentItems, setLinkedAgentItems] = useState<any[]>([]);
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

  const handleRowClick = (row: any) => {
    if (row.name) {
      fetchVolumeMountItem(row.name);
    }
  };

  useEffect(() => {
    if (volumeMountName && volumeMounts) {
      const found = volumeMounts.find(
        (volumeMount: any) => volumeMount.name === volumeMountName,
      );
      if (found) {
        handleRowClick(found);
        setIsOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volumeMountName, volumeMounts]);

  async function fetchVolumeMounts() {
    try {
      setFetching(true);
      const volumeMountsItemsResponse = await request("/api/v3/volumeMounts");
      if (!volumeMountsItemsResponse.ok) {
        pushFeedback({
          message: volumeMountsItemsResponse.statusText,
          type: "error",
        });
        setFetching(false);
        return;
      }
      const volumeMountsItems = await volumeMountsItemsResponse.json();
      setVolumeMounts(
        Array.isArray(volumeMountsItems) ? volumeMountsItems : [],
      );
      setFetching(false);
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error" });
      setFetching(false);
    }
  }

  const handleRefreshVolumeMount = async () => {
    if (!selectedVolume?.name) return;
    try {
      const itemResponse = await request(
        `/api/v3/volumeMounts/${selectedVolume.name}`,
      );
      if (itemResponse.ok) {
        const responseItem = await itemResponse.json();
        setselectedVolume(responseItem);
        // Also refresh linked agents
        if (responseItem.agents && Array.isArray(responseItem.agents)) {
          const linkedAgents = responseItem.agents
            .map((agentUuid: string) => {
              const agent = data?.reducedAgents?.byUUID[agentUuid];
              return agent ? { value: agentUuid, label: agent.name } : null;
            })
            .filter(Boolean);
          setLinkedAgentItems(linkedAgents);
        }
      }
    } catch (e) {
      console.error("Error refreshing volume mount data:", e);
    }
  };

  async function fetchVolumeMountItem(volumeName: string) {
    try {
      setFetching(true);
      const itemResponse = await request(`/api/v3/volumeMounts/${volumeName}`);
      if (!itemResponse.ok) {
        pushFeedback({ message: itemResponse.statusText, type: "error" });
        setFetching(false);
        return;
      }
      const responseItem = await itemResponse.json();
      setselectedVolume(responseItem);
      const fogUuidsResponse = await request(
        `/api/v3/volumeMounts/${volumeName}/link`,
      );
      if (!fogUuidsResponse.ok) {
        pushFeedback({ message: fogUuidsResponse.statusText, type: "error" });
        setFetching(false);
        return;
      }
      const fogUuidsData = await fogUuidsResponse.json();
      const fogUuids = fogUuidsData.fogUuids || [];

      const linkedItems = (Array.isArray(fogUuids) ? fogUuids : [])
        .map((uuid: string) => {
          const agent = data?.reducedAgents?.byUUID?.[uuid];
          return agent
            ? { value: uuid, label: agent.name, status: agent.daemonStatus }
            : null;
        })
        .filter(
          (item): item is { value: string; label: string; status: string } =>
            item !== null,
        );
      setLinkedAgentItems(linkedItems);

      setIsOpen(true);
      setFetching(false);
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error" });
      setFetching(false);
    }
  }

  useEffect(() => {
    fetchVolumeMounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Unified YAML upload hook
  const refreshFunctions = React.useMemo(() => {
    const map = new Map();
    map.set("VolumeMount", async () => {
      await fetchVolumeMounts();
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { processYamlFile: processUnifiedYaml } = useUnifiedYamlUpload({
    request,
    pushFeedback,
    refreshFunctions,
  });

  const attachVolumeMount = async () => {
    try {
      const res = await request(
        `/api/v3/volumeMounts/${selectedVolume.name}/link`,
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
        pushFeedback({ message: res.message, type: "error" });
        return;
      } else {
        pushFeedback({ message: "Volume Mount Attached", type: "success" });
        setShowAttachModal(false);
        setAgentsToAttach([]);
        setIsOpen(false);
        fetchVolumeMounts();
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const detachVolumeMount = async () => {
    try {
      const res = await request(
        `/api/v3/volumeMounts/${selectedVolume.name}/link`,
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
        pushFeedback({ message: res.message, type: "error" });
        return;
      } else {
        pushFeedback({ message: "Volume Mount Detached", type: "success" });
        setShowDetachModal(false);
        setAgentsToDetach([]);
        setIsOpen(false);
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const handleDeleteVolumeMount = async () => {
    try {
      if (!selectedVolume?.name) {
        pushFeedback({ message: "No volume mount selected", type: "error" });
        return;
      }

      const res = await request(`/api/v3/volumeMounts/${selectedVolume.name}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        pushFeedback({
          message: res.statusText || "Failed to delete volume mount",
          type: "error",
        });
      } else {
        pushFeedback({
          message: `VolumeMount ${selectedVolume.name} deleted`,
          type: "success",
        });
        setShowDeleteConfirmModal(false);
        setIsOpen(false);
        setselectedVolume(null);
        fetchVolumeMounts();
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const handleEditYaml = () => {
    const yamlDump = {
      apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
      kind: "VolumeMount",
      metadata: {
        name: selectedVolume?.name,
      },
      spec: {
        configMapName: selectedVolume?.configMapName,
        secretName: selectedVolume?.secretName,
      },
    };

    const yamlString = yaml.dump(yamlDump, { noRefs: true, indent: 2 });

    addYamlSession({
      title: `VolumeMountYAML: ${selectedVolume?.name}`,
      content: yamlString,
      isDirty: false,
      onSave: async (content: string) => {
        try {
          const parsedDoc = yaml.load(content);

          const [volumeMountItem, err] = await parseVolumeMount(parsedDoc);

          if (err) {
            pushFeedback({ message: err, type: "error" });
            return;
          }

          await handleYamlUpdate(volumeMountItem, "PATCH");
        } catch (e: any) {
          pushFeedback({ message: e.message, type: "error", uuid: "error" });
        }
      },
    });
  };

  async function handleYamlUpdate(parsed: any, method?: string) {
    try {
      // Remove null values from the payload
      const cleanedPayload: any = { ...parsed };
      if (
        cleanedPayload.secretName === null ||
        cleanedPayload.secretName === undefined
      ) {
        delete cleanedPayload.secretName;
      }
      if (
        cleanedPayload.configMapName === null ||
        cleanedPayload.configMapName === undefined
      ) {
        delete cleanedPayload.configMapName;
      }

      const res = await request(
        `/api/v3/volumeMounts${method === "PATCH" && selectedVolume?.name ? `/${selectedVolume.name}` : ""}`,
        {
          method: method,
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(cleanedPayload),
        },
      );

      if (res === null || !res.ok) {
        pushFeedback({
          message: res?.statusText ?? "Something went wrong",
          type: "error",
        });
      } else {
        const volumeMountName =
          parsed.name || selectedVolume?.name || "VolumeMount";
        pushFeedback({
          message: `VolumeMount: ${volumeMountName} ${method === "POST" ? "Added" : "Updated"}`,
          type: "success",
        });
        if (method === "PATCH") {
          setIsOpen(false);
        }
        // Refresh the list after successful POST or PATCH
        fetchVolumeMounts();
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
      key: "secretName",
      header: "Secret Name",
      render: (row: any) => <span>{row.secretName || "-"}</span>,
    },
    {
      key: "configMapName",
      header: "ConfigMap Name",
      render: (row: any) => <span>{row.configMapName || "-"}</span>,
    },
    {
      key: "version",
      header: "version",
      render: (row: any) => <span>{row.version || "-"}</span>,
    },
  ];

  const slideOverFields = [
    {
      label: "Volume Mount Details",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "Name",
      render: (row: any) => row.name || "N/A",
    },
    {
      label: "Secret Name",
      render: (row: any) => {
        if (!row.secretName) return <span className="text-gray-400">N/A</span>;
        return (
          <NavLink
            to={`/config/secret?secretName=${encodeURIComponent(row.secretName)}`}
            className="text-blue-400 underline cursor-pointer"
          >
            {row.secretName}
          </NavLink>
        );
      },
    },
    {
      label: "Config Map Name",
      render: (row: any) => {
        if (!row.configMapName)
          return <span className="text-gray-400">N/A</span>;
        return (
          <NavLink
            to={`/config/ConfigMaps?configMapName=${encodeURIComponent(row.configMapName)}`}
            className="text-blue-400 underline cursor-pointer"
          >
            {row.configMapName}
          </NavLink>
        );
      },
    },
    {
      label: "uuid",
      render: (row: any) => row.uuid || "N/A",
    },
    {
      label: "Version",
      render: (row: any) => row.version || "N/A",
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
                {linkedAgentItems.map((linkedItem: any) => {
                  const statusKey = linkedItem.status;
                  const bgColor =
                    StatusColor[statusKey as StatusType] ?? "#9CA3AF";

                  return (
                    <div
                      key={linkedItem.value}
                      className="p-3 hover:bg-gray-750/50 transition-all duration-200 group"
                    >
                      <NavLink
                        to={`/nodes/list?agentId=${encodeURIComponent(linkedItem.value)}`}
                        className="flex items-center justify-between"
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
                      </NavLink>
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

  return (
    <>
      {fetching ? (
        <>
          <CustomLoadingModal
            open={true}
            message="Fetching Volume Mount List"
            spinnerSize="lg"
            spinnerColor="text-green-500"
            overlayOpacity={60}
          />
        </>
      ) : (
        <>
          <div className="bg-gray-900 text-white overflow-auto p-4">
            <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
              Volume Mount List
            </h1>

            <CustomDataTable
              columns={columns}
              data={volumeMounts || []}
              getRowKey={(row: any) => row.uuid || row.id || Math.random()}
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
              title={selectedVolume?.name || "Secret Details"}
              data={selectedVolume}
              fields={slideOverFields}
              customWidth={600}
              enablePolling={true}
              onRefresh={handleRefreshVolumeMount}
            />
          </div>

          <CustomActionModal
            open={showAttachModal}
            onConfirm={attachVolumeMount}
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
            title={`Attach ${selectedVolume?.name}`}
          />

          <CustomActionModal
            open={showDetachModal}
            onConfirm={detachVolumeMount}
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
            title={`Detach from ${selectedVolume?.name}`}
          />

          <UnsavedChangesModal
            open={showDeleteConfirmModal}
            onCancel={() => setShowDeleteConfirmModal(false)}
            onConfirm={handleDeleteVolumeMount}
            title={`Deleting Volume Mount ${selectedVolume?.name}`}
            message={
              "This action will remove the volume mount from all linked fog nodes. If any microservices are using this volume mount, they will need to be updated to use a different volume mount. This is not reversible."
            }
            cancelLabel={"Cancel"}
            confirmLabel={"Delete"}
          />
        </>
      )}
    </>
  );
}

export default VolumeMounts;
