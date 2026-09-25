import {
  formatLastErrorAt,
  readMicroserviceCrashStatus,
  shouldShowCurrentError,
  shouldShowLastCrash,
  shouldShowRestartCount,
} from "./microserviceCrashStatus";

function crashText(value: string) {
  return (
    <span className="text-white whitespace-pre-wrap break-words" title={value}>
      {value}
    </span>
  );
}

export function microserviceCrashSlideoverFields(row: any) {
  const crash = readMicroserviceCrashStatus(row?.status);
  const fields: Array<{
    label: string;
    render: (data: any) => any;
  }> = [];

  if (shouldShowCurrentError(crash)) {
    fields.push({
      label: "Current Error",
      render: (data: any) => {
        const current = readMicroserviceCrashStatus(data?.status);
        return (
          <span className="text-red-300 whitespace-pre-wrap break-words">
            {current.errorMessage}
          </span>
        );
      },
    });
  }

  if (shouldShowLastCrash(crash)) {
    fields.push({
      label: "Last Crash",
      render: (data: any) => {
        const current = readMicroserviceCrashStatus(data?.status);
        return crashText(current.lastError);
      },
    });
    const lastErrorAt = formatLastErrorAt(crash.lastErrorAt);
    if (lastErrorAt) {
      fields.push({
        label: "Last Crash At",
        render: (data: any) => {
          const current = readMicroserviceCrashStatus(data?.status);
          return formatLastErrorAt(current.lastErrorAt) || "N/A";
        },
      });
    }
  }

  if (shouldShowRestartCount(crash)) {
    fields.push({
      label: "Restarts",
      render: (data: any) => {
        const current = readMicroserviceCrashStatus(data?.status);
        return String(current.restartCount);
      },
    });
  }

  return fields;
}
