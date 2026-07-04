import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useData, useController, useFeedback } from "@/app/providers";
import CustomDataTable from "@/components/ui/CustomDataTable";
import CustomProgressBar from "@/components/ui/CustomProgressBar";
import AgentSlideOverPanel from "@/features/agents/AgentSlideOverPanel";
import { formatArchitectureLabel, getTextColor } from "../../lib/formatting";
import { StatusColor, StatusType } from "@/lib/constants/Enums/StatusColor";
import { useUnifiedYamlUpload } from "../../hooks/useUnifiedYamlUpload";

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
      key: "host",
      header: "Host",
    },
    {
      key: "deploymentType",
      header: "Deployment Type",
    },
    {
      key: "containerEngine",
      header: "Container Engine",
    },
    {
      key: "architecture",
      header: "Architecture",
      render: (row: any) => formatArchitectureLabel(row),
    },
    {
      key: "memoryUsage",
      header: "Memory Usage",
      render: (row: any) => (
        <CustomProgressBar
          value={row.memoryUsage}
          max={row.systemAvailableMemory}
          unit="agent"
        />
      ),
    },
    {
      key: "cpuUsage",
      header: "CPU Usage",
      render: (row: any) => (
        <CustomProgressBar value={row.cpuUsage} max={100} unit="%" />
      ),
    },
    {
      key: "diskUsage",
      header: "Disk Usage",
      render: (row: any) => (
        <CustomProgressBar
          value={row.diskUsage}
          max={row.diskLimit}
          unit="agent-disk"
        />
      ),
    },
    {
      key: "version",
      header: "Version",
    },
    {
      key: "daemonStatus",
      header: "Status",
      render: (row: any) => {
        const statusKey = row.daemonStatus;
        const bgColor = StatusColor[statusKey as StatusType] ?? "#9CA3AF";
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
