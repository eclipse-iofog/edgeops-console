import React, { useEffect, useMemo, useState } from "react";
import CustomLeaflet from "@/components/ui/CustomLeaflet";
import { useData } from "@/app/providers";
import SlideOver from "@/components/ui/SlideOver";
import CustomDataTable from "@/components/ui/CustomDataTable";
import { formatDistanceToNow, format } from "date-fns";
import { useFeedback } from "@/app/providers";
import { useController } from "@/app/providers";
import UnsavedChangesModal from "@/components/ui/UnsavedChangesModal";
import CustomActionModal from "@/components/ui/CustomActionModal";
import CustomSelect from "@/components/ui/CustomSelect";
import CryptoTextBox from "@/components/ui/CustomCryptoTextBox";
import "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/theme-tomorrow";
import "ace-builds/src-noconflict/mode-yaml";
import {
  formatArchitectureLabel,
  getTextColor,
  MiBFactor,
  prettyBytes,
} from "../../../lib/formatting";
import { StatusColor, StatusType } from "@/lib/constants/Enums/StatusColor";
import { NavLink } from "react-router-dom";
import { useTerminal } from "@/app/providers";
import { useLogViewer } from "@/app/providers";
import LogConfigModal, {
  LogTailConfig,
} from "@/components/ui/LogConfigModal";
import ExecConfigModal, {
  ExecConfig,
} from "@/components/ui/ExecConfigModal";
import { useAuth } from "../../../auth";
import { getApiV3BaseUrl, getWsBaseUrl } from "../../../auth/api";
import {
  Copy as FileCopyIcon,
  Check as CheckIcon,
  Eye as VisibilityIcon,
  EyeOff as VisibilityOffIcon,
} from "lucide-react";
import AgentManager from "@/app/providers/Data/agent-manager";
import { BadgeList } from "../../../AccessControl/utils/badgeHelpers";
import {
  buildAgentPatchBodyFromYamlContent,
  dumpAgentYAML,
} from "@/lib/yaml/agentYAML";

interface CustomLeafletProps {
  collapsed: boolean;
}

const DEFAULT_MAP_CENTER: [number, number] = [39.9255, 32.8663];
const DEFAULT_MAP_ZOOM = 3;
const CONTROLLER_LOCATION_ZOOM = 6;

function resolveMapCenter(location: {
  lat?: string | number;
  lon?: string | number;
} | null): [number, number] {
  const lat = Number.parseFloat(String(location?.lat ?? ""));
  const lon = Number.parseFloat(String(location?.lon ?? ""));
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return [lat, lon];
  }
  return DEFAULT_MAP_CENTER;
}

const formatDuration = (milliseconds: number): string => {
  if (!milliseconds || milliseconds <= 0) return "N/A";

  const totalSeconds = Math.floor(milliseconds / 1000);

  const days = Math.floor(totalSeconds / (24 * 3600));
  const remainingHours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d${remainingHours}h`;
  }

  if (remainingHours > 0) {
    return `${remainingHours}h${remainingMinutes}m`;
  }

  if (remainingMinutes > 0) {
    return `${remainingMinutes}m${remainingSeconds}s`;
  }

  return `${remainingSeconds}s`;
};

const Map: React.FC<CustomLeafletProps> = ({ collapsed }) => {
  const { data } = useData();
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { pushFeedback } = useFeedback();
  const { request, location } = useController();
  const mapCenter = useMemo(() => resolveMapCenter(location), [location]);
  const mapFallbackZoom = useMemo(() => {
    const lat = Number.parseFloat(String(location?.lat ?? ""));
    const lon = Number.parseFloat(String(location?.lon ?? ""));
    return Number.isFinite(lat) && Number.isFinite(lon)
      ? CONTROLLER_LOCATION_ZOOM
      : DEFAULT_MAP_ZOOM;
  }, [location]);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showCleanConfirmModal, setShowCleanConfirmModal] = useState(false);
  const [showProvisionKeyModal, setShowProvisionKeyModal] = useState(false);
  const [provisionKeyData, setProvisionKeyData] = useState<any | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [loadingProvisionKey, setLoadingProvisionKey] = useState(false);
  const [commandsVisible, setCommandsVisible] = useState(false);
  const [editorDataChanged, setEditorDataChanged] = React.useState<any>();
  const [showLogConfigModal, setShowLogConfigModal] = useState(false);
  const [showExecConfigModal, setShowExecConfigModal] = useState(false);
  const { addTerminalSession, addYamlSession } = useTerminal();
  const { addLogSession } = useLogViewer();
  const auth = useAuth();
  const [selectedAgentItem, setSelectedAgentItem] = useState<any>(null);
  const markers = useMemo(() => {
    if (!data?.reducedAgents?.byName) {
      return [];
    }
    return Object.values(data.reducedAgents.byName)
      .filter((agent: any) => agent.latitude && agent.longitude)
      .map((agent: any) => ({
        id: agent.uuid,
        position: [agent.latitude, agent.longitude] as [number, number],
        color: agent.daemonStatus === "RUNNING" ? "green" : "red",
        label: agent.name,
        description: agent.description,
        ip: agent.ipAddress,
        daemonStatus: agent.daemonStatus,
        createdAt: agent.createdAt,
      }));
  }, [data?.reducedAgents?.byName]);

  const selectOptions = markers.map((m) => ({
    value: m.id,
    label: m.label,
  }));

  useEffect(() => {
    if (selectedAgentItem) {
      const selectedAgent = data.reducedAgents.byUUID[selectedAgentItem];
      setSelectedNode(selectedAgent);
      setIsOpen(true);
    } else {
      setSelectedNode(null);
      setIsOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgentItem]);

  const handleButtonClick = (marker: any) => {
    if (marker) {
      const selectedAgents = data.reducedAgents.byUUID[marker.id];
      setSelectedNode(selectedAgents);
      setIsOpen(true);
    }
  };

  const handleRefreshAgent = async () => {
    if (!selectedNode?.uuid) return;
    try {
      const agents = await AgentManager.listAgents(request)();
      const updatedAgent = agents.find(
        (a: any) => a.uuid === selectedNode.uuid,
      );
      if (updatedAgent) {
        setSelectedNode(updatedAgent);
      }
    } catch (e) {
      console.error("Error refreshing agent data:", e);
    }
  };

  const handleRestart = () => {
    rebootAgent();
  };

  const handleDelete = () => {
    deleteAgent();
  };

  const renderTags = (tags: any) => {
    if (!tags) return "N/A";

    const tagArray = Array.isArray(tags) ? tags : [tags];

    if (tagArray.length === 0) return "N/A";

    return (
      <div className="flex flex-wrap gap-1">
        {tagArray.map((tag: string, index: number) => (
          <span
            key={index}
            className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded"
          >
            {tag}
          </span>
        ))}
      </div>
    );
  };

  const rebootAgent = async () => {
    try {
      const res = await request(`/api/v3/iofog/${selectedNode.uuid}/reboot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
        return;
      } else {
        pushFeedback({ message: "Agent Rebooted", type: "success" });
        setShowResetConfirmModal(false);
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const deleteAgent = async () => {
    try {
      const res = await request(`/api/v3/iofog/${selectedNode.uuid}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        pushFeedback({ message: res.message || res.status, type: "error" });
        return;
      } else {
        pushFeedback({ message: "Agent deleted!", type: "success" });
        setShowDeleteConfirmModal(false);
      }
    } catch (e: any) {
      pushFeedback({ message: e.message || e.status, type: "error" });
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
      } else {
        pushFeedback({ message: "Agent Pruned", type: "success" });
        setShowCleanConfirmModal(false);
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const handleOpenTerminal = () => {
    if (!selectedNode) return;
    // Check if node is running
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
        // Check if node is running
        if (selectedNode?.daemonStatus?.toLowerCase() !== "running") {
          pushFeedback?.({
            message: "Node must be running to enable exec session",
            type: "error",
          });
          return;
        }

        pushFeedback?.({ message: "Enabling exec session...", type: "info" });

        // Prepare request body
        const body: { uuid: string; image?: string } = {
          uuid: selectedNode.uuid,
        };
        if (config.image) {
          body.image = config.image;
        }

        // Send POST request to enable exec
        const res = await request(`/api/v3/iofog/${selectedNode.uuid}/exec`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          pushFeedback?.({ message: res.message, type: "error" });
          return;
        }

        pushFeedback?.({
          message: `Exec enabled for agent ${selectedNode?.name}`,
          type: "success",
          agentName: selectedNode?.name,
        });

        // Create a placeholder socket URL (will be updated when debugger is ready)
        const socketUrl = `${getWsBaseUrl()}/api/v3/microservices/system/exec/placeholder`;

        // Add terminal session to global state with waitingForDebugger flag
        addTerminalSession({
          title: `Agent Shell: ${selectedNode?.name}`,
          socketUrl,
          authToken: auth?.user?.access_token,
          microserviceUuid: "placeholder", // Will be updated when debugger is ready
          nodeUuid: selectedNode.uuid,
          waitingForDebugger: true,
          debuggerStatus: "waiting",
        });
      } else {
        // Disable exec
        pushFeedback?.({ message: "Disabling exec session...", type: "info" });

        const res = await request(`/api/v3/iofog/${selectedNode.uuid}/exec`, {
          method: "DELETE",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ uuid: selectedNode.uuid }),
        });

        if (!res.ok) {
          pushFeedback?.({ message: res.message, type: "error" });
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

  const handleLogConfigConfirm = (config: LogTailConfig) => {
    if (!selectedNode) return;
    setShowLogConfigModal(false);

    try {
      // Create websocket URL with tail config
      const baseUrl = `${getWsBaseUrl()}/api/v3/iofog/${selectedNode.uuid}/logs`;

      const params = new URLSearchParams();
      params.append("tail", config.tail.toString());
      params.append("follow", config.follow.toString());
      if (config.since) params.append("since", config.since);
      if (config.until) params.append("until", config.until);

      const socketUrl = `${baseUrl}?${params.toString()}`;

      // Add log session
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

  const handleEditYaml = () => {
    const yamlString = dumpAgentYAML(selectedNode);

    // Add YAML editor session to global state
    addYamlSession({
      title: `AgentConfig YAML: ${selectedNode?.name}`,
      content: yamlString,
      isDirty: false,
      onSave: async (content: string) => {
        await handleYamlUpdate(content);
      },
    });
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
      } else {
        pushFeedback({
          message: `Agent: ${selectedNode?.name} Config Updated`,
          type: "success",
        });
        setEditorDataChanged(null);
        setIsOpen(false);
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
      throw e;
    }
  }

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

      const data = await res.json();
      setProvisionKeyData(data);
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

  const getApiEndpointUrl = (): string => getApiV3BaseUrl();

  const generateProvisionCommands = (): string[] => {
    const apiUrl = getApiEndpointUrl();
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

  const slideOverFields = [
    {
      label: "uuid",
      render: (row: any) => row.uuid || "N/A",
    },
    {
      label: "Status",
      render: (row: any) => {
        const bgColor =
          StatusColor[row.daemonStatus as StatusType] ?? "#9CA3AF";
        const textColor = getTextColor(bgColor);
        return (
          <span
            className="px-2 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: bgColor,
              color: textColor,
            }}
          >
            {row.daemonStatus}
          </span>
        );
      },
    },
    {
      label: "Security Status",
      render: (row: any) => {
        const bgColor =
          StatusColor[row.securityStatus as StatusType] ?? "#9CA3AF";
        const textColor = getTextColor(bgColor);
        return (
          <span
            className="px-2 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: bgColor,
              color: textColor,
            }}
          >
            {row.securityStatus}
          </span>
        );
      },
    },
    {
      label: "Security Violation Info",
      render: (node: any) => {
        return node.warningMessage ? (
          <span className="text-white whitespace-pre-wrap break-words">
            {node.securityViolationInfo}
          </span>
        ) : (
          "N/A"
        );
      },
    },
    {
      label: "Warning Message",
      render: (node: any) => {
        return node.warningMessage ? (
          <span className="text-white whitespace-pre-wrap break-words">
            {node.warningMessage}
          </span>
        ) : (
          "N/A"
        );
      },
    },
    {
      label: "Last Active",
      render: (node: any) => {
        const lastActive = node.lastActive || node.updated || node.timestamp;
        if (!lastActive) return "N/A";

        const date = new Date(lastActive);
        const timeAgo = formatDistanceToNow(date, { addSuffix: true });
        const formattedDate = format(date, "PPpp");

        return `${timeAgo} (${formattedDate})`;
      },
    },
    {
      label: "Description",
      render: (node: any) => {
        return node.description || "N/A";
      },
    },
    {
      label: "Up Time",
      render: (node: any) => {
        return formatDuration(node.daemonOperatingDuration);
      },
    },
    {
      label: "Agent Details",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "Host",
      render: (node: any) => node.host || "N/A",
    },
    {
      label: "Version",
      render: (node: any) => node.version || "N/A",
    },
    {
      label: "Mode",
      render: (node: any) => (node.isSystem ? "System" : "Node"),
    },
    {
      label: "Deployment Type",
      render: (node: any) => node.deploymentType || "N/A",
    },
    {
      label: "Container Engine",
      render: (node: any) => node.containerEngine || "N/A",
    },
    {
      label: "Architecture",
      render: (node: any) => formatArchitectureLabel(node),
    },
    {
      label: "IP Address",
      render: (node: any) => node.ipAddress || "N/A",
    },
    {
      label: "IP Address External",
      render: (node: any) => node.ipAddressExternal || "N/A",
    },
    {
      label: "Tags",
      render: (row: any) => renderTags(row.tags),
    },
    {
      label: "Created",
      render: (node: any) => {
        const created = node.created || node.creationTimestamp;
        if (!created) return "N/A";
        const date = new Date(created);
        const formattedDate = format(date, "PPpp");
        return `${formatDistanceToNow(date, { addSuffix: true })} (${formattedDate})`;
      },
    },
    {
      label: "Resource Utilization",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "CPU Usage",
      render: (node: any) => `${(Number(node.cpuUsage) || 0)?.toFixed(2)}%`,
    },
    {
      label: "System Total CPU",
      render: (node: any) => `${node.systemTotalCpu?.toFixed(2)}%`,
    },
    {
      label: "Memory Usage",
      render: (node: any) =>
        `${prettyBytes(node.memoryUsage * MiBFactor || 0)}`,
    },
    {
      label: "System Available Memory",
      render: (node: any) => `${prettyBytes(node.systemAvailableMemory || 0)}`,
    },
    {
      label: "Disk Usage",
      render: (node: any) =>
        `${prettyBytes(Number((node.diskUsage * MiBFactor)?.toFixed(2)) || 0)}`,
    },
    {
      label: "System Available Disk",
      render: (node: any) => `${prettyBytes(node.systemAvailableDisk || 0)}`,
    },
    {
      label: "Volume Mounts",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (node: any) => {
        if (!node.volumeMounts || node.volumeMounts === 0) {
          return (
            <div className="text-sm text-gray-400">
              No volume mounts found for this agent.
            </div>
          );
        }

        const localColumns = [
          {
            key: "name",
            header: "Name",
            render: (row: any) => {
              if (!row?.name)
                return <span className="text-gray-400">No name</span>;
              return (
                <NavLink
                  to={`/config/VolumeMounts?volumeMountName=${encodeURIComponent(row.name)}`}
                  className="text-blue-400 underline cursor-pointer"
                >
                  {row.name}
                </NavLink>
              );
            },
          },
          {
            key: "version",
            header: "Version",
            formatter: ({ row }: any) => (
              <span className="text-white">{row.version}</span>
            ),
          },
          {
            key: "configMapName",
            header: "Config Map Name",
            render: (row: any) => {
              if (!row?.configMapName)
                return (
                  <span className="text-gray-400">No config map name</span>
                );
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
            key: "secretName",
            header: "Secret Name",
            render: (row: any) => {
              if (!row?.secretName)
                return <span className="text-gray-400">No secret name</span>;
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
        ];

        return (
          <CustomDataTable
            columns={localColumns}
            data={node.volumeMounts}
            getRowKey={(row: any) => row.uuid}
          />
        );
      },
    },
    {
      label: "Status",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "Available Runtimes",
      render: (row: any) => (
        <BadgeList items={row.availableRuntimes} emptyLabel="N/A" />
      ),
    },
    {
      label: "Runtime Agent Phase",
      render: (row: any) =>
        row.runtimeAgentPhase ? (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/50 text-blue-200 border border-blue-700/50">
            {row.runtimeAgentPhase}
          </span>
        ) : (
          "N/A"
        ),
    },
    {
      label: "Control Plane Quiesced",
      render: (row: any) =>
        row.controlPlaneQuiesced === undefined ? (
          "N/A"
        ) : (
          <span
            className="px-2 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: row.controlPlaneQuiesced ? "#F59E0B" : "#10B981",
              color: getTextColor(
                row.controlPlaneQuiesced ? "#F59E0B" : "#10B981",
              ),
            }}
          >
            {row.controlPlaneQuiesced.toString()}
          </span>
        ),
    },
    {
      label: "GPS Status",
      render: (node: any) => {
        return node.gpsStatus || "N/A";
      },
    },
    {
      label: "Cpu Violation",
      render: (row: any) =>
        row.cpuViolation === "0" || row.cpuViolation === "false"
          ? "false"
          : "true",
    },
    {
      label: "Disk Violation",
      render: (row: any) =>
        row.diskViolation === "0" || row.diskViolation === "false"
          ? "false"
          : "true",
    },
    {
      label: "Memory Violation",
      render: (row: any) =>
        row.memoryViolation === "0" || row.memoryViolation === "false"
          ? "false"
          : "true",
    },
    {
      label: "Is Ready To Rollback",
      render: (row: any) => <span>{row.isReadyToRollback.toString()}</span>,
    },
    {
      label: "Is Ready To Upgrade",
      render: (row: any) => <span>{row.isReadyToUpgrade.toString()}</span>,
    },
    {
      label: "Last Status Time",
      render: (row: any) => (
        <span>{new Date(row.lastStatusTime).toLocaleString()}</span>
      ),
    },
    {
      label: "Applications",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (node: any) => {
        const agentApplications = data?.applications?.filter((app: any) =>
          app.microservices?.some((msvc: any) => msvc.iofogUuid === node.uuid),
        );

        if (!agentApplications || agentApplications.length === 0) {
          return (
            <div className="text-sm text-gray-400">
              No applications found for this agent.
            </div>
          );
        }
        const localColumns = [
          {
            key: "name",
            header: "Application Name",
            render: (row: any) => {
              if (!row?.name)
                return <span className="text-gray-400">No name</span>;
              return (
                <NavLink
                  to={`/Workloads/ApplicationList?applicationId=${encodeURIComponent(row.id)}`}
                  className="text-blue-400 underline cursor-pointer"
                >
                  {row.name}
                </NavLink>
              );
            },
          },
          {
            key: "isActivated",
            header: "Status",
            render: (row: any) => {
              const statusKey = row.isActivated
                ? StatusType.ACTIVE
                : StatusType.INACTIVE;
              const bgColor = StatusColor[statusKey] ?? "#9CA3AF";
              const textColor = getTextColor(bgColor);
              return (
                <span
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: bgColor,
                    color: textColor,
                  }}
                >
                  {row.isActivated ? "ACTIVE" : "INACTIVE"}
                </span>
              );
            },
          },
        ];

        return (
          <CustomDataTable
            columns={localColumns}
            data={agentApplications}
            getRowKey={(row: any) => row.uuid}
          />
        );
      },
    },
    {
      label: "Microservices",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (node: any) => {
        const AgentApplications = data?.applications?.filter((app: any) =>
          app.microservices?.some((msvc: any) => msvc.iofogUuid === node.uuid),
        );
        const microservices =
          AgentApplications?.flatMap((app: any) => app.microservices) || [];

        if (!Array.isArray(microservices) || microservices.length === 0) {
          return (
            <div className="text-sm text-gray-400">
              No microservices available.
            </div>
          );
        }
        const tableData = microservices.map((ms: any, index: number) => ({
          key: `${ms.uuid}`,
          name: ms.name || "-",
          status: ms.status?.status || "-",
          agent:
            data.activeAgents?.find((a: any) => a.uuid === ms.iofogUuid)
              ?.name ?? "-",
          ports: Array.isArray(ms.ports)
            ? ms.ports.map((p: any, i: number) => (
                <div key={i}>{`${p.internal}:${p.external}/${p.protocol}`}</div>
              ))
            : "-",
        }));

        const columns = [
          {
            key: "name",
            header: "Name",
            render: (row: any) => {
              if (!row?.name)
                return <span className="text-gray-400">No name</span>;
              return (
                <NavLink
                  to={`/Workloads/MicroservicesList?microserviceId=${encodeURIComponent(row.key)}`}
                  className="text-blue-400 underline cursor-pointer"
                >
                  {row.name}
                </NavLink>
              );
            },
          },
          {
            key: "status",
            header: "Status",
            render: (row: any) => {
              const bgColor =
                StatusColor[row.status as StatusType] ?? "#9CA3AF";
              const textColor = getTextColor(bgColor);
              return (
                <span
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: bgColor,
                    color: textColor,
                  }}
                >
                  {row.status}
                </span>
              );
            },
          },
          {
            key: "agent",
            header: "Agent",
            formatter: ({ row }: any) => (
              <span className="text-white">{row.agent}</span>
            ),
          },
          {
            key: "ports",
            header: "Ports",
            formatter: ({ row }: any) => (
              <span className="text-white whitespace-pre-wrap break-words">
                {row.ports}
              </span>
            ),
          },
        ];

        return (
          <CustomDataTable
            columns={columns}
            data={tableData}
            getRowKey={(row: any) => row.key}
          />
        );
      },
    },
    {
      label: "System Applications",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (node: any) => {
        const agentApplications = data?.systemApplications?.filter((app: any) =>
          app.microservices?.some((msvc: any) => msvc.iofogUuid === node.uuid),
        );

        if (!agentApplications || agentApplications.length === 0) {
          return (
            <div className="text-sm text-gray-400">
              No applications found for this agent.
            </div>
          );
        }

        const localColumns = [
          {
            key: "name",
            header: "Application Name",
            render: (row: any) => {
              if (!row?.name)
                return <span className="text-gray-400">No name</span>;
              return (
                <NavLink
                  to={`/Workloads/SystemApplicationList?applicationId=${encodeURIComponent(row.id)}`}
                  className="text-blue-400 underline cursor-pointer"
                >
                  {row.name}
                </NavLink>
              );
            },
          },
          {
            key: "isActivated",
            header: "Status",
            render: (row: any) => {
              const statusKey = row.isActivated
                ? StatusType.ACTIVE
                : StatusType.INACTIVE;
              const bgColor = StatusColor[statusKey] ?? "#9CA3AF";
              const textColor = getTextColor(bgColor);
              return (
                <span
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: bgColor,
                    color: textColor,
                  }}
                >
                  {row.isActivated ? "ACTIVE" : "INACTIVE"}
                </span>
              );
            },
          },
        ];

        return (
          <CustomDataTable
            columns={localColumns}
            data={agentApplications}
            getRowKey={(row: any) => row.uuid}
          />
        );
      },
    },
    {
      label: "System Microservices",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (node: any) => {
        const systemAgentApplications = data?.systemApplications?.filter(
          (app: any) =>
            app.microservices?.some(
              (msvc: any) => msvc.iofogUuid === node.uuid,
            ),
        );

        const microservices =
          systemAgentApplications?.flatMap(
            (app: any) => app.microservices || [],
          ) || [];

        if (!Array.isArray(microservices) || microservices.length === 0) {
          return (
            <div className="text-sm text-gray-400">
              No microservices available.
            </div>
          );
        }
        const tableData = microservices.map((ms: any, index: number) => ({
          key: `${ms.uuid}`,
          name: ms.name || "-",
          status: ms.status?.status || "-",
          agent:
            data.activeAgents?.find((a: any) => a.uuid === ms.iofogUuid)
              ?.name ?? "-",
          ports: Array.isArray(ms.ports)
            ? ms.ports.map((p: any, i: number) => (
                <div key={i}>{`${p.internal}:${p.external}/${p.protocol}`}</div>
              ))
            : "-",
        }));

        const columns = [
          {
            key: "name",
            header: "Name",
            render: (row: any) => {
              if (!row?.name)
                return <span className="text-gray-400">No name</span>;
              return (
                <NavLink
                  to={`/Workloads/SystemMicroservicesList?microserviceId=${encodeURIComponent(row.key)}`}
                  className="text-blue-400 underline cursor-pointer"
                >
                  {row.name}
                </NavLink>
              );
            },
          },
          {
            key: "status",
            header: "Status",
            render: (row: any) => {
              const bgColor =
                StatusColor[row.status as StatusType] ?? "#9CA3AF";
              const textColor = getTextColor(bgColor);
              return (
                <span
                  className="px-2 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: bgColor,
                    color: textColor,
                  }}
                >
                  {row.status}
                </span>
              );
            },
          },
          {
            key: "agent",
            header: "Agent",
            formatter: ({ row }: any) => (
              <span className="text-white">{row.agent}</span>
            ),
          },
          {
            key: "ports",
            header: "Ports",
            formatter: ({ row }: any) => (
              <span className="text-white whitespace-pre-wrap break-words">
                {row.ports}
              </span>
            ),
          },
        ];

        return (
          <CustomDataTable
            columns={columns}
            data={tableData}
            getRowKey={(row: any) => row.key}
          />
        );
      },
    },
  ];

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-grow relative">
        <CustomLeaflet
          markers={markers}
          center={mapCenter}
          zoom={DEFAULT_MAP_ZOOM}
          fallbackZoom={mapFallbackZoom}
          onMarkerAction={handleButtonClick}
          collapsed={collapsed}
          selectedMarkerId={selectedNode?.uuid || undefined}
        />
        <CustomSelect
          options={selectOptions}
          setSelected={setSelectedAgentItem}
          isClearable
          placeholder="Select an agent..."
          className="!absolute top-3 left-16 w-[250px] z-[50] bg-white rounded shadow"
        />
      </div>

      <SlideOver
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={selectedNode?.name || "Agent Details"}
        data={selectedNode}
        fields={slideOverFields}
        onRestart={() => setShowResetConfirmModal(true)}
        onDelete={() => setShowDeleteConfirmModal(true)}
        onClean={() => setShowCleanConfirmModal(true)}
        onEditYaml={handleEditYaml}
        onTerminal={handleOpenTerminal}
        onLogs={handleOpenLogs}
        onProvisionKey={handleProvisionKey}
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
        message={
          "This action will remove the agent from the system. All microservices and applications running on this agent will be deleted. This is not reversible."
        }
        cancelLabel={"Cancel"}
        confirmLabel={"Delete"}
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
              {/* Expiration Time */}
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

              {/* Provision Key */}
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
                      <CheckIcon fontSize="small" />
                    ) : (
                      <FileCopyIcon fontSize="small" />
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

              {/* CA Certificate */}
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
                        <CheckIcon fontSize="small" />
                      ) : (
                        <FileCopyIcon fontSize="small" />
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

              {/* Provision Commands */}
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
                      <VisibilityOffIcon fontSize="small" />
                    ) : (
                      <VisibilityIcon fontSize="small" />
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
                            <CheckIcon fontSize="small" />
                          ) : (
                            <FileCopyIcon fontSize="small" />
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
    </div>
  );
};

export default Map;
