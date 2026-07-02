import React from "react";
import { formatDistanceToNow, format } from "date-fns";
import ResourceLink from "@/components/ui/ResourceLink";
import CustomDataTable from "@/components/ui/CustomDataTable";
import {
  formatArchitectureLabel,
  getTextColor,
  MiBFactor,
  prettyBytes,
} from "@/lib/formatting";
import { StatusColor, StatusType } from "@/lib/constants/Enums/StatusColor";
import { BadgeList } from "@/AccessControl/utils/badgeHelpers";
import { formatAgentDuration } from "./formatAgentDuration";
import { PlatformStatusBadge, ReconcileActionControl } from "@/lib/platformReconcile";

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
