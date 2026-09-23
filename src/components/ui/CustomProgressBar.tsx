import {
  agentDiskUsageToBytes,
  MiBFactor,
  prettyBytes,
} from "@/lib/formatting";

const CustomProgressBar = ({
  value,
  max = 100,
  unit,
}: {
  value: number;
  max?: number;
  unit?: string;
}) => {
  let percent = 0;
  let displayValue = "";

  if (unit === "agent") {
    percent = Math.min(value / (max / 100), 100);
    displayValue = `${prettyBytes(Number((value * MiBFactor)?.toFixed(2)))} / ${prettyBytes(max)}`;
  } else if (unit === "agent-disk") {
    percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    displayValue = `${prettyBytes(agentDiskUsageToBytes(value))} / ${prettyBytes(agentDiskUsageToBytes(max))}`;
  } else if (unit === "%") {
    percent = Math.min(value / (max / 100), 100);
    displayValue = `${value?.toFixed(2)} % / ${max} %`;
  } else if (unit === "microservice") {
    percent = Math.min(value / (max / 100), 100);
    displayValue = `${prettyBytes(value || 0)} / ${prettyBytes(max)}`;
  } else if (unit === "host-percent") {
    const pct = Math.max(Number(value) || 0, 0);
    percent = Math.min(pct, 100);
    displayValue = `${pct.toFixed(1)}%`;
  } else if (unit === "bytes-used-total") {
    const total = Number(max) || 0;
    const used = Math.max(Number(value) || 0, 0);
    percent = total > 0 ? Math.min((used / total) * 100, 100) : 0;
    displayValue = `${prettyBytes(used)} / ${prettyBytes(total)}`;
  } else if (unit === "microservice-cpu") {
    const maxUnits = Number(max) || 0;
    const usedUnits = Math.max(Number(value) || 0, 0);
    percent =
      maxUnits > 0 ? Math.min((usedUnits / maxUnits) * 100, 100) : 0;
    displayValue = `${(usedUnits / 100).toFixed(2)} / ${(maxUnits / 100).toFixed(2)} cores`;
  } else if (unit === "microservice-memory") {
    const limitBytes = Number(max) || 0;
    const usedBytes = Math.max(Number(value) || 0, 0);
    percent =
      limitBytes > 0 ? Math.min((usedBytes / limitBytes) * 100, 100) : 0;
    displayValue = `${prettyBytes(usedBytes)} / ${prettyBytes(limitBytes)}`;
  } else {
    percent = Math.min(value / (max / 100), 100);
  }

  let color = "bg-green-500";
  if (percent > 90) color = "bg-red-500";
  else if (percent > 70) color = "bg-yellow-400";

  return (
    <div className="flex items-center w-full space-x-2 overflow-hidden min-w-0">
      <div className="text-xs text-gray-300 truncate min-w-[100px] max-w-[50%]">
        {displayValue}
      </div>
      <div className="flex-1 h-1.5 bg-gray-700 rounded overflow-hidden min-w-0">
        <div
          className={`${color} h-1.5 transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default CustomProgressBar;
