import React, { useEffect, useState } from "react";
import { useData } from "@/app/providers";
import ApplicationManager from "@/app/providers/Data/application-manager";
import CustomDataTable from "@/components/ui/CustomDataTable";
import CustomProgressBar from "@/components/ui/CustomProgressBar";
import SlideOver from "@/components/ui/SlideOver";
import { formatDistanceToNow, format } from "date-fns";
import { useController } from "@/app/providers";
import { useFeedback } from "@/app/providers";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/theme-tomorrow";
import "ace-builds/src-noconflict/mode-yaml";
import { dumpMicroserviceYAML } from "@/lib/yaml/microserviceYAML";
import { Trash2 as DeleteOutlineIcon } from "lucide-react";
import UnsavedChangesModal from "@/components/ui/UnsavedChangesModal";
import yaml from "js-yaml";
import {
  isAllowedControllerApiVersion,
  invalidControllerApiVersionMessage,
} from "@/lib/constants/constants";
import { parseMicroservice } from "@/lib/yaml/ApplicationParser";
import lget from "lodash/get";
import CryptoTextBox from "@/components/ui/CustomCryptoTextBox";
import { getTextColor, prettyBytes } from "../../lib/formatting";
import { StatusColor, StatusType } from "@/lib/constants/Enums/StatusColor";
import { useLocation } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { Pencil as EditOutlinedIcon } from "lucide-react";
import { useTerminal } from "@/app/providers";
import { useLogViewer } from "@/app/providers";
import LogConfigModal, {
  LogTailConfig,
} from "@/components/ui/LogConfigModal";
import { useAuth } from "../../auth";
import { getWsBaseUrl } from "../../auth/api";
import { useUnifiedYamlUpload } from "../../hooks/useUnifiedYamlUpload";

function MicroservicesList() {
  const { data } = useData();
  const { request } = useController();
  const { pushFeedback } = useFeedback();
  const [selectedMs, setSelectedMs] = useState<any | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editorDataChanged, setEditorDataChanged] = React.useState<any>();
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showPortDeleteConfirmModal, setShowPortDeleteConfirmModal] =
    useState(false);
  const [showVolumeDeleteConfirmModal, setShowVolumeDeleteConfirmModal] =
    useState(false);
  const [selectedPort, setSelectedPort] = useState<any>(null);
  const [selectedVolume, setSelectedVolume] = useState<any>(null);
  const flattenedMicroservices = data?.applications?.flatMap((app: any) =>
    app.microservices.map((ms: any) => ({
      ...ms,
      agentName: data.reducedAgents.byUUID[ms.iofogUuid]?.name,
      appName: app.name,
      appDescription: app.description,
      appCreatedAt: app.createdAt,
    })),
  );
  const sortedMicroservices = React.useMemo(() => {
    const list = flattenedMicroservices ?? [];
    const byUUID = data?.reducedAgents?.byUUID ?? {};
    return [...list].sort((a: any, b: any) => {
      const aSystem = Boolean(byUUID[a.iofogUuid]?.isSystem);
      const bSystem = Boolean(byUUID[b.iofogUuid]?.isSystem);
      if (aSystem !== bSystem) return aSystem ? -1 : 1;
      const aAgent = a.agentName ?? byUUID[a.iofogUuid]?.name ?? "";
      const bAgent = b.agentName ?? byUUID[b.iofogUuid]?.name ?? "";
      const byAgent = (aAgent as string).localeCompare(bAgent as string);
      if (byAgent !== 0) return byAgent;
      return ((a.name ?? "") as string).localeCompare((b.name ?? "") as string);
    });
  }, [flattenedMicroservices, data?.reducedAgents?.byUUID]);
  const [showStartStopConfirmModal, setShowStartStopConfirmModal] =
    useState(false);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const microserviceId = params.get("microserviceId");
  const [dirtyEditors, setDirtyEditors] = React.useState(false);
  const [editorValues, setEditorValues] = React.useState<string>("");
  const [configData, setConfigData] = useState<any>();
  const [editorContent, setEditorContent] = useState<string>("");
  const [showLogConfigModal, setShowLogConfigModal] = useState(false);
  const { sessions, addTerminalSession, addYamlSession } = useTerminal();
  const { addLogSession } = useLogViewer();
  const auth = useAuth();

  useEffect(() => {
    if (microserviceId && flattenedMicroservices) {
      const found = flattenedMicroservices.find(
        (a: any) => a.uuid === microserviceId,
      );
      if (found) {
        setSelectedMs(found);
        setIsOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [microserviceId]);

  const handleRowClick = (row: any) => {
    setSelectedMs(row);
    setIsOpen(true);
  };

  const handleRefreshMicroservice = async () => {
    if (!selectedMs?.uuid) return;
    try {
      const applications =
        await ApplicationManager.listApplicationsWithMicroservices(request)();
      const reducedAgents = data?.reducedAgents?.byUUID ?? {};
      const flattened = applications.flatMap((app: any) =>
        (app.microservices || []).map((ms: any) => ({
          ...ms,
          agentName: reducedAgents[ms.iofogUuid]?.name,
          appName: app.name,
          appDescription: app.description,
          appCreatedAt: app.createdAt,
        })),
      );
      const updatedMs = flattened.find((m: any) => m.uuid === selectedMs.uuid);
      if (updatedMs) {
        setSelectedMs(updatedMs);
      }
    } catch (e) {
      console.error("Error refreshing microservice data:", e);
    }
  };

  const handleRestart = async () => {
    try {
      const res = await request(
        `/api/v3/microservices/${selectedMs.uuid}/rebuild`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
        },
      );
      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
      } else {
        pushFeedback({ message: "Microservice Rebuilt", type: "success" });
        setShowResetConfirmModal(false);
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const handleDelete = async () => {
    try {
      const res = await request(`/api/v3/microservices/${selectedMs.uuid}`, {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
      });
      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
      } else {
        pushFeedback({ message: "Microservice Deleted", type: "success" });
        setIsOpen(false);
        setShowDeleteConfirmModal(false);
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const handlePortsDelete = async () => {
    try {
      const res = await request(`/api/v3/microservices/${selectedMs.uuid}`, {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
      });
      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
      } else {
        pushFeedback({ message: "Port Deleted", type: "success" });
        setIsOpen(false);
        setShowPortDeleteConfirmModal(false);
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const handleVolumeDelete = async () => {
    try {
      const res = await request(`/api/v3/microservices/${selectedMs.uuid}`, {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
      });
      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
      } else {
        pushFeedback({ message: "Volume Deleted", type: "success" });
        setIsOpen(false);
        setShowVolumeDeleteConfirmModal(false);
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const handleConfigPatch = async () => {
    try {
      // Parse the YAML string back to JSON
      const parsedConfig = yaml.load(editorValues);
      const res = await request(
        `/api/v3/microservices/${selectedMs.uuid}/config`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(parsedConfig),
        },
      );
      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
      } else {
        pushFeedback({
          message: "Microservice Config Updated. ",
          type: "success",
        });
        setDirtyEditors(false);
        // Update the editor content with the saved data
        setEditorContent(editorValues);
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const getConfig = async () => {
    try {
      const configResponse = await request(
        `/api/v3/microservices/${selectedMs.uuid}/config`,
      );
      if (configResponse && configResponse.ok) {
        const configData = await configResponse.json();
        if (configData && configData.config) {
          setConfigData(configData.config);
          setEditorContent(yaml.dump(configData.config));
        } else {
          setConfigData({});
          setEditorContent("");
        }
      } else {
        setConfigData({});
        setEditorContent("");
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  useEffect(() => {
    if (selectedMs && isOpen) {
      getConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMs, isOpen]);

  const handleConfigDelete = async () => {
    try {
      const res = await request(
        `/api/v3/microservices/${selectedMs.uuid}/config`,
        {
          method: "DELETE",
          headers: {
            "content-type": "application/json",
          },
        },
      );
      if (!res.ok) {
        pushFeedback({ message: res.message, type: "error" });
      } else {
        pushFeedback({
          message: "Microservice Config Deleted. ",
          type: "success",
        });
        setIsOpen(false);
        setShowDeleteConfirmModal(false);
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const renderExecSessionIds = (execSessionIds: any) => {
    if (!execSessionIds) return "N/A";

    // Handle both string and array cases
    const execSessionIdArray = Array.isArray(execSessionIds)
      ? execSessionIds
      : [execSessionIds];

    if (execSessionIdArray.length === 0) return "N/A";

    return (
      <div className="flex flex-wrap gap-1">
        {execSessionIdArray.map((execSessionId: string, index: number) => (
          <span
            key={index}
            className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded"
          >
            {execSessionId}
          </span>
        ))}
      </div>
    );
  };

  const parseMicroserviceFile = async (doc: any) => {
    if (!isAllowedControllerApiVersion(doc.apiVersion)) {
      return [{}, invalidControllerApiVersionMessage(doc.apiVersion)];
    }
    if (doc.kind !== "Microservice") {
      return [{}, `Invalid kind ${doc.kind}`];
    }
    if (!doc.metadata || !doc.spec) {
      return [{}, "Invalid YAML format"];
    }
    let tempObject = await parseMicroservice(doc.spec);
    const microserviceData = {
      name: lget(doc, "metadata.name", undefined),
      ...tempObject,
    };
    return [microserviceData];
  };

  const deployMicroservice = async (microservice: any, method?: string) => {
    const url =
      method === "POST"
        ? `/api/v3/microservices`
        : `/api/v3/microservices/${selectedMs?.uuid}`;
    try {
      const res = await request(url, {
        method: method || "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(microservice),
      });
      return res;
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error" });
    }
  };

  const handleYamlUpdate = async (content?: string, method?: string) => {
    try {
      const yamlContent = content || editorDataChanged;
      const doc = yaml.load(yamlContent);
      const [microserviceData, err] = await parseMicroserviceFile(doc);
      if (err) {
        pushFeedback({ message: err, type: "error" });
        throw new Error(err);
      }
      const newMicroservice = microserviceData;
      const res = await deployMicroservice(newMicroservice, method);
      if (!res || !res.ok) {
        try {
          const error = await res.json();
          pushFeedback({ message: error.message, type: "error" });
          throw new Error(error.message);
        } catch (e) {
          pushFeedback({
            message: res?.message || "Something went wrong",
            type: "error",
          });
          throw new Error(res?.message || "Something went wrong");
        }
      } else {
        pushFeedback({
          message: `Microservice ${method === "POST" ? "Added" : "Updated"}!`,
          type: "success",
        });
        setEditorDataChanged(null);
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error" });
      throw e;
    }
  };

  // Unified YAML upload hook
  // Microservices are managed by Data provider which polls automatically
  const refreshFunctions = React.useMemo(() => {
    const map = new Map();
    map.set("Microservice", async () => {
      // Data provider will automatically refresh on next poll cycle
    });
    return map;
  }, []);

  const { processYamlFile: processUnifiedYaml } = useUnifiedYamlUpload({
    request,
    pushFeedback,
    refreshFunctions,
  });

  const openExecTerminal = (microserviceUuid: string) => {
    const microservice = flattenedMicroservices?.find(
      (ms: any) => ms.uuid === microserviceUuid,
    );

    if (!microservice) {
      pushFeedback?.({ message: "Microservice not found", type: "error" });
      return;
    }

    if (microservice.status?.status?.toUpperCase() !== "RUNNING") {
      pushFeedback?.({
        message: "Microservice must be running to open an exec session",
        type: "error",
      });
      return;
    }

    const existingSessionCount = sessions.filter(
      (s) => s.microserviceUuid === microserviceUuid && !s.waitingForDebugger,
    ).length;
    const tabSuffix =
      existingSessionCount > 0 ? ` (${existingSessionCount + 1})` : "";

    const socketUrl = `${getWsBaseUrl()}/api/v3/microservices/exec/${microserviceUuid}`;
    const sessionId = addTerminalSession({
      title: `Microservice Shell: ${microservice.application}/${microservice.name}${tabSuffix}`,
      socketUrl,
      authToken: auth?.user?.access_token,
      microserviceUuid,
    });

    if (!sessionId) {
      pushFeedback?.({
        message: "Maximum exec sessions reached for this microservice",
        type: "error",
      });
    }
  };

  const handleOpenLogs = () => {
    if (!selectedMs) return;
    setShowLogConfigModal(true);
  };

  const handleLogConfigConfirm = (config: LogTailConfig) => {
    if (!selectedMs) return;
    setShowLogConfigModal(false);

    try {
      // Create websocket URL with tail config
      const baseUrl = `${getWsBaseUrl()}/api/v3/microservices/${selectedMs.uuid}/logs`;

      const params = new URLSearchParams();
      params.append("tail", config.tail.toString());
      params.append("follow", config.follow.toString());
      if (config.since) params.append("since", config.since);
      if (config.until) params.append("until", config.until);

      const socketUrl = `${baseUrl}?${params.toString()}`;

      // Add log session
      addLogSession({
        title: `Logs: ${selectedMs.application}/${selectedMs.name}`,
        socketUrl,
        authToken: auth?.user?.access_token,
        resourceUuid: selectedMs.uuid,
        resourceName: `${selectedMs.application}/${selectedMs.name}`,
        sourceType: "microservice",
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

  const yamlDump = React.useMemo(() => {
    return dumpMicroserviceYAML({
      microservice: selectedMs,
      activeAgents: data?.activeAgents,
      reducedAgents: data?.reducedAgents,
    });
  }, [selectedMs, data]);

  const handleEditYaml = () => {
    // Add YAML editor session to global state
    addYamlSession({
      title: `Microservice YAML: ${selectedMs.application}/${selectedMs.name}`,
      dedupeKey: `microservice:${selectedMs.uuid}`,
      content: yamlDump,
      isDirty: false,
      onSave: async (content: string) => {
        await handleYamlUpdate(content);
      },
    });
  };

  async function restartFunction(type: boolean) {
    try {
      const res = await request(
        `/api/v3/microservices/${selectedMs.uuid}${type ? "/start" : "/stop"}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
          },
        },
      );
      if (res.ok) {
        pushFeedback({
          message: !type ? "Microservices stopped!" : "Microservices started!",
          type: "success",
        });
        setShowResetConfirmModal(false);
        setShowStartStopConfirmModal(false);
        setIsOpen(false);
      } else {
        pushFeedback({ message: res.message, type: "error" });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error" });
    }
  }

  const handleStartStop = async () => {
    await restartFunction(selectedMs?.isActivated === true ? false : true);
  };

  useEffect(() => {
    if (selectedPort) {
      setShowPortDeleteConfirmModal(true);
    }
  }, [selectedPort]);

  useEffect(() => {
    if (selectedVolume) {
      setShowVolumeDeleteConfirmModal(true);
    }
  }, [selectedVolume]);

  const columns = [
    {
      key: "name",
      header: "Microservice Name",
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
      key: "agentName",
      header: "Agent Name",
    },
    {
      key: "application",
      header: "Application",
    },
    {
      key: "cpuUsage",
      header: "CPU Usage",
      render: (row: any) => {
        const usage = Number(row?.status?.cpuUsage || 0);
        return <CustomProgressBar value={usage} max={100} unit="%" />;
      },
    },
    {
      key: "memoryUsage",
      header: "Memory Usage",
      render: (row: any) => (
        <CustomProgressBar
          value={row?.status?.memoryUsage}
          max={data.reducedAgents.byUUID[row?.iofogUuid]?.systemAvailableMemory}
          unit="microservice"
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: any) => {
        const status = row.status?.status || "UNKNOWN";
        const percentage = row.status?.percentage;

        if (status === "PULLING") {
          return (
            <span className="text-yellow-500 font-semibold">
              {`${status}${typeof percentage === "number" ? ` (${percentage?.toFixed(2)}%)` : ""}`}
            </span>
          );
        }

        const bgColor = StatusColor[status as StatusType] ?? "#9CA3AF";
        const textColor = getTextColor(bgColor);
        return (
          <span
            className="px-2 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: bgColor,
              color: textColor,
            }}
          >
            {status}
          </span>
        );
      },
    },
  ];

  const slideOverFields = [
    {
      label: "Microservice Details",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "uuid",
      render: (row: any) => row.uuid || "N/A",
    },
    {
      label: "Activation",
      render: (row: any) => {
        const bgColor =
          StatusColor[row.isActivated ? "ACTIVE" : "INACTIVE"] ?? "#9CA3AF";
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
    {
      label: "Ip Address",
      render: (row: any) => row.status.ipAddress || "N/A",
    },
    {
      label: "Agent",
      render: (row: any) => {
        const agent = data.reducedAgents.byUUID[row.iofogUuid];
        if (!agent) return <span className="text-gray-400">N/A</span>;
        return (
          <NavLink
            to={`/nodes/list?agentId=${encodeURIComponent(row.iofogUuid)}`}
            className="text-blue-400 underline cursor-pointer"
          >
            {agent.name}
          </NavLink>
        );
      },
    },
    {
      label: "Application",
      render: (row: any) => {
        if (!row?.name) return <span className="text-gray-400">No name</span>;
        return (
          <NavLink
            to={`/Workloads/ApplicationList?applicationId=${encodeURIComponent(row.applicationId)}`}
            className="text-blue-400 underline cursor-pointer"
          >
            {row.application}
          </NavLink>
        );
      },
    },
    {
      label: "Name",
      render: (row: any) => row.name || "N/A",
    },
    {
      label: "Start Time",
      render: (row: any) => {
        const startTime = row.status.startTime;
        const dateStr = startTime
          ? new Date(startTime).toLocaleString()
          : "N/A";
        return (
          <span className="font-semibold truncate" title={dateStr}>
            {dateStr}
          </span>
        );
      },
    },
    {
      label: "Created at",
      render: (row: any) => {
        const created = row.createdAt || row.creationTimestamp;
        if (!created) return "N/A";
        const date = new Date(created);
        const formattedDate = format(date, "PPpp");
        return `${formatDistanceToNow(date, { addSuffix: true })} (${formattedDate})`;
      },
    },
    {
      label: "Operating Duration",
      render: (row: any) => {
        const durationMs = row.status.operatingDuration;
        if (!durationMs) return "N/A";

        const totalSeconds = Math.floor(durationMs / 1000);
        const days = Math.floor(totalSeconds / (24 * 3600));
        const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${days}d ${hours}h ${minutes}m ${seconds}s`;
      },
    },
    {
      label: "Images",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "AMD64 Image",
      render: (row: any) => row.images?.[0]?.containerImage || "N/A",
    },
    {
      label: "ARM64 Image",
      render: (row: any) => row.images?.[1]?.containerImage || "N/A",
    },
    {
      label: "RISCV64 Image",
      render: (row: any) => row.images?.[2]?.containerImage || "N/A",
    },
    {
      label: "ARM Image",
      render: (row: any) => row.images?.[3]?.containerImage || "N/A",
    },
    {
      label: "Registry",
      render: (row: any) => {
        if (!row?.registryId) return <span className="text-gray-400">N/A</span>;
        return (
          <NavLink
            to={`/config/registries?registryId=${encodeURIComponent(row.registryId)}`}
            className="text-blue-400 underline cursor-pointer"
          >
            {row.registryId}
          </NavLink>
        );
      },
    },
    {
      label: "Catalog Item Id",
      render: (row: any) => {
        if (!row?.catalogItemId)
          return <span className="text-gray-400">N/A</span>;
        return (
          <NavLink
            to={`/config/CatalogMicroservices?catalogItemid=${encodeURIComponent(row.catalogItemId)}`}
            className="text-blue-400 underline cursor-pointer"
          >
            {row.catalogItemId}
          </NavLink>
        );
      },
    },
    {
      label: "NATs Config",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (row: any) => {
        const natsAccess = row?.natsConfig?.natsAccess ?? row?.natsAccess;
        const natsRule = row?.natsConfig?.natsRule ?? row?.natsRule;
        const natsRuleId = row?.natsRuleId;
        const hasNatsConfig =
          natsAccess !== undefined ||
          Boolean(natsRule) ||
          (natsRuleId !== undefined && natsRuleId !== null);

        if (!hasNatsConfig) {
          return <div className="text-sm text-gray-400">No NATs config.</div>;
        }

        return (
          <div className="rounded-md border border-gray-700 bg-gray-800/40 p-3">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs text-gray-400">Access</span>
              <span
                className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                  natsAccess === true
                    ? "bg-emerald-600/30 text-emerald-300"
                    : natsAccess === false
                      ? "bg-red-600/30 text-red-300"
                      : "bg-gray-600/40 text-gray-300"
                }`}
              >
                {natsAccess === undefined
                  ? "N/A"
                  : natsAccess
                    ? "ENABLED"
                    : "DISABLED"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400">Rule</span>
              <span className="text-sm font-medium break-all">
                {natsRule ||
                  (natsRuleId !== undefined && natsRuleId !== null
                    ? `${natsRuleId}`
                    : "N/A")}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      label: "Status",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "Status",
      render: (row: any) => {
        const bgColor =
          StatusColor[row.status?.status as StatusType] ?? "#9CA3AF";
        const textColor = getTextColor(bgColor);
        return (
          <span
            className="px-2 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: bgColor,
              color: textColor,
            }}
          >
            {row.status?.status}
          </span>
        );
      },
    },
    {
      label: "Health Check Status",
      render: (row: any) => {
        return row.status?.healthStatus ? (
          <span className="text-white whitespace-pre-wrap break-words">
            {row.status?.healthStatus}
          </span>
        ) : (
          "N/A"
        );
      },
    },
    {
      label: "Error Messages",
      render: (node: any) => {
        return node.status.errorMessage ? (
          <span className="text-white whitespace-pre-wrap break-words">
            {node.status?.errorMessage}
          </span>
        ) : (
          "N/A"
        );
      },
    },
    {
      label: "Exec Session Ids",
      render: (row: any) => renderExecSessionIds(row.status.execSessionIds),
    },
    {
      label: "Container Id",
      render: (row: any) => (
        <span
          className="font-semibold truncate"
          title={row.status.containerId || "N/A"}
        >
          {row.status.containerId || "N/A"}
        </span>
      ),
    },
    {
      label: "Exec Status",
      render: (row: any) => {
        const bgColor =
          StatusColor[row.execStatus?.status as StatusType] ?? "#9CA3AF";
        const textColor = getTextColor(bgColor);
        return (
          <span
            className="px-2 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: bgColor,
              color: textColor,
            }}
          >
            {row.execStatus?.status ?? "UNKNOWN"}
          </span>
        );
      },
    },
    {
      label: "Active Exec Session Id",
      render: (row: any) => row.execStatus?.execSessionId || "N/A",
    },
    {
      label: "Resource Utilization",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "CPU Usage",
      render: (row: any) =>
        `${(Number(row?.status?.cpuUsage) || 0)?.toFixed(2)}%`,
    },
    {
      label: "Memory Usage",
      render: (row: any) => `${prettyBytes(row.status?.memoryUsage || 0)}`,
    },
    {
      label: "Ports",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (node: any) => {
        const ports = node?.ports || [];

        if (!Array.isArray(ports) || ports.length === 0) {
          return (
            <div className="text-sm text-gray-400">
              No ports found for this microservice.
            </div>
          );
        }

        const portData = ports.map((port: any, index: number) => ({
          internal: port.internal,
          external: port.external,
          protocol: port.protocol,
          publicLink: port.public?.links?.[0] || "-",
          key: `${port.internal}-${port.external}-${index}`,
        }));

        const portColumns = [
          {
            key: "internal",
            header: "Internal",
            formatter: ({ row }: any) => (
              <span className="text-white">{row.internal}</span>
            ),
          },
          {
            key: "external",
            header: "External",
            formatter: ({ row }: any) => (
              <span className="text-white">{row.external}</span>
            ),
          },
          {
            key: "protocol",
            header: "Protocol",
            formatter: ({ row }: any) => (
              <span className="uppercase text-white">{row.protocol}</span>
            ),
          },
          {
            key: "publicLink",
            header: "Public Link",
            formatter: ({ row }: any) =>
              row.publicLink !== "-" ? (
                <a
                  href={row.publicLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 underline"
                >
                  {row.publicLink}
                </a>
              ) : (
                <span className="text-gray-400">-</span>
              ),
          },
          {
            key: "action",
            header: "Action",
            render: (row: any) => {
              return (
                <button
                  onClick={() => setSelectedPort(row)}
                  className="hover:text-red-600 hover:bg-white rounded"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </button>
              );
            },
          },
        ];

        return (
          <CustomDataTable
            columns={portColumns}
            data={portData}
            getRowKey={(row: any) => row.key}
          />
        );
      },
    },
    {
      label: "Volumes",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (node: any) => {
        const volumes = node?.volumeMappings || [];

        if (!Array.isArray(volumes) || volumes.length === 0) {
          return (
            <div className="text-sm text-gray-400">
              No Volumes found for this microservice.
            </div>
          );
        }

        const volumesData = volumes.map((volume: any, index: number) => ({
          host: volume.hostDestination,
          container: volume.containerDestination,
          accessMode: volume.accessMode,
          type: volume.type || "-",
          key: `${volume.hostDestination}-${volume.containerDestination}-${index}`,
        }));

        const volumeColumns = [
          {
            key: "host",
            header: "Host",
            formatter: ({ row }: any) => (
              <span className="text-white">{row.host}</span>
            ),
          },
          {
            key: "container",
            header: "Container",
            formatter: ({ row }: any) => (
              <span className="text-white">{row.container}</span>
            ),
          },
          {
            key: "accessMode",
            header: "Access Mode",
            formatter: ({ row }: any) => (
              <span className="uppercase text-white">{row.accessMode}</span>
            ),
          },
          {
            key: "type",
            header: "Type",
            formatter: ({ row }: any) => (
              <span className="text-white">{row.type}</span>
            ),
          },
          {
            key: "action",
            header: "Action",
            render: (row: any) => {
              return (
                <button
                  onClick={() => setSelectedVolume(row)}
                  className="hover:text-red-600 hover:bg-white rounded"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </button>
              );
            },
          },
        ];

        return (
          <CustomDataTable
            columns={volumeColumns}
            data={volumesData}
            getRowKey={(row: any) => row.key}
          />
        );
      },
    },
    {
      label: "Environment Variables",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (node: any) => {
        const envVars = node?.env || [];

        if (!Array.isArray(envVars) || envVars.length === 0) {
          return (
            <div className="text-sm text-gray-400">
              No environment variables found for this microservice.
            </div>
          );
        }

        const envData = envVars.map((env: any, index: number) => ({
          keyName: env.key,
          value: <CryptoTextBox data={env.value} mode="plain" />,
          key: `${env.key}-${index}`,
        }));

        const envColumns = [
          {
            key: "keyName",
            header: "Key",
            formatter: ({ row }: any) => (
              <span className="text-white">{row.keyName}</span>
            ),
          },
          {
            key: "value",
            header: "Value",
          },
        ];

        return (
          <CustomDataTable
            columns={envColumns}
            data={envData}
            getRowKey={(row: any) => row.key}
          />
        );
      },
    },
    {
      label: "Extra Hosts",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (node: any) => {
        const extraHosts = node?.extraHosts || [];

        if (!Array.isArray(extraHosts) || extraHosts.length === 0) {
          return (
            <div className="text-sm text-gray-400">
              No extra hosts found for this microservice.
            </div>
          );
        }

        const extraHostsData = extraHosts.map((host: any, index: number) => ({
          name: host.name || "-",
          address: host.address || "-",
          value: host.value || "-",
          key: `${host.name}-${host.address}-${index}`,
        }));

        const extraHostColumns = [
          {
            key: "name",
            header: "Name",
            formatter: ({ row }: any) => (
              <span className="text-white">{row.name}</span>
            ),
          },
          {
            key: "address",
            header: "Address",
            formatter: ({ row }: any) => (
              <span className="text-white">{row.address}</span>
            ),
          },
          {
            key: "value",
            header: "Value",
            formatter: ({ row }: any) => (
              <span className="text-white">{row.value}</span>
            ),
          },
        ];

        return (
          <CustomDataTable
            columns={extraHostColumns}
            data={extraHostsData}
            getRowKey={(row: any) => row.key}
          />
        );
      },
    },
    {
      label: "Config",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (node: any) => {
        const lineHeight = 50;
        const minLines = 10;
        const maxLines = 50;
        const lineCount = Math.max(
          minLines,
          Math.min(configData?.length || 0, maxLines),
        );
        const dynamicHeight = `${lineCount * lineHeight}px`;

        return (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-300">
                {node?.id}
              </h2>
              <div className="flex space-x-2">
                {dirtyEditors && (
                  <button
                    onClick={() => handleConfigPatch}
                    className="hover:text-green-600 hover:bg-white rounded"
                  >
                    <EditOutlinedIcon fontSize="small" />
                  </button>
                )}
                <button
                  onClick={() => handleConfigDelete}
                  className="hover:text-green-600 hover:bg-white rounded"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </button>
              </div>
            </div>

            <AceEditor
              mode="yaml"
              theme="tomorrow"
              name={`editor-service`}
              value={editorContent}
              onChange={function editorChanged(value: string) {
                setDirtyEditors(true);
                setEditorValues(value);
                setEditorContent(value);
              }}
              showPrintMargin={false}
              setOptions={{
                useWorker: false,
                wrap: true,
                tabSize: 2,
              }}
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
      },
    },
  ];

  return (
    <div className=" bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
        Microservices List
      </h1>
      <CustomDataTable
        columns={columns}
        data={sortedMicroservices}
        getRowKey={(row: any) => row.uuid}
        uploadDropzone
        uploadFunction={processUnifiedYaml}
      />
      <SlideOver
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={selectedMs?.name || "Microservice Details"}
        data={selectedMs}
        fields={slideOverFields}
        onRestart={() => setShowResetConfirmModal(true)}
        onDelete={() => setShowDeleteConfirmModal(true)}
        onEditYaml={handleEditYaml}
        onTerminal={() => openExecTerminal(selectedMs?.uuid!)}
        onLogs={handleOpenLogs}
        onStartStop={() => setShowStartStopConfirmModal(true)}
        startStopValue={selectedMs?.isActivated ? "stop" : ""}
        customWidth={750}
        enablePolling={true}
        onRefresh={handleRefreshMicroservice}
      />
      <UnsavedChangesModal
        open={showResetConfirmModal}
        onCancel={() => setShowResetConfirmModal(false)}
        onConfirm={handleRestart}
        title={`Rebuilding Microservice ${selectedMs?.name}`}
        message={
          "This action will rebuild the microservice. Pulling the image and restarting the microservice. This is not reversible."
        }
        cancelLabel={"Cancel"}
        confirmLabel={"Rebuild"}
        confirmColor="bg-blue"
      />
      <UnsavedChangesModal
        open={showDeleteConfirmModal}
        onCancel={() => setShowDeleteConfirmModal(false)}
        onConfirm={handleDelete}
        title={`Deleting Microservice ${selectedMs?.name}`}
        message={
          "This action will remove the microservice from the system. All data and configurations will be lost. This is not reversible."
        }
        cancelLabel={"Cancel"}
        confirmLabel={"Delete"}
      />
      <UnsavedChangesModal
        open={showPortDeleteConfirmModal}
        onCancel={() => setShowPortDeleteConfirmModal(false)}
        onConfirm={handlePortsDelete}
        title={`Deleting Port ${selectedPort?.internal}`}
        message={
          "This action will remove the port from the microservice. This is not reversible."
        }
        cancelLabel={"Cancel"}
        confirmLabel={"Delete"}
      />
      <UnsavedChangesModal
        open={showVolumeDeleteConfirmModal}
        onCancel={() => setShowVolumeDeleteConfirmModal(false)}
        onConfirm={handleVolumeDelete}
        title={`Deleting Volume ${selectedVolume?.host}`}
        message={
          "This action will remove the volume from the microservice. This is not reversible."
        }
        cancelLabel={"Cancel"}
        confirmLabel={"Delete"}
      />
      <UnsavedChangesModal
        open={showStartStopConfirmModal}
        onCancel={() => setShowStartStopConfirmModal(false)}
        onConfirm={handleStartStop}
        title={`${selectedMs?.isActivated ? "Stop" : "Start"} ${selectedMs?.name}`}
        message={`Are you sure you want to ${selectedMs?.isActivated ? "stop" : "start"} this microservice?`}
        cancelLabel={"Cancel"}
        confirmLabel={selectedMs?.isActivated ? "Stop" : "Start"}
        confirmColor={selectedMs?.isActivated ? "bg-red" : "bg-red"}
      />
      <LogConfigModal
        open={showLogConfigModal}
        onClose={() => setShowLogConfigModal(false)}
        onConfirm={handleLogConfigConfirm}
        logSourceName={selectedMs?.name || "Microservice"}
        logSourceType="microservice"
      />
    </div>
  );
}

export default MicroservicesList;
