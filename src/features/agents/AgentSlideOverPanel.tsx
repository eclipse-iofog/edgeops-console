import React, { useMemo, useState } from "react";
import {
  Copy as FileCopyIcon,
  Check as CheckIcon,
  Eye as VisibilityIcon,
  EyeOff as VisibilityOffIcon,
} from "lucide-react";
import SlideOver from "@/components/ui/SlideOver";
import UnsavedChangesModal from "@/components/ui/UnsavedChangesModal";
import CustomActionModal from "@/components/ui/CustomActionModal";
import CryptoTextBox from "@/components/ui/CustomCryptoTextBox";
import LogConfigModal, {
  LogTailConfig,
} from "@/components/ui/LogConfigModal";
import ExecConfigModal, {
  ExecConfig,
} from "@/components/ui/ExecConfigModal";
import VersionCommandModal from "@/components/ui/VersionCommandModal";
import { useData, useController, useFeedback, useTerminal, useLogViewer } from "@/app/providers";
import AgentManager from "@/app/providers/Data/agent-manager";
import { useAuth } from "@/auth";
import { getApiV3BaseUrl, getWsBaseUrl } from "@/auth/api";
import {
  buildAgentPatchBodyFromYamlContent,
  dumpAgentYAML,
} from "@/lib/yaml/agentYAML";
import {
  buildVersionCommandConfirmMessage,
  CRITICAL_AGENT_DELETE_WARNING,
  isCriticalAgent,
  VersionCommandConfig,
} from "@/lib/agentCritical";
import { buildAgentSlideOverFields } from "./agentSlideOverFields";

type AgentSlideOverPanelProps = {
  open: boolean;
  onClose: () => void;
  selectedNode: any | null;
  onSelectedNodeChange: (node: any | null) => void;
  slideOverWidth?: number;
};

const AgentSlideOverPanel: React.FC<AgentSlideOverPanelProps> = ({
  open,
  onClose,
  selectedNode,
  onSelectedNodeChange,
  slideOverWidth,
}) => {
  const { data } = useData();
  const { request } = useController();
  const { pushFeedback } = useFeedback();
  const { addTerminalSession, addYamlSession } = useTerminal();
  const { addLogSession } = useLogViewer();
  const auth = useAuth();

  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showCleanConfirmModal, setShowCleanConfirmModal] = useState(false);
  const [showProvisionKeyModal, setShowProvisionKeyModal] = useState(false);
  const [provisionKeyData, setProvisionKeyData] = useState<any | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [loadingProvisionKey, setLoadingProvisionKey] = useState(false);
  const [commandsVisible, setCommandsVisible] = useState(false);
  const [editorDataChanged, setEditorDataChanged] = useState<any>();
  const [showLogConfigModal, setShowLogConfigModal] = useState(false);
  const [showExecConfigModal, setShowExecConfigModal] = useState(false);
  const [showVersionCommandModal, setShowVersionCommandModal] = useState(false);
  const [showVersionConfirmModal, setShowVersionConfirmModal] = useState(false);
  const [pendingVersionConfig, setPendingVersionConfig] =
    useState<VersionCommandConfig | null>(null);

  const slideOverFields = useMemo(
    () => buildAgentSlideOverFields(data),
    [data],
  );

  const selectedNodeIsCritical = useMemo(
    () => isCriticalAgent(selectedNode, data?.systemApplications),
    [selectedNode, data?.systemApplications],
  );

  const handleRefreshAgent = async () => {
    if (!selectedNode?.uuid) return;
    try {
      const agents = await AgentManager.listAgents(request)();
      const updatedAgent = agents.find(
        (a: any) => a.uuid === selectedNode.uuid,
      );
      if (updatedAgent) {
        onSelectedNodeChange(updatedAgent);
      }
    } catch (e) {
      console.error("Error refreshing agent data:", e);
    }
  };

  const handleRestart = async () => {
    try {
      const res = await request(`/api/v3/iofog/${selectedNode.uuid}/reboot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
        return;
      }

      pushFeedback({ message: "Agent Rebooted", type: "success" });
      setShowResetConfirmModal(false);
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const handleDelete = async () => {
    try {
      const res = await request(`/api/v3/iofog/${selectedNode.uuid}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
        return;
      }

      pushFeedback({ message: "Agent Deleted", type: "success" });
      setShowDeleteConfirmModal(false);
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const handleClean = async () => {
    try {
      const res = await request(`/api/v3/iofog/${selectedNode.uuid}/prune`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
        return;
      }

      pushFeedback({ message: "Agent Pruned", type: "success" });
      setShowCleanConfirmModal(false);
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const handleProvisionKey = async () => {
    if (!selectedNode?.uuid) {
      pushFeedback({ message: "No agent selected", type: "error" });
      return;
    }

    setLoadingProvisionKey(true);
    setShowProvisionKeyModal(true);

    try {
      const res = await request(
        `/api/v3/iofog/${selectedNode.uuid}/provisioning-key`,
        {
          method: "GET",
          headers: {
            "content-type": "application/json",
          },
        },
      );

      if (!res.ok) {
        pushFeedback({
          message: res.message,
          type: "error",
        });
        setShowProvisionKeyModal(false);
        setLoadingProvisionKey(false);
        return;
      }

      const keyData = await res.json();
      setProvisionKeyData(keyData);
      setLoadingProvisionKey(false);
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
      setShowProvisionKeyModal(false);
      setLoadingProvisionKey(false);
    }
  };

  const handleCopyItem = async (text: string, itemName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(itemName);
      setTimeout(() => setCopiedItem(null), 1500);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const generateProvisionCommands = (): string[] => {
    const apiUrl = getApiV3BaseUrl();
    const commands: string[] = [];

    commands.push(`edgelet config --a ${apiUrl}`);

    if (provisionKeyData?.caCert) {
      commands.push(`edgelet config cert ${provisionKeyData.caCert}`);
    }

    if (provisionKeyData?.key) {
      commands.push(`edgelet provision ${provisionKeyData.key}`);
    }

    return commands;
  };

  const handleOpenTerminal = () => {
    if (!selectedNode) return;
    if (selectedNode?.daemonStatus?.toLowerCase() !== "running") {
      pushFeedback?.({
        message: "Node must be running to enable exec session",
        type: "error",
      });
      return;
    }
    setShowExecConfigModal(true);
  };

  const handleExecConfigConfirm = async (config: ExecConfig) => {
    if (!selectedNode?.uuid) return;
    setShowExecConfigModal(false);

    try {
      if (config.action === "enable") {
        if (selectedNode?.daemonStatus?.toLowerCase() !== "running") {
          pushFeedback?.({
            message: "Node must be running to enable exec session",
            type: "error",
          });
          return;
        }

        pushFeedback?.({ message: "Enabling exec session...", type: "info" });

        const body: { uuid: string; image?: string } = {
          uuid: selectedNode.uuid,
        };
        if (config.image) {
          body.image = config.image;
        }

        const res = await request(`/api/v3/iofog/${selectedNode.uuid}/exec`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          pushFeedback?.({
            message: res.message || res.statusText,
            type: "error",
          });
          return;
        }

        pushFeedback?.({
          message: `Exec enabled for agent ${selectedNode?.name}`,
          type: "success",
          agentName: selectedNode?.name,
        });

        const socketUrl = `${getWsBaseUrl()}/api/v3/microservices/system/exec/placeholder`;

        addTerminalSession({
          title: `Agent Shell: ${selectedNode?.name}`,
          socketUrl,
          authToken: auth?.user?.access_token,
          microserviceUuid: "placeholder",
          nodeUuid: selectedNode.uuid,
          waitingForDebugger: true,
          debuggerStatus: "waiting",
        });
      } else {
        pushFeedback?.({ message: "Disabling exec session...", type: "info" });

        const res = await request(`/api/v3/iofog/${selectedNode.uuid}/exec`, {
          method: "DELETE",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ uuid: selectedNode.uuid }),
        });

        if (!res.ok) {
          pushFeedback?.({
            message: res.message || res.statusText,
            type: "error",
          });
          return;
        }

        pushFeedback?.({
          message: `Exec disabled for agent ${selectedNode?.name}`,
          type: "success",
        });
      }
    } catch (err: any) {
      pushFeedback?.({
        message: err.message || "Exec operation failed",
        type: "error",
      });
    }
  };

  const handleOpenLogs = () => {
    if (!selectedNode) return;
    setShowLogConfigModal(true);
  };

  const handleOpenVersionChange = () => {
    if (!selectedNode) return;
    setShowVersionCommandModal(true);
  };

  const handleVersionCommandConfigConfirm = (config: VersionCommandConfig) => {
    setPendingVersionConfig(config);
    setShowVersionCommandModal(false);
    setShowVersionConfirmModal(true);
  };

  const handleVersionCommandConfirm = async () => {
    if (!selectedNode?.uuid || !pendingVersionConfig) return;

    try {
      const trimmedSemver = pendingVersionConfig.semver?.trim();
      const requestOptions: RequestInit = { method: "POST" };
      if (trimmedSemver) {
        requestOptions.headers = { "Content-Type": "application/json" };
        requestOptions.body = JSON.stringify({ semver: trimmedSemver });
      }

      const res = await request(
        `/api/v3/iofog/${selectedNode.uuid}/version/${pendingVersionConfig.versionCommand}`,
        requestOptions,
      );

      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
        return;
      }

      const actionLabel =
        pendingVersionConfig.versionCommand === "upgrade"
          ? "Upgrade"
          : "Rollback";
      pushFeedback({
        message: `${actionLabel} command sent to agent`,
        type: "success",
      });
      setShowVersionConfirmModal(false);
      setPendingVersionConfig(null);
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const handleLogConfigConfirm = (config: LogTailConfig) => {
    if (!selectedNode) return;
    setShowLogConfigModal(false);

    try {
      const baseUrl = `${getWsBaseUrl()}/api/v3/iofog/${selectedNode.uuid}/logs`;

      const params = new URLSearchParams();
      params.append("tail", config.tail.toString());
      params.append("follow", config.follow.toString());
      if (config.since) params.append("since", config.since);
      if (config.until) params.append("until", config.until);

      const socketUrl = `${baseUrl}?${params.toString()}`;

      addLogSession({
        title: `Logs: ${selectedNode.name}`,
        socketUrl,
        authToken: auth?.user?.access_token,
        resourceUuid: selectedNode.uuid,
        resourceName: selectedNode.name,
        sourceType: "node",
        tailConfig: config,
      });

      pushFeedback?.({
        message: "Opening log viewer...",
        type: "info",
      });
    } catch (err: any) {
      pushFeedback?.({
        message: err.message || "Failed to open logs",
        type: "error",
      });
    }
  };

  async function handleYamlUpdate(content?: string) {
    try {
      const yamlContent = content || editorDataChanged;
      const patchBody = buildAgentPatchBodyFromYamlContent(yamlContent);

      const res = await request(`/api/v3/iofog/${selectedNode?.uuid}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(patchBody),
      });

      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
        throw new Error(res.message || "Something went wrong");
      }

      pushFeedback({
        message: `Agent: ${selectedNode?.name} Config Updated`,
        type: "success",
      });
      setEditorDataChanged(null);
      onClose();
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
      throw e;
    }
  }

  const handleEditYaml = () => {
    const yamlString = dumpAgentYAML(selectedNode);

    addYamlSession({
      title: `AgentConfig YAML: ${selectedNode?.name}`,
      content: yamlString,
      isDirty: false,
      onSave: async (content: string) => {
        await handleYamlUpdate(content);
      },
    });
  };

  return (
    <>
      <SlideOver
        open={open}
        onClose={onClose}
        title={selectedNode?.name || "Agent Details"}
        data={selectedNode}
        fields={slideOverFields}
        onRestart={() => setShowResetConfirmModal(true)}
        onDelete={() => setShowDeleteConfirmModal(true)}
        onClean={() => setShowCleanConfirmModal(true)}
        onEditYaml={handleEditYaml}
        onTerminal={handleOpenTerminal}
        onLogs={handleOpenLogs}
        onVersionChange={handleOpenVersionChange}
        onProvisionKey={handleProvisionKey}
        customWidth={slideOverWidth}
        enablePolling={true}
        onRefresh={handleRefreshAgent}
      />

      <UnsavedChangesModal
        open={showResetConfirmModal}
        onCancel={() => setShowResetConfirmModal(false)}
        onConfirm={handleRestart}
        title={`Restart ${selectedNode?.name}`}
        message={"This action will restart the agent node."}
        cancelLabel={"Cancel"}
        confirmLabel={"Restart"}
        confirmColor="bg-blue"
      />
      <UnsavedChangesModal
        open={showDeleteConfirmModal}
        onCancel={() => setShowDeleteConfirmModal(false)}
        onConfirm={handleDelete}
        title={`Deleting Agent ${selectedNode?.name}`}
        warning={
          selectedNodeIsCritical ? CRITICAL_AGENT_DELETE_WARNING : undefined
        }
        message={
          "This action will remove the agent from the system. All microservices and applications running on this agent will be deleted. This is not reversible."
        }
        cancelLabel={"Cancel"}
        confirmLabel={"Delete"}
      />
      <UnsavedChangesModal
        open={showVersionConfirmModal}
        onCancel={() => {
          setShowVersionConfirmModal(false);
          setPendingVersionConfig(null);
        }}
        onConfirm={handleVersionCommandConfirm}
        title="Confirm version change"
        message={
          selectedNode && pendingVersionConfig
            ? buildVersionCommandConfirmMessage(
                selectedNode.name,
                pendingVersionConfig,
              )
            : ""
        }
        cancelLabel="Cancel"
        confirmLabel={
          pendingVersionConfig?.versionCommand === "rollback"
            ? "Rollback"
            : "Upgrade"
        }
        confirmColor={
          pendingVersionConfig?.versionCommand === "rollback"
            ? "bg-orange"
            : "bg-blue"
        }
      />
      <UnsavedChangesModal
        open={showCleanConfirmModal}
        onCancel={() => setShowCleanConfirmModal(false)}
        onConfirm={handleClean}
        title={`Pruning Agent ${selectedNode?.name}`}
        message={
          "This action will remove all unused container images from the selected agent. Images not associated with a running microservice will be permanently deleted. Make sure all necessary images are in use before proceeding.\n \nThis is not reversible!"
        }
        cancelLabel={"Cancel"}
        confirmLabel={"Prune"}
      />

      <CustomActionModal
        open={showProvisionKeyModal}
        onCancel={() => {
          setShowProvisionKeyModal(false);
          setProvisionKeyData(null);
          setCommandsVisible(false);
        }}
        title={`Provision Key - ${selectedNode?.name}`}
        cancelLabel={"Close"}
        child={
          loadingProvisionKey ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-700">
                Loading provision key...
              </span>
            </div>
          ) : provisionKeyData ? (
            <div className="space-y-6">
              {provisionKeyData.expirationTime && (
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Expiration Time
                  </div>
                  <div className="text-sm text-gray-600">
                    {new Date(provisionKeyData.expirationTime).toLocaleString()}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-700">
                    Provision Key
                  </div>
                  <button
                    onClick={() => handleCopyItem(provisionKeyData.key, "key")}
                    className="text-gray-400 hover:text-gray-600"
                    title={
                      copiedItem === "key" ? "Copied!" : "Copy to clipboard"
                    }
                  >
                    {copiedItem === "key" ? (
                      <CheckIcon size={16} />
                    ) : (
                      <FileCopyIcon size={16} />
                    )}
                  </button>
                </div>
                <div className="bg-gray-800 rounded px-2 py-1">
                  <CryptoTextBox
                    data={provisionKeyData.key || ""}
                    mode="plain"
                  />
                </div>
              </div>

              {provisionKeyData.caCert && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-gray-700">
                      CA Certificate (Base64)
                    </div>
                    <button
                      onClick={() =>
                        handleCopyItem(provisionKeyData.caCert, "caCert")
                      }
                      className="text-gray-400 hover:text-gray-600"
                      title={
                        copiedItem === "caCert"
                          ? "Copied!"
                          : "Copy to clipboard"
                      }
                    >
                      {copiedItem === "caCert" ? (
                        <CheckIcon size={16} />
                      ) : (
                        <FileCopyIcon size={16} />
                      )}
                    </button>
                  </div>
                  <div className="bg-gray-800 rounded px-2 py-1">
                    <CryptoTextBox
                      data={provisionKeyData.caCert}
                      mode="encrypted"
                    />
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-700">
                    Provision Commands
                  </div>
                  <button
                    onClick={() => setCommandsVisible(!commandsVisible)}
                    className="text-gray-400 hover:text-gray-600"
                    title={commandsVisible ? "Hide commands" : "Show commands"}
                  >
                    {commandsVisible ? (
                      <VisibilityOffIcon size={16} />
                    ) : (
                      <VisibilityIcon size={16} />
                    )}
                  </button>
                </div>
                <div className="bg-gray-100 rounded p-3 space-y-2">
                  {commandsVisible ? (
                    generateProvisionCommands().map((cmd, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-white rounded px-3 py-2"
                      >
                        <code className="text-sm text-gray-800 font-mono flex-1 break-all">
                          {cmd}
                        </code>
                        <button
                          onClick={() => handleCopyItem(cmd, `cmd-${index}`)}
                          className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
                          title={
                            copiedItem === `cmd-${index}`
                              ? "Copied!"
                              : "Copy to clipboard"
                          }
                        >
                          {copiedItem === `cmd-${index}` ? (
                            <CheckIcon size={16} />
                          ) : (
                            <FileCopyIcon size={16} />
                          )}
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="bg-white rounded px-3 py-2">
                      <code className="text-sm text-gray-400 font-mono">
                        Click to view commands
                      </code>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              No provision key data available
            </div>
          )
        }
      />
      <LogConfigModal
        open={showLogConfigModal}
        onClose={() => setShowLogConfigModal(false)}
        onConfirm={handleLogConfigConfirm}
        logSourceName={selectedNode?.name || "Node"}
        logSourceType="node"
      />
      <ExecConfigModal
        open={showExecConfigModal}
        onClose={() => setShowExecConfigModal(false)}
        onConfirm={handleExecConfigConfirm}
        nodeName={selectedNode?.name || "Node"}
      />
      <VersionCommandModal
        open={showVersionCommandModal}
        onClose={() => setShowVersionCommandModal(false)}
        onConfirm={handleVersionCommandConfigConfirm}
        nodeName={selectedNode?.name || "Node"}
        currentVersion={selectedNode?.version}
        isReadyToUpgrade={Boolean(selectedNode?.isReadyToUpgrade)}
        isReadyToRollback={Boolean(selectedNode?.isReadyToRollback)}
        isCriticalAgent={selectedNodeIsCritical}
      />
    </>
  );
};

export default AgentSlideOverPanel;
