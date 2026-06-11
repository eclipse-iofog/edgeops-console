import React from "react";
import { Cpu } from "lucide-react";
import ApexCharts from "react-apexcharts";
import { StatusColor, StatusType } from "@/lib/constants/Enums/StatusColor";
import { MiBFactor, prettyBytes } from "../../lib/formatting";

interface AgentData {
  uuid: string;
  name: string;
  daemonStatus: string;
  memoryUsage: number;
  diskUsage: number;
  cpuUsage: number;
}

interface AgentDashboardProps {
  agentData: Record<string, AgentData> | undefined;
}

const AgentDashboard: React.FC<AgentDashboardProps> = ({ agentData }) => {
  if (!agentData) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-2xl w-full h-full flex flex-col">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400 text-lg">Loading agent data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (agentData && Object.keys(agentData).length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-2xl w-full h-full flex flex-col">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="mb-4">
              <Cpu
                className="w-16 h-16 text-gray-400 mx-auto"
                strokeWidth={1.5}
              />
            </div>
            <p className="text-gray-400 text-lg mb-2">No agents found</p>
            <p className="text-gray-500 text-sm">
              No agent data is currently available
            </p>
          </div>
        </div>
      </div>
    );
  }

  const agentArray = Object.values(agentData);

  // Group agents by their actual status
  const statusGroups: Record<string, typeof agentArray> = {};
  agentArray.forEach((agent) => {
    const status = agent.daemonStatus || StatusType.UNKNOWN;
    if (!statusGroups[status]) {
      statusGroups[status] = [];
    }
    statusGroups[status].push(agent);
  });

  const daemonStatusLabels = Object.keys(statusGroups);
  const daemonStatusColors = daemonStatusLabels.map(
    (status) =>
      StatusColor[status as keyof typeof StatusColor] || StatusColor.UNKNOWN,
  );
  const daemonStatusChartSeries = daemonStatusLabels.map(
    (status) => statusGroups[status].length,
  );

  const daemonStatusChartOptions = {
    chart: {
      type: "donut" as const,
      background: "transparent",
      fontFamily: "Inter, system-ui, sans-serif",
      toolbar: { show: false },
    },
    labels: daemonStatusLabels,
    colors: daemonStatusColors,
    dataLabels: {
      enabled: true,
      style: {
        fontSize: "14px",
        fontWeight: "600",
        colors: ["#ffffff"],
      },
      formatter: function (val: string) {
        return Math.round(parseFloat(val)) + "%";
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total Agents",
              fontSize: "16px",
              fontWeight: "600",
              color: "#ffffff",
              formatter: function () {
                return agentArray.length.toString();
              },
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: function (_val: number, opts: any) {
          const status = daemonStatusLabels[opts.seriesIndex];
          const agentNames = statusGroups[status]
            .map((agent) => `• ${agent.name}`)
            .join("<br />");
          return agentNames || "No agents";
        },
      },
      style: {
        fontSize: "14px",
        fontFamily: "Inter, system-ui, sans-serif",
      },
    },
    legend: {
      labels: {
        colors: "#e5e7eb",
        fontSize: "14px",
        fontWeight: "500",
      },
      position: "bottom" as const,
      horizontalAlign: "center" as const,
      itemMargin: {
        horizontal: 20,
        vertical: 5,
      },
    },
    theme: { mode: "dark" as const },
    stroke: {
      show: true,
      width: 2,
      colors: ["#1f2937"],
    },
  };

  const bubbleSeries = Object.keys(statusGroups).map((status) => ({
    name: status,
    color: StatusColor[status as keyof typeof StatusColor] || "#FFFFFF",
    data: statusGroups[status].map((agent) => ({
      x: agent.cpuUsage || 0,
      y: agent.memoryUsage
        ? (agent.memoryUsage * MiBFactor) / (1024 * 1024)
        : 0,
      z: agent.diskUsage ? (agent.diskUsage * MiBFactor) / (1024 * 1024) : 0,
      daemonStatus: agent.daemonStatus,
      name: agent.name,
    })),
  }));

  const memoryValues = agentArray.map((agent) =>
    agent.memoryUsage ? (agent.memoryUsage * MiBFactor) / (1024 * 1024) : 0,
  );
  const maxMemory = Math.max(...memoryValues);
  const dynamicYMax = maxMemory > 0 ? Math.ceil(maxMemory * 1.2) : 1000;

  const cpuValues = agentArray.map((agent) =>
    agent.cpuUsage ? Number(agent.cpuUsage) : 0,
  );
  const maxCpu = Math.max(...cpuValues);
  const dynamicXMax = maxCpu > 0 ? Math.max(Math.ceil(maxCpu * 1.2), 20) : 100;

  const bubbleChartOptions = {
    chart: {
      type: "bubble" as const,
      background: "transparent",
      fontFamily: "Inter, system-ui, sans-serif",
      toolbar: { show: false },
      animations: {
        enabled: true,
        easing: "easeinout" as const,
        speed: 800,
      },
    },
    legend: {
      show: true,
      labels: {
        colors: "#e5e7eb",
        fontSize: "14px",
        fontWeight: "500",
      },
      itemMargin: {
        horizontal: 15,
        vertical: 5,
      },
    },
    dataLabels: { enabled: false },
    fill: {
      opacity: 0.8,
      gradient: {
        enabled: true,
        shade: "dark",
        type: "vertical",
        shadeIntensity: 0.5,
        gradientToColors: undefined,
        inverseColors: false,
        opacityFrom: 0.8,
        opacityTo: 0.6,
        stops: [0, 100],
      },
    },
    plotOptions: {
      bubble: {
        minBubbleRadius: 6,
        maxBubbleRadius: 25,
        zScaling: true,
      },
    },
    tooltip: {
      custom: function ({
        seriesIndex,
        dataPointIndex,
      }: {
        seriesIndex: number;
        dataPointIndex: number;
      }) {
        const point = bubbleSeries[seriesIndex].data[dataPointIndex];
        if (!point)
          return '<div style="padding:12px; color:#fff; font-family: Inter, system-ui, sans-serif;">No data available</div>';

        const memoryPretty = prettyBytes(point.y * MiBFactor);
        const diskPretty = prettyBytes(point.z * MiBFactor);
        const statusColor =
          StatusColor[point.daemonStatus as keyof typeof StatusColor] ||
          StatusColor.UNKNOWN;

        return `
              <div style="padding:12px; color:#fff; font-family: Inter, system-ui, sans-serif; background: rgba(0,0,0,0.8); border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                <div style="font-weight: 600; font-size: 16px; margin-bottom: 8px; color: #f3f4f6;">${point.name}</div>
                <div style="margin-bottom: 4px;"><span style="color: #9ca3af;">Status:</span> <span style="color: ${statusColor}; font-weight: 500;">${point.daemonStatus}</span></div>
                <div style="margin-bottom: 4px;"><span style="color: #9ca3af;">CPU:</span> <span style="color: #f3f4f6; font-weight: 500;">${point.x?.toFixed(2)}%</span></div>
                <div style="margin-bottom: 4px;"><span style="color: #9ca3af;">Memory:</span> <span style="color: #f3f4f6; font-weight: 500;">${memoryPretty}</span></div>
                <div><span style="color: #9ca3af;">Disk:</span> <span style="color: #f3f4f6; font-weight: 500;">${diskPretty}</span></div>
              </div>
            `;
      },
    },
    xaxis: {
      min: -5,
      max: dynamicXMax,
      tickAmount: 5,
      title: {
        text: "CPU Usage (%)",
        style: {
          color: "#e5e7eb",
          fontSize: "14px",
          fontWeight: "600",
        },
        offsetY: -10,
      },
      labels: {
        style: {
          colors: "#9ca3af",
          fontSize: "12px",
          fontWeight: "500",
        },
        formatter: (val: string) => val + "%",
      },
      axisBorder: {
        show: true,
        color: "#374151",
      },
      axisTicks: {
        show: true,
        color: "#374151",
      },
    },
    yaxis: {
      min: 0,
      max: dynamicYMax,
      tickAmount: 5,
      title: {
        text: "Memory Usage (MB)",
        style: {
          color: "#e5e7eb",
          fontSize: "14px",
          fontWeight: "600",
        },
      },
      labels: {
        style: {
          colors: "#9ca3af",
          fontSize: "12px",
          fontWeight: "500",
        },
        formatter: (val: number) => val?.toFixed(0) + " MB",
      },
      axisBorder: {
        show: true,
        color: "#374151",
      },
      axisTicks: {
        show: true,
        color: "#374151",
      },
    },
    theme: { mode: "dark" as const },
    grid: {
      show: true,
      borderColor: "#374151",
      strokeDashArray: 3,
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-2xl w-full h-full flex flex-col hover:bg-white/10 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Cpu className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Edge Nodes</h1>
            <p className="text-gray-400 text-sm">
              Edge node monitoring and status
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white">
            {agentArray.length}
          </div>
          <div className="text-sm text-gray-400">Total Agents</div>
        </div>
      </div>

      {/* Status Summary */}
      <div
        className={`grid gap-3 sm:gap-4 mb-4 sm:mb-6 ${daemonStatusLabels.length <= 2 ? "grid-cols-2" : "grid-cols-3"}`}
      >
        {daemonStatusLabels.map((status, index) => {
          const count = statusGroups[status].length;
          const color =
            StatusColor[status as keyof typeof StatusColor] ||
            StatusColor.UNKNOWN;
          return (
            <div
              key={status}
              className="border rounded-lg p-3 sm:p-4"
              style={{
                backgroundColor: `${color}20`,
                borderColor: `${color}30`,
              }}
            >
              <div
                className="text-xl sm:text-2xl font-bold"
                style={{ color: color }}
              >
                {count}
              </div>
              <div className="text-xs sm:text-sm" style={{ color: color }}>
                {status}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2 3xl:grid-cols-2 gap-6 sm:gap-8 xl:gap-10 2xl:gap-12 w-full flex-1">
        <div className="w-full">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-white text-base sm:text-lg xl:text-xl 2xl:text-2xl font-semibold">
              Edge Nodes Status Distribution
            </h2>
            <div className="text-xs sm:text-sm text-gray-400">Real-time</div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 sm:p-4 border border-gray-700/50">
            <ApexCharts
              options={daemonStatusChartOptions}
              series={daemonStatusChartSeries}
              type="donut"
              height={
                window.innerWidth >= 1920
                  ? 350
                  : window.innerWidth >= 1536
                    ? 300
                    : 250
              }
              width="100%"
            />
          </div>
        </div>

        <div className="w-full">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-white text-base sm:text-lg xl:text-xl 2xl:text-2xl font-semibold">
              Resource Utilization
            </h2>
            <div className="text-xs sm:text-sm text-gray-400">
              CPU vs Memory
            </div>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 sm:p-4 border border-gray-700/50">
            <ApexCharts
              options={bubbleChartOptions}
              series={bubbleSeries}
              type="bubble"
              height={
                window.innerWidth >= 1920
                  ? 350
                  : window.innerWidth >= 1536
                    ? 300
                    : 250
              }
              width="100%"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
