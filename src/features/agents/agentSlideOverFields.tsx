import React from "react";
import { formatDistanceToNow, format } from "date-fns";
import ResourceLink from "@/components/ui/ResourceLink";
import CustomDataTable from "@/components/ui/CustomDataTable";
import { formatArchitectureLabel, getTextColor } from "@/lib/formatting";
import {
  displayOrDash,
  HostCpuMetricBar,
  HostDiskFsMetricBar,
  HostMemoryMetricBar,
} from "@/components/ui/EdgeletHostMetricCells";
import {
  formatCpuCoresWithLimit,
  formatDecimalGbPair,
  formatEdgeletMemory,
  formatHostBytesUsedTotal,
  formatHostCpuPercentLabel,
  isResourceViolation,
} from "@/lib/formatting/resourceMetrics";
import { StatusColor, StatusType } from "@/lib/constants/Enums/StatusColor";
import { BadgeList } from "@/AccessControl/utils/badgeHelpers";
import { formatAgentDuration } from "./formatAgentDuration";
import { PlatformStatusBadge, ReconcileActionControl } from "@/lib/platformReconcile";
import {
  displayActiveModels,
  displayFogValue,
  formatTotalBytes,
  formatUnixMilliseconds,
  isManagedModelSource,
  parseCdiDeviceNames,
  parseModelStatusRows,
  parseRuntimeClassRows,
} from "./agentFogStatus";

function noneFoundForAgent(resource: string) {
  return (
    <div className="text-sm text-gray-400">
      No {resource} found for this agent.
    </div>
  );
}

function renderViolationFlag(value: unknown) {
  const violated = isResourceViolation(value);
  return (
    <span className={violated ? "text-amber-300 font-medium" : "text-gray-300"}>
      {violated ? "Yes" : "No"}
    </span>
  );
}

function formatLogicalCpus(value: unknown) {
  if (value == null || value === "") {
    return "N/A";
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return displayOrDash(value);
  }
  return `${n} ${n === 1 ? "core" : "cores"}`;
}

const renderAgentTags = (tags: any) => {
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

export type AgentSlideOverReconcileOptions = {
  onReconcile: () => void;
  reconciling: boolean;
  spinning: boolean;
};

export const buildAgentSlideOverFields = (
  data: any,
  reconcile?: AgentSlideOverReconcileOptions,
) => {
  return [
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
      label: "Platform infrastructure",
      render: () => "",
      isSectionHeader: true,
    },
    ...(reconcile
      ? [
          {
            label: "Manual sync",
            render: () => (
              <ReconcileActionControl
                onReconcile={reconcile.onReconcile}
                spinning={reconcile.spinning}
                reconciling={reconcile.reconciling}
                title="Re-applies router and NATS platform configuration for this node."
                label="Sync now"
              />
            ),
          },
        ]
      : []),
    {
      label: "Setup status",
      render: (row: any) => {
        const phase = row.platformStatus?.phase;
        if (!phase) return "N/A";
        return <PlatformStatusBadge phase={phase} />;
      },
    },
    {
      label: "Last Error",
      render: (row: any) => {
        const lastError = row.platformStatus?.lastError;
        if (!lastError) return "N/A";
        return (
          <span className="text-red-300 whitespace-pre-wrap break-words">
            {lastError}
          </span>
        );
      },
    },
    {
      label: "Generation",
      render: (row: any) => {
        const ps = row.platformStatus;
        if (!ps) return "N/A";
        const drift = ps.generation !== ps.observedGeneration;
        return (
          <span className={drift ? "text-amber-300" : undefined}>
            {ps.observedGeneration} / {ps.generation}
            {drift ? " (in progress)" : ""}
          </span>
        );
      },
    },
    {
      label: "Last Transition",
      render: (row: any) => {
        const at = row.platformStatus?.lastTransitionAt;
        if (!at) return "N/A";
        const date = new Date(at);
        return `${formatDistanceToNow(date, { addSuffix: true })} (${format(date, "PPpp")})`;
      },
    },
    {
      label: "Conditions",
      render: (row: any) => {
        const conditions = row.platformStatus?.conditions;
        if (!Array.isArray(conditions) || conditions.length === 0) {
          return "N/A";
        }
        return (
          <div className="space-y-1">
            {conditions.map((c: any, i: number) => (
              <div key={i} className="text-xs text-gray-300">
                {c.type}: {c.status}
                {c.reason ? ` (${c.reason})` : ""}
              </div>
            ))}
          </div>
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
        return formatAgentDuration(node.daemonOperatingDuration);
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
      render: (row: any) => renderAgentTags(row.tags),
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
      label: "Host",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "Logical CPUs",
      render: (node: any) => formatLogicalCpus(node.systemCpus),
    },
    {
      label: "Host OS",
      render: (node: any) =>
        node.systemOs != null && node.systemOs !== ""
          ? String(node.systemOs)
          : "N/A",
    },
    {
      label: "OS version",
      render: (node: any) => displayOrDash(node.systemOsVersion),
    },
    {
      label: "Kernel",
      render: (node: any) => {
        const os = String(node.systemOs ?? "").toLowerCase();
        if (os !== "linux") {
          return "N/A";
        }
        const kernel = node.systemKernelVersion;
        return kernel != null && kernel !== "" ? String(kernel) : "—";
      },
    },
    {
      label: "Host CPU usage",
      render: (node: any) => (
        <div className="max-w-md space-y-1">
          <span className="text-sm text-gray-300 block">
            {formatHostCpuPercentLabel(node.systemTotalCpu)}
          </span>
          <HostCpuMetricBar row={node} />
        </div>
      ),
    },
    {
      label: "Host memory",
      render: (node: any) => (
        <div className="max-w-md space-y-1">
          <span className="text-sm text-gray-300 block">
            {formatHostBytesUsedTotal(
              node.systemTotalMemory,
              node.systemAvailableMemory,
            )}
          </span>
          <HostMemoryMetricBar row={node} />
        </div>
      ),
    },
    {
      label: "Host disk (FS)",
      render: (node: any) => (
        <div className="max-w-md space-y-1">
          <span className="text-sm text-gray-300 block">
            {formatHostBytesUsedTotal(
              node.systemTotalDisk,
              node.systemAvailableDisk,
            )}
          </span>
          <HostDiskFsMetricBar row={node} />
        </div>
      ),
    },
    {
      label: "",
      render: () => (
        <p className="text-xs text-gray-500">
          Host fields are informational inventory, not Edge Guard attestation.
        </p>
      ),
    },
    {
      label: "Edgelet stack",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "Edgelet CPU usage",
      render: (node: any) =>
        formatCpuCoresWithLimit(node.cpuUsage, node.cpuLimit),
    },
    {
      label: "CPU violation",
      render: (node: any) => renderViolationFlag(node.cpuViolation),
    },
    {
      label: "Edgelet memory usage",
      render: (node: any) =>
        formatEdgeletMemory(node.memoryUsage, node.memoryLimit),
    },
    {
      label: "Memory violation",
      render: (node: any) => renderViolationFlag(node.memoryViolation),
    },
    {
      label: "Data directory",
      render: (node: any) =>
        formatDecimalGbPair(node.diskUsage, node.diskLimit),
    },
    {
      label: "Data directory path",
      render: (node: any) => node.diskDirectory || "N/A",
    },
    {
      label: "Disk violation",
      render: (node: any) => renderViolationFlag(node.diskViolation),
    },
    {
      label: "",
      render: () => (
        <p className="text-xs text-gray-500">
          Data directory usage is Edgelet policy storage, not the host
          filesystem totals above.
        </p>
      ),
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
                <ResourceLink
                  path="/config/VolumeMounts"
                  query={{ volumeMountName: row.name }}
                >
                  {row.name}
                </ResourceLink>
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
                <ResourceLink
                  path="/config/ConfigMaps"
                  query={{ configMapName: row.configMapName }}
                >
                  {row.configMapName}
                </ResourceLink>
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
                <ResourceLink
                  path="/config/secret"
                  query={{ secretName: row.secretName }}
                >
                  {row.secretName}
                </ResourceLink>
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
      label: "Applied Runtime Classes",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (node: any) => {
        const rows = parseRuntimeClassRows(node.runtimeClasses);
        if (rows.length === 0) {
          return noneFoundForAgent("runtime classes");
        }

        const localColumns = [
          {
            key: "name",
            header: "Name",
            render: (row: any) => {
              if (!row?.name) {
                return <span className="text-gray-400">No name</span>;
              }
              return (
                <ResourceLink
                  path="/config/RuntimeClasses"
                  query={{ runtimeClassName: row.name }}
                >
                  {row.name}
                </ResourceLink>
              );
            },
          },
          {
            key: "handler",
            header: "Handler",
            render: (row: any) => displayFogValue(row.handler),
          },
          {
            key: "source",
            header: "Source",
            render: (row: any) => displayFogValue(row.source),
          },
        ];

        return (
          <CustomDataTable
            columns={localColumns}
            data={rows}
            getRowKey={(row: any) =>
              row.uuid ||
              [row.name, row.source, row.handler].filter(Boolean).join("-") ||
              "runtime-class"
            }
          />
        );
      },
    },
    {
      label: "AI model status",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (node: any) => {
        const rows = parseModelStatusRows(node.modelStatus);
        if (rows.length === 0) {
          return noneFoundForAgent("AI models");
        }

        const localColumns = [
          {
            key: "name",
            header: "Name",
            render: (row: any) => {
              if (!row?.name) {
                return <span className="text-gray-400">No name</span>;
              }
              if (!isManagedModelSource(row.source)) {
                return <span>{row.name}</span>;
              }
              return (
                <span className="inline-flex flex-col items-start gap-0.5">
                  <ResourceLink
                    path="/config/Models"
                    query={{ modelName: row.name }}
                  >
                    {row.name}
                  </ResourceLink>
                  {row.uuid ? (
                    <span className="text-xs text-gray-400">{row.uuid}</span>
                  ) : null}
                </span>
              );
            },
          },
          {
            key: "source",
            header: "Source",
            render: (row: any) => displayFogValue(row.source),
          },
          {
            key: "state",
            header: "State",
            render: (row: any) => displayFogValue(row.state),
          },
          {
            key: "digest",
            header: "Digest",
            render: (row: any) => displayFogValue(row.digest),
          },
          {
            key: "resolvedRevision",
            header: "Resolved Revision",
            render: (row: any) => displayFogValue(row.resolvedRevision),
          },
          {
            key: "revisionFloating",
            header: "Revision Floating",
            render: (row: any) => displayFogValue(row.revisionFloating),
          },
          {
            key: "totalBytes",
            header: "Total Bytes",
            render: (row: any) => formatTotalBytes(row.totalBytes),
          },
          {
            key: "lastError",
            header: "Last Error",
            render: (row: any) => displayFogValue(row.lastError),
          },
        ];

        return (
          <CustomDataTable
            columns={localColumns}
            data={rows}
            getRowKey={(row: any) =>
              row.uuid ||
              [row.name, row.source, row.digest, row.state]
                .filter(Boolean)
                .join("-") ||
              "model-status"
            }
          />
        );
      },
    },
    {
      label: "Active models",
      render: (row: any) => displayActiveModels(row.activeModels),
    },
    {
      label: "Model last update",
      render: (row: any) => formatUnixMilliseconds(row.modelLastUpdate),
    },
    {
      label: "AI Knowledge status",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (node: any) => {
        const rows = parseModelStatusRows(node.knowledgeStatus);
        if (rows.length === 0) {
          return noneFoundForAgent("Knowledge");
        }

        const localColumns = [
          {
            key: "name",
            header: "Name",
            render: (row: any) => {
              if (!row?.name) {
                return <span className="text-gray-400">No name</span>;
              }
              if (!isManagedModelSource(row.source)) {
                return <span>{row.name}</span>;
              }
              return (
                <span className="inline-flex flex-col items-start gap-0.5">
                  <ResourceLink
                    path="/config/Knowledge"
                    query={{ knowledgeName: row.name }}
                  >
                    {row.name}
                  </ResourceLink>
                  {row.uuid ? (
                    <span className="text-xs text-gray-400">{row.uuid}</span>
                  ) : null}
                </span>
              );
            },
          },
          {
            key: "source",
            header: "Source",
            render: (row: any) => displayFogValue(row.source),
          },
          {
            key: "state",
            header: "State",
            render: (row: any) => displayFogValue(row.state),
          },
          {
            key: "digest",
            header: "Digest",
            render: (row: any) => displayFogValue(row.digest),
          },
          {
            key: "resolvedRevision",
            header: "Resolved Revision",
            render: (row: any) => displayFogValue(row.resolvedRevision),
          },
          {
            key: "revisionFloating",
            header: "Revision Floating",
            render: (row: any) => displayFogValue(row.revisionFloating),
          },
          {
            key: "totalBytes",
            header: "Total Bytes",
            render: (row: any) => formatTotalBytes(row.totalBytes),
          },
          {
            key: "lastError",
            header: "Last Error",
            render: (row: any) => displayFogValue(row.lastError),
          },
        ];

        return (
          <CustomDataTable
            columns={localColumns}
            data={rows}
            getRowKey={(row: any) =>
              row.uuid ||
              [row.name, row.source, row.digest, row.state]
                .filter(Boolean)
                .join("-") ||
              "knowledge-status"
            }
          />
        );
      },
    },
    {
      label: "Active knowledge",
      render: (row: any) => displayActiveModels(row.activeKnowledge),
    },
    {
      label: "Knowledge last update",
      render: (row: any) => formatUnixMilliseconds(row.knowledgeLastUpdate),
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
      label: "Available CDI devices",
      render: (row: any) => {
        const devices = parseCdiDeviceNames(row.availableCdiDevices);
        if (devices.length === 0) {
          return noneFoundForAgent("CDI devices");
        }
        return <BadgeList items={devices} emptyLabel="N/A" />;
      },
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
                <ResourceLink
                  path="/Workloads/ApplicationList"
                  query={{ applicationId: row.id }}
                >
                  {row.name}
                </ResourceLink>
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
          AgentApplications?.flatMap((app: any) => app.microservices || [])
            .filter((msvc: any) => msvc.iofogUuid === node.uuid) || [];

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
                <ResourceLink
                  path="/Workloads/MicroservicesList"
                  query={{ microserviceId: row.key }}
                >
                  {row.name}
                </ResourceLink>
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
                <ResourceLink
                  path="/Workloads/SystemApplicationList"
                  query={{ applicationId: row.id }}
                >
                  {row.name}
                </ResourceLink>
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
          systemAgentApplications
            ?.flatMap((app: any) => app.microservices || [])
            .filter((msvc: any) => msvc.iofogUuid === node.uuid) || [];

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
                <ResourceLink
                  path="/Workloads/SystemMicroservicesList"
                  query={{ microserviceId: row.key }}
                >
                  {row.name}
                </ResourceLink>
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
};
