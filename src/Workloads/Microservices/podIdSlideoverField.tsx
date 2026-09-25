export function hasPodId(row: any): boolean {
  const podId = row?.status?.podId;
  return podId != null && String(podId).trim() !== "";
}

export function podIdSlideoverFields(row: any) {
  if (!hasPodId(row)) {
    return [];
  }

  return [
    {
      label: "Pod Id",
      render: (data: any) => (
        <span
          className="font-semibold truncate"
          title={data.status.podId}
        >
          {data.status.podId}
        </span>
      ),
    },
  ];
}
