import ResourceLink from "@/components/ui/ResourceLink";

function na() {
  return <span className="text-gray-400">N/A</span>;
}

function isSet(value: unknown): boolean {
  if (value === undefined || value === null || value === "") {
    return false;
  }
  if (Array.isArray(value) && value.length === 0) {
    return false;
  }
  return true;
}

function formatScalar(value: unknown) {
  if (!isSet(value) && value !== false && value !== 0) {
    return na();
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

function asList(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    return [value];
  }
  return [];
}

function formatList(value: unknown) {
  const items = asList(value);
  if (items.length === 0) {
    return na();
  }
  return items.map(String).join(" ");
}

export function resolveCommands(row: any): unknown[] {
  const commands = asList(row?.commands);
  if (commands.length > 0) {
    return commands;
  }
  return asList(row?.cmd);
}

export function importantContainerSpecFields() {
  return [
    {
      label: "Container",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "Runtime",
      render: (row: any) => {
        if (!isSet(row?.runtime)) {
          return na();
        }
        return (
          <ResourceLink
            path="/config/RuntimeClasses"
            query={{ runtimeClassName: row.runtime }}
          >
            {row.runtime}
          </ResourceLink>
        );
      },
    },
    {
      label: "Commands",
      render: (row: any) => formatList(resolveCommands(row)),
    },
    {
      label: "Entrypoint",
      render: (row: any) => formatList(row?.entrypoint),
    },
    {
      label: "Working Dir",
      render: (row: any) => formatScalar(row?.workingDir),
    },
    {
      label: "Run As User",
      render: (row: any) => formatScalar(row?.runAsUser),
    },
    {
      label: "Run As Group",
      render: (row: any) => formatScalar(row?.runAsGroup),
    },
    {
      label: "Read Only Root Filesystem",
      render: (row: any) => formatScalar(row?.readOnlyRootFilesystem),
    },
    {
      label: "CPUs",
      render: (row: any) => formatScalar(row?.cpus),
    },
    {
      label: "Memory Limit",
      render: (row: any) => formatScalar(row?.memoryLimit),
    },
    {
      label: "Memory Reservation",
      render: (row: any) => formatScalar(row?.memoryReservation),
    },
    {
      label: "Memory Swap",
      render: (row: any) => formatScalar(row?.memorySwap),
    },
    {
      label: "SHM Size",
      render: (row: any) => formatScalar(row?.shmSize),
    },
    {
      label: "CDI Devices",
      render: (row: any) => {
        const devices = asList(row?.cdiDevices).map(String);
        if (devices.length === 0) {
          return na();
        }
        return (
          <div className="flex flex-wrap gap-1">
            {devices.map((device) => (
              <span
                key={device}
                className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded"
              >
                {device}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      label: "Host Network Mode",
      render: (row: any) => formatScalar(row?.hostNetworkMode),
    },
    {
      label: "Privileged",
      render: (row: any) => formatScalar(row?.isPrivileged),
    },
    {
      label: "Platform",
      render: (row: any) => formatScalar(row?.platform),
    },
  ];
}
