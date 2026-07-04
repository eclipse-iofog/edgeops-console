/** Per-request timeout for Controller API and auth fetch calls. */
export const REQUEST_TIMEOUT_MS = 60_000;

/** Timeout for lightweight health probes while the Controller is marked unreachable. */
export const HEALTH_CHECK_TIMEOUT_MS = 10_000;

/** Interval between health probes while paused. */
export const HEALTH_CHECK_INTERVAL_MS = 5_000;
