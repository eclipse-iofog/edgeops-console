import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { useData, useController, useFeedback } from "@/app/providers";
import CustomDataTable from "@/components/ui/CustomDataTable";
import AgentSlideOverPanel from "@/features/agents/AgentSlideOverPanel";
import {
  displayOrDash,
  HostCpuMetricBar,
  HostDiskFsMetricBar,
  HostMemoryMetricBar,
} from "@/components/ui/EdgeletHostMetricCells";
import { formatArchitectureLabel, getTextColor } from "../../lib/formatting";
import {
  formatCpuCoresWithLimit,
  formatDecimalGbPair,
  formatEdgeletMemory,
  isResourceViolation,
} from "@/lib/formatting/resourceMetrics";
import { StatusColor, StatusType } from "@/lib/constants/Enums/StatusColor";
import { useUnifiedYamlUpload } from "../../hooks/useUnifiedYamlUpload";

function EdgeletStatusCell({ row }: { row: any }) {
  const statusKey = row.daemonStatus;
  const bgColor = StatusColor[statusKey as StatusType] ?? "#9CA3AF";
  const textColor = getTextColor(bgColor);
  const violations = [
    isResourceViolation(row.cpuViolation) && "CPU",
    isResourceViolation(row.memoryViolation) && "Memory",
    isResourceViolation(row.diskViolation) && "Disk",
  ].filter(Boolean) as string[];

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span
        className="px-2 py-1 rounded-full text-xs font-semibold"
        style={{
          backgroundColor: bgColor,
          color: textColor,
        }}
      >
        {row.daemonStatus}
      </span>
      {violations.length > 0 ? (
        <span
          className="inline-flex items-center text-amber-400"
          title={`Limit violation: ${violations.join(", ")}`}
        >
          <AlertTriangle className="w-3.5 h-3.5" aria-hidden />
        </span>
      ) : null}
    </div>
  );
}

function NodesList() {
  const { data } = useData();
  const { request } = useController();
  const { pushFeedback } = useFeedback();
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const agentId = params.get("agentId");

  useEffect(() => {
    if (agentId && data?.reducedAgents) {
      const found = data?.reducedAgents.byUUID[agentId];
      if (found) {
        setSelectedNode(found);
        setIsOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId]);

  const handleRowClick = (row: any) => {
    setSelectedNode(row);
    setIsOpen(true);
  };

  const refreshFunctions = React.useMemo(() => {
    const map = new Map();
    map.set("Agent", async () => {
      // Data provider will automatically refresh on next poll cycle
    });
    return map;
  }, []);

  const { processYamlFile: processUnifiedYaml } = useUnifiedYamlUpload({
    request,
    pushFeedback,
    refreshFunctions,
  });

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
      key: "daemonStatus",
      header: "Status",
      render: (row: any) => <EdgeletStatusCell row={row} />,
    },
    {
      key: "host",
      header: "Host",
      render: (row: any) => (
        <span className="text-xs text-gray-300 whitespace-nowrap">
          {displayOrDash(row.host || row.ipAddress)}
        </span>
      ),
    },
    {
      key: "systemOs",
      header: "Host OS",
      render: (row: any) => (
        <span className="text-xs text-gray-300">{displayOrDash(row.systemOs)}</span>
      ),
    },
    {
      key: "systemOsVersion",
      header: "OS Version",
      render: (row: any) => (
        <span className="text-xs text-gray-300">
          {displayOrDash(row.systemOsVersion)}
        </span>
      ),
    },
    {
      key: "systemCpus",
      header: "Host CPUs",
      render: (row: any) => {
        const cpus = row.systemCpus;
        if (cpus == null || cpus === "") {
          return <span className="text-xs text-gray-500">—</span>;
        }
        return (
          <span className="text-xs text-gray-300 whitespace-nowrap">
            {cpus} {Number(cpus) === 1 ? "core" : "cores"}
          </span>
        );
      },
    },
    {
      key: "architecture",
      header: "Architecture",
      render: (row: any) => formatArchitectureLabel(row),
    },
    {
      key: "cpuUsage",
      header: "Edgelet CPU Usage",
      render: (row: any) => (
        <span className="text-xs text-gray-300 whitespace-nowrap">
          {formatCpuCoresWithLimit(row.cpuUsage, row.cpuLimit)}
        </span>
      ),
    },
    {
      key: "memoryUsage",
      header: "Edgelet Memory Usage",
      render: (row: any) => (
        <span className="text-xs text-gray-300 whitespace-nowrap">
          {formatEdgeletMemory(row.memoryUsage, row.memoryLimit)}
        </span>
      ),
    },
    {
      key: "diskUsage",
      header: "Data Directory",
      render: (row: any) => (
        <span className="text-xs text-gray-300 whitespace-nowrap">
          {formatDecimalGbPair(row.diskUsage, row.diskLimit)}
        </span>
      ),
    },
    {
      key: "systemTotalCpu",
      header: "Host CPU Usage",
      render: (row: any) => <HostCpuMetricBar row={row} />,
    },
    {
      key: "systemTotalMemory",
      header: "Host Memory",
      render: (row: any) => <HostMemoryMetricBar row={row} />,
    },
    {
      key: "systemTotalDisk",
      header: "Host Disk (FS)",
      render: (row: any) => <HostDiskFsMetricBar row={row} />,
    },
    {
      key: "version",
      header: "Version",
    },
  ];

  const sortedAgents = React.useMemo(() => {
    const agents = Object.values(data?.reducedAgents?.byName || []) as any[];
    return [...agents].sort((a: any, b: any) => {
      if (Boolean(a.isSystem) !== Boolean(b.isSystem)) {
        return a.isSystem ? -1 : 1;
      }
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [data?.reducedAgents?.byName]);

  return (
    <div className=" bg-gray-900 text-white p-4">
      <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
        Edgelet List
      </h1>
      <CustomDataTable
        columns={columns}
        data={sortedAgents}
        getRowKey={(row: any) => row.uuid}
        uploadDropzone
        uploadFunction={processUnifiedYaml}
      />

      <AgentSlideOverPanel
        open={isOpen}
        onClose={() => setIsOpen(false)}
        selectedNode={selectedNode}
        onSelectedNodeChange={setSelectedNode}
        slideOverWidth={750}
      />
    </div>
  );
}

export default NodesList;
