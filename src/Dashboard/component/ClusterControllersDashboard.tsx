import React from "react";
import { formatDistanceToNow } from "date-fns";
import { Server } from "lucide-react";
import {
  getControllerDisplayStatus,
  type ClusterController,
} from "@/lib/clusterControllerStatus";

interface ClusterControllersDashboardProps {
  controllers: ClusterController[];
}

const STATUS_STYLES = {
  active: {
    label: "Active",
    className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  standby: {
    label: "Standby",
    className: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  },
  stale: {
    label: "Stale",
    className: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
} as const;

function formatHeartbeat(lastHeartbeat: string | null): string {
  if (!lastHeartbeat) {
    return "Never";
  }

  const date = new Date(lastHeartbeat);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return formatDistanceToNow(date, { addSuffix: true });
}

const ClusterControllersDashboard: React.FC<ClusterControllersDashboardProps> = ({
  controllers,
}) => {
  const activeCount = controllers.filter((controller) => controller.isActive)
    .length;

  if (controllers.length === 0) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-2xl w-full h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg flex items-center justify-center">
              <Server className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Cluster Controllers
            </h1>
          </div>
        </div>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <Server
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              strokeWidth={1.5}
            />
            <p className="text-gray-400 text-lg mb-2">
              No cluster controllers registered
            </p>
            <p className="text-gray-500 text-sm">
              No controller instances are currently registered in the cluster
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-2xl w-full h-full flex flex-col hover:bg-white/10 transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg flex items-center justify-center">
            <Server className="w-6 h-6 text-white" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold text-white">
            Cluster Controllers
          </h1>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-white">
            {controllers.length}
          </div>
          <div className="text-sm text-gray-400">
            {activeCount} active
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700/50 text-left text-gray-400">
              <th className="py-3 pr-4 font-medium">Host</th>
              <th className="py-3 pr-4 font-medium">Status</th>
              <th className="py-3 font-medium">Last Heartbeat</th>
            </tr>
          </thead>
          <tbody>
            {controllers.map((controller) => {
              const status = getControllerDisplayStatus(controller);
              const statusStyle = STATUS_STYLES[status];

              return (
                <tr
                  key={controller.uuid}
                  className="border-b border-gray-700/30 last:border-b-0"
                >
                  <td className="py-3 pr-4 text-white">
                    {controller.host || "—"}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyle.className}`}
                    >
                      {statusStyle.label}
                    </span>
                  </td>
                  <td className="py-3 text-gray-300">
                    {formatHeartbeat(controller.lastHeartbeat)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ClusterControllersDashboard;
