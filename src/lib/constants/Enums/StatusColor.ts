export enum StatusType {
  // Agent status
  UNKNOWN = "UNKNOWN",
  RUNNING = "RUNNING",
  STOPPED = "STOPPED",
  WAITING = "WAITING",
  WARNING = "WARNING",
  DEPROVISIONED = "DEPROVISIONED",
  ERROR = "ERROR",
  NOT_PROVISIONED = "NOT_PROVISIONED",
  OFFLINE = "OFFLINE",

  // Microservice status
  STARTED = "STARTED",
  PULLING = "PULLING",
  QUEUED = "QUEUED",
  STARTING = "STARTING",
  STOPPING = "STOPPING",

  // Exec status
  NORMAL = "NORMAL",
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  PENDING = "PENDING",

  // Security Status
  OK = "OK",
  NOT_OK = "NOT_OK",
}

export const StatusColor: Record<StatusType, string> = {
  // Agent statuses
  [StatusType.UNKNOWN]: "#9CA3AF",
  [StatusType.RUNNING]: "#16A34A",
  [StatusType.STOPPED]: "#EF4444",
  [StatusType.WAITING]: "#FBBF24",
  [StatusType.WARNING]: "#F59E0B",
  [StatusType.DEPROVISIONED]: "#6B7280",
  [StatusType.ERROR]: "#DC2626",
  [StatusType.NOT_PROVISIONED]: "#3B82F6",
  [StatusType.OFFLINE]: "#7A3BFF",

  // Microservice statuses
  [StatusType.STARTED]: "#16A34A",
  [StatusType.PULLING]: "#16A34A",
  [StatusType.QUEUED]: "#16A34A",
  [StatusType.STARTING]: "#16A34A",
  [StatusType.STOPPING]: "#7A3BFF",

  // Exec statuses
  [StatusType.NORMAL]: "#16A34A",
  [StatusType.ACTIVE]: "#16A34A",
  [StatusType.INACTIVE]: "#EF4444",
  [StatusType.PENDING]: "#FBBF24",

  // Security statuses
  [StatusType.OK]: "#16A34A",
  [StatusType.NOT_OK]: "#EF4444",
};
