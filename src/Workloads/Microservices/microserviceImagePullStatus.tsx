import { StatusColor, StatusType } from "@/lib/constants/Enums/StatusColor";

export function isImagePullFailed(status: unknown): boolean {
  if (!status || typeof status !== "object") return false;
  return (status as { imagePullStatus?: unknown }).imagePullStatus === "failed";
}

export function microserviceStatusColor(
  status: { status?: string; imagePullStatus?: unknown } | null | undefined,
): string {
  const phase = status?.status ?? "";
  if (phase.toUpperCase() === "RUNNING" && isImagePullFailed(status)) {
    return StatusColor.WARNING;
  }
  return StatusColor[phase as StatusType] ?? "#9CA3AF";
}

export function microserviceImagePullSlideoverFields(
  row: {
    status?: unknown;
  } | null,
) {
  if (!isImagePullFailed(row?.status)) return [];
  return [
    {
      label: "Image Pull Status",
      render: (data: { status?: unknown }) =>
        isImagePullFailed(data?.status) ? (
          <span className="text-amber-300">failed</span>
        ) : null,
    },
  ];
}
