import React, { useEffect, useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { RefreshCw as RefreshIcon, Download as GetAppIcon } from "lucide-react";
import { ControllerContext } from "@/app/providers";
import { FeedbackContext } from "@/app/providers";
import SlideOver from "@/components/ui/SlideOver";
import CustomLoadingModal from "@/components/ui/CustomLoadingModal";
import { formatDistanceToNow, format } from "date-fns";

type AuditEvent = {
  id?: number;
  timestamp: number;
  eventType: string;
  endpointType: string;
  actorId: string | null;
  method: string | null;
  resourceType: string | null;
  resourceId: string | null;
  endpointPath: string;
  ipAddress: string | null;
  status: string;
  statusCode: number | null;
  statusMessage: string | null;
  requestId: string | null;
};

type EventFilters = {
  eventType?: string;
  endpointType?: string;
  status?: string;
  resourceType?: string;
  method?: string;
  actorId?: string;
  limit?: number;
  offset?: number;
  startTime?: number;
  endTime?: number;
};

function Events() {
  const [fetching, setFetching] = React.useState(true);
  const [events, setEvents] = React.useState<AuditEvent[]>([]);
  const { request } = React.useContext(ControllerContext);
  const { pushFeedback } = React.useContext(FeedbackContext);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [filters, setFilters] = useState<EventFilters>({
    limit: 50,
    offset: 0,
  });
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  // Local state for filter inputs (not applied until Filter button is clicked)
  const [filterInputs, setFilterInputs] = useState<EventFilters>({
    limit: 50,
    offset: 0,
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteDays, setDeleteDays] = useState<number>(30);
  const [pageInput, setPageInput] = useState("");
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleRowClick = (row: AuditEvent) => {
    setSelectedEvent(row);
    setIsOpen(true);
  };

  const buildQueryString = (filters: EventFilters): string => {
    const params = new URLSearchParams();

    if (filters.limit) params.append("limit", filters.limit.toString());
    if (filters.offset) params.append("offset", filters.offset.toString());
    if (filters.eventType) params.append("eventType", filters.eventType);
    if (filters.endpointType)
      params.append("endpointType", filters.endpointType);
    if (filters.status) params.append("status", filters.status);
    if (filters.resourceType)
      params.append("resourceType", filters.resourceType);
    if (filters.method) params.append("method", filters.method);
    if (filters.actorId) params.append("actorId", filters.actorId);
    if (filters.startTime)
      params.append("startTime", filters.startTime.toString());
    if (filters.endTime) params.append("endTime", filters.endTime.toString());

    return params.toString();
  };

  async function fetchEvents() {
    try {
      setFetching(true);
      const queryString = buildQueryString(filters);
      const url = `/api/v3/events${queryString ? `?${queryString}` : ""}`;
      const eventsResponse = await request(url);

      if (!eventsResponse.ok) {
        pushFeedback({
          message: eventsResponse.message || "Failed to fetch events",
          type: "error",
        });
        setFetching(false);
        return;
      }

      const responseData = await eventsResponse.json();
      const eventsList = responseData.events || responseData || [];
      setEvents(Array.isArray(eventsList) ? eventsList : []);

      // Try to get total count from response if available
      if (responseData.total !== undefined) {
        setTotalCount(responseData.total);
      } else if (responseData.count !== undefined) {
        setTotalCount(responseData.count);
      } else {
        // If no total provided, estimate based on current results
        setTotalCount(eventsList.length);
      }

      setFetching(false);
    } catch (e: any) {
      pushFeedback({
        message: e.message || "Error fetching events",
        type: "error",
      });
      setFetching(false);
    }
  }

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterInputChange = (
    key: keyof EventFilters,
    value: string | number | undefined,
  ) => {
    setFilterInputs((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const applyFilters = () => {
    setFilters({
      ...filterInputs,
      offset: 0, // Reset to first page when applying filters
    });
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    const currentLimit = filters.limit || 50;
    const newOffset = (newPage - 1) * currentLimit;
    setFilters((prev) => ({
      ...prev,
      offset: newOffset,
    }));
    setCurrentPage(newPage);
    setPageInput(""); // Clear input after navigation
  };

  const handlePageInputChange = (value: string) => {
    setPageInput(value);
  };

  const handlePageInputSubmit = () => {
    const pageNum = parseInt(pageInput);
    if (pageNum && pageNum >= 1 && pageNum <= totalPages) {
      handlePageChange(pageNum);
    } else {
      pushFeedback({
        message: `Please enter a valid page number between 1 and ${totalPages}`,
        type: "error",
      });
      setPageInput("");
    }
  };

  const handlePageInputKeyPress = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Enter") {
      handlePageInputSubmit();
    }
  };

  const clearFilters = () => {
    const clearedFilters = {
      limit: 50,
      offset: 0,
    };
    setFilterInputs(clearedFilters);
    setFilters(clearedFilters);
    setCurrentPage(1);
  };

  const handleDeleteEvents = async () => {
    try {
      // Validate deleteDays
      if (isNaN(deleteDays) || deleteDays < 0 || deleteDays > 365) {
        pushFeedback({
          message: "Days must be a number between 0 and 365",
          type: "error",
        });
        return;
      }

      const res = await request("/api/v3/events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: deleteDays }),
      });

      if (!res.ok) {
        pushFeedback({
          message: res.message || "Failed to delete events",
          type: "error",
        });
        return;
      }

      const result = await res.json();

      // Handle success message based on deletedAll flag
      let successMessage: string;
      if (result.deletedAll || deleteDays === 0) {
        successMessage = `Successfully deleted all ${result.deletedCount} events`;
      } else {
        successMessage = `Successfully deleted ${result.deletedCount} events older than ${deleteDays} days`;
      }

      pushFeedback({
        message: successMessage,
        type: "success",
      });
      setShowDeleteModal(false);
      // Reset deleteDays to default
      setDeleteDays(30);
      // Refresh events after deletion
      fetchEvents();
    } catch (e: any) {
      pushFeedback({
        message: e.message || "Error deleting events",
        type: "error",
      });
    }
  };

  // Export current page events (respects current filters and limit)
  const getCurrentPageEvents = (): AuditEvent[] => {
    // Use the events already loaded in the current view
    return events;
  };

  const exportToCSV = () => {
    try {
      setExporting(true);

      const eventsToExport = getCurrentPageEvents();

      if (eventsToExport.length === 0) {
        pushFeedback({
          message: "No events to export",
          type: "warning",
        });
        setExporting(false);
        return;
      }

      // CSV Headers
      const headers = [
        "ID",
        "Timestamp",
        "Event Type",
        "Endpoint Type",
        "Method",
        "Endpoint Path",
        "Resource Type",
        "Resource ID",
        "Actor ID",
        "IP Address",
        "Status",
        "Status Code",
        "Status Message",
        "Request ID",
      ];

      // Convert events to CSV rows
      const csvRows = [
        headers.join(","),
        ...eventsToExport.map((event) => {
          const row = [
            event.id?.toString() || "",
            event.timestamp ? new Date(event.timestamp).toISOString() : "",
            event.eventType || "",
            event.endpointType || "",
            event.method || "",
            `"${(event.endpointPath || "").replace(/"/g, '""')}"`, // Escape quotes in CSV
            event.resourceType || "",
            event.resourceId || "",
            event.actorId || "",
            event.ipAddress || "",
            event.status || "",
            event.statusCode?.toString() || "",
            `"${(event.statusMessage || "").replace(/"/g, '""')}"`, // Escape quotes
            event.requestId || "",
          ];
          return row.join(",");
        }),
      ];

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `events_export_${format(new Date(), "yyyy-MM-dd_HH-mm-ss")}.csv`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      pushFeedback({
        message: `Successfully exported ${eventsToExport.length} events to CSV (current page)`,
        type: "success",
      });
      setExporting(false);
    } catch (e: any) {
      pushFeedback({
        message: e.message || "Error exporting events to CSV",
        type: "error",
      });
      setExporting(false);
    }
  };

  const exportToJSON = () => {
    try {
      setExporting(true);

      const eventsToExport = getCurrentPageEvents();

      if (eventsToExport.length === 0) {
        pushFeedback({
          message: "No events to export",
          type: "warning",
        });
        setExporting(false);
        return;
      }

      // Create export object with metadata
      const exportData = {
        exportDate: new Date().toISOString(),
        exportedEvents: eventsToExport.length,
        totalMatchingEvents: totalCount,
        currentPage: currentPage,
        pageSize: filters.limit || 50,
        filters: {
          eventType: filters.eventType,
          endpointType: filters.endpointType,
          status: filters.status,
          method: filters.method,
          resourceType: filters.resourceType,
          actorId: filters.actorId,
          startTime: filters.startTime
            ? new Date(filters.startTime).toISOString()
            : undefined,
          endTime: filters.endTime
            ? new Date(filters.endTime).toISOString()
            : undefined,
        },
        events: eventsToExport.map((event) => ({
          id: event.id,
          timestamp: event.timestamp,
          timestampISO: event.timestamp
            ? new Date(event.timestamp).toISOString()
            : null,
          eventType: event.eventType,
          endpointType: event.endpointType,
          actorId: event.actorId,
          method: event.method,
          resourceType: event.resourceType,
          resourceId: event.resourceId,
          endpointPath: event.endpointPath,
          ipAddress: event.ipAddress,
          status: event.status,
          statusCode: event.statusCode,
          statusMessage: event.statusMessage,
          requestId: event.requestId,
        })),
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonContent], {
        type: "application/json;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `events_export_${format(new Date(), "yyyy-MM-dd_HH-mm-ss")}.json`,
      );
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      pushFeedback({
        message: `Successfully exported ${eventsToExport.length} events to JSON (current page)`,
        type: "success",
      });
      setExporting(false);
    } catch (e: any) {
      pushFeedback({
        message: e.message || "Error exporting events to JSON",
        type: "error",
      });
      setExporting(false);
    }
  };

  const formatDateTimeLocal = (timestamp?: number): string => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const parseDateTimeLocal = (value: string): number | undefined => {
    if (!value) return undefined;
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date.getTime();
  };

  const formatTimestamp = (timestamp: number) => {
    if (!timestamp) return "N/A";
    try {
      const date = new Date(timestamp);
      return format(date, "yyyy-MM-dd HH:mm:ss");
    } catch {
      return "N/A";
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    if (!timestamp) return "N/A";
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return "N/A";
    }
  };

  const getStatusBadge = (status: string) => {
    const isSuccess = status === "SUCCESS";
    return (
      <span
        className={`inline-block px-1.5 py-0.5 text-xs rounded ${
          isSuccess ? "bg-green-600 text-white" : "bg-red-600 text-white"
        }`}
      >
        {status}
      </span>
    );
  };

  const formatActionSummary = (event: AuditEvent) => {
    const method = event.method || "";
    const resource = event.resourceType || "";
    const eventType = event.eventType || "";

    // Handle WebSocket events specifically
    if (eventType === "WS_CONNECT") {
      return resource ? `WS CONNECT ${resource}` : "WS CONNECT";
    }
    if (eventType === "WS_DISCONNECT") {
      return resource ? `WS DISCONNECT ${resource}` : "WS DISCONNECT";
    }

    // Extract a readable action description for other events
    if (method && resource) {
      return `${method} ${resource}`;
    }
    if (method) {
      return method;
    }
    if (eventType) {
      return eventType.replace("_", " ");
    }
    return "Action";
  };

  const formatActor = (
    actorId: string | null,
  ): { display: string; full: string; isEmail: boolean } => {
    if (!actorId) return { display: "System", full: "System", isEmail: false };
    // If it looks like an email, return full email
    if (actorId.includes("@")) {
      return { display: actorId, full: actorId, isEmail: true };
    }
    // For UUIDs, return full UUID
    return { display: actorId, full: actorId, isEmail: false };
  };

  const columns = [
    {
      key: "timestamp",
      header: "Time",
      width: "200px",
      render: (row: AuditEvent) => (
        <div>
          <div className="font-medium text-white text-sm">
            {formatRelativeTime(row.timestamp)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {formatTimestamp(row.timestamp)}
          </div>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      width: "400px",
      render: (row: AuditEvent) => (
        <div className="min-w-0">
          <div className="font-medium text-white flex items-center gap-2 flex-wrap">
            <span className="text-blue-400 text-sm">
              {formatActionSummary(row)}
            </span>
            {row.resourceType && (
              <span className="text-xs text-gray-300 bg-gray-700 px-1.5 py-0.5 rounded flex-shrink-0">
                {row.resourceType}
              </span>
            )}
          </div>
          {row.endpointPath && (
            <div
              className="text-xs text-gray-400 mt-1 truncate max-w-full"
              title={row.endpointPath}
              style={{ maxWidth: "380px" }}
            >
              {row.endpointPath}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "actorId",
      header: "Actor",
      width: "380px",
      render: (row: AuditEvent) => {
        const actor = formatActor(row.actorId);
        return (
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`text-white font-medium text-xs ${
                actor.isEmail ? "" : "font-mono"
              } truncate`}
              title={actor.full}
              style={{ maxWidth: "320px" }}
            >
              {actor.display}
            </div>
            {row.endpointType && (
              <span className="text-xs text-gray-400 capitalize whitespace-nowrap flex-shrink-0">
                {row.endpointType}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      width: "140px",
      render: (row: AuditEvent) => (
        <div className="flex items-center gap-2">
          {getStatusBadge(row.status)}
          {row.statusCode && (
            <span className="text-xs text-gray-400">{row.statusCode}</span>
          )}
        </div>
      ),
    },
  ];

  const slideOverFields = [
    {
      label: "Event Details",
      isSectionHeader: true,
      render: () => null,
    },
    {
      label: "ID",
      render: (event: AuditEvent) => event.id?.toString() || "N/A",
    },
    {
      label: "Timestamp",
      render: (event: AuditEvent) => (
        <div>
          <div>{formatTimestamp(event.timestamp)}</div>
          <div className="text-xs text-gray-400 mt-1">
            {formatRelativeTime(event.timestamp)}
          </div>
        </div>
      ),
    },
    {
      label: "Event Type",
      render: (event: AuditEvent) => event.eventType || "N/A",
    },
    {
      label: "Endpoint Type",
      render: (event: AuditEvent) => event.endpointType || "N/A",
    },
    {
      label: "Method",
      render: (event: AuditEvent) => event.method || "N/A",
    },
    {
      label: "Endpoint Path",
      render: (event: AuditEvent) => (
        <div className="break-all">{event.endpointPath || "N/A"}</div>
      ),
    },
    {
      label: "Status",
      render: (event: AuditEvent) => getStatusBadge(event.status),
    },
    {
      label: "Status Code",
      render: (event: AuditEvent) => event.statusCode?.toString() || "N/A",
    },
    {
      label: "Status Message",
      render: (event: AuditEvent) => event.statusMessage || "N/A",
    },
    {
      label: "Resource Information",
      isSectionHeader: true,
      render: () => null,
    },
    {
      label: "Resource Type",
      render: (event: AuditEvent) => event.resourceType || "N/A",
    },
    {
      label: "Resource ID",
      render: (event: AuditEvent) => (
        <div className="break-all">{event.resourceId || "N/A"}</div>
      ),
    },
    {
      label: "Actor Information",
      isSectionHeader: true,
      render: () => null,
    },
    {
      label: "Actor ID",
      render: (event: AuditEvent) => event.actorId || "N/A",
    },
    {
      label: "IP Address",
      render: (event: AuditEvent) => event.ipAddress || "N/A",
    },
    {
      label: "Request Information",
      isSectionHeader: true,
      render: () => null,
    },
    {
      label: "Request ID",
      render: (event: AuditEvent) => (
        <div className="break-all font-mono text-xs">
          {event.requestId || "N/A"}
        </div>
      ),
    },
  ];

  const pageSize = filters.limit || 50;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      {fetching ? (
        <CustomLoadingModal
          open={true}
          message="Fetching Events"
          spinnerSize="lg"
          spinnerColor="text-green-500"
          overlayOpacity={60}
        />
      ) : (
        <>
          <div className="bg-gray-900 text-white overflow-auto p-4">
            <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
              Events
            </h1>

            {/* Filters */}
            <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Event Type
                  </label>
                  <select
                    value={filterInputs.eventType || ""}
                    onChange={(e) => {
                      handleFilterInputChange(
                        "eventType",
                        e.target.value || undefined,
                      );
                      // Apply immediately for dropdowns
                      setFilters((prev) => ({
                        ...prev,
                        eventType: e.target.value || undefined,
                        offset: 0,
                      }));
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="HTTP">HTTP</option>
                    <option value="WS_CONNECT">WebSocket Connect</option>
                    <option value="WS_DISCONNECT">WebSocket Disconnect</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Endpoint Type
                  </label>
                  <select
                    value={filterInputs.endpointType || ""}
                    onChange={(e) => {
                      handleFilterInputChange(
                        "endpointType",
                        e.target.value || undefined,
                      );
                      setFilters((prev) => ({
                        ...prev,
                        endpointType: e.target.value || undefined,
                        offset: 0,
                      }));
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="user">User</option>
                    <option value="agent">Agent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={filterInputs.status || ""}
                    onChange={(e) => {
                      handleFilterInputChange(
                        "status",
                        e.target.value || undefined,
                      );
                      setFilters((prev) => ({
                        ...prev,
                        status: e.target.value || undefined,
                        offset: 0,
                      }));
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="SUCCESS">Success</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Method
                  </label>
                  <select
                    value={filterInputs.method || ""}
                    onChange={(e) => {
                      handleFilterInputChange(
                        "method",
                        e.target.value || undefined,
                      );
                      setFilters((prev) => ({
                        ...prev,
                        method: e.target.value || undefined,
                        offset: 0,
                      }));
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="PATCH">PATCH</option>
                    <option value="DELETE">DELETE</option>
                    <option value="WS">WebSocket</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Limit
                  </label>
                  <select
                    value={filterInputs.limit || 50}
                    onChange={(e) => {
                      const limit = parseInt(e.target.value) || 50;
                      handleFilterInputChange("limit", limit);
                      setFilters((prev) => ({
                        ...prev,
                        limit,
                        offset: 0,
                      }));
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="500">500</option>
                    <option value="1000">1000 (Max)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Resource Type
                  </label>
                  <input
                    type="text"
                    value={filterInputs.resourceType || ""}
                    onChange={(e) =>
                      handleFilterInputChange(
                        "resourceType",
                        e.target.value || undefined,
                      )
                    }
                    placeholder="e.g., microservice, agent"
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Actor ID
                  </label>
                  <input
                    type="text"
                    value={filterInputs.actorId || ""}
                    onChange={(e) =>
                      handleFilterInputChange(
                        "actorId",
                        e.target.value || undefined,
                      )
                    }
                    placeholder="Username or agent UUID"
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formatDateTimeLocal(filterInputs.startTime)}
                    onChange={(e) => {
                      const timestamp = parseDateTimeLocal(e.target.value);
                      handleFilterInputChange("startTime", timestamp);
                    }}
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formatDateTimeLocal(filterInputs.endTime)}
                    onChange={(e) => {
                      const timestamp = parseDateTimeLocal(e.target.value);
                      handleFilterInputChange("endTime", timestamp);
                    }}
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={applyFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 transition font-medium"
                >
                  Filter
                </button>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition"
                >
                  Clear Filters
                </button>
                <button
                  onClick={fetchEvents}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition flex items-center gap-2"
                  title="Refresh events with current filters"
                >
                  <RefreshIcon fontSize="small" />
                  Refresh
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={exporting}
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-500 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Export events"
                  >
                    <GetAppIcon fontSize="small" />
                    Export
                  </button>
                  {showExportMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowExportMenu(false)}
                      />
                      <div className="absolute left-0 mt-1 w-36 bg-gray-800 border border-gray-700 rounded shadow-lg z-20">
                        <button
                          onClick={() => {
                            setShowExportMenu(false);
                            exportToCSV();
                          }}
                          disabled={exporting}
                          className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 rounded-t disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <GetAppIcon fontSize="small" />
                          Export CSV
                        </button>
                        <button
                          onClick={() => {
                            setShowExportMenu(false);
                            exportToJSON();
                          }}
                          disabled={exporting}
                          className="w-full px-3 py-2 text-left text-sm text-white hover:bg-gray-700 rounded-b disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border-t border-gray-700"
                        >
                          <GetAppIcon fontSize="small" />
                          Export JSON
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition"
                >
                  Delete Old Events
                </button>
              </div>
            </div>

            {/* Pagination Info */}
            <div className="mb-4 text-sm text-gray-400">
              Showing {events.length} of {totalCount} events
              {totalPages > 1 && (
                <span className="ml-4">
                  Page {currentPage} of {totalPages}
                </span>
              )}
            </div>

            <div className="w-full overflow-x-auto">
              <table
                className="w-full text-sm text-gray-300"
                style={{ tableLayout: "fixed", minWidth: "100%" }}
              >
                <colgroup>
                  {columns.map((col, index) => (
                    <col
                      key={col.key + index}
                      style={{
                        width: col.width === "auto" ? "auto" : col.width,
                        minWidth: col.width === "auto" ? "300px" : col.width,
                      }}
                    />
                  ))}
                </colgroup>
                <thead className="bg-gray-800 border-b-2 border-gray-700">
                  <tr>
                    {columns.map((col, index) => (
                      <th
                        key={col.key + index}
                        className="px-4 py-2 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider"
                        style={{
                          width: col.width === "auto" ? "auto" : col.width,
                          minWidth: col.width === "auto" ? "300px" : col.width,
                        }}
                      >
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-gray-900 divide-y divide-gray-700">
                  {events && events.length > 0 ? (
                    events.map((row) => {
                      const rowKey =
                        row.id?.toString() ||
                        `${row.timestamp}-${row.requestId}`;
                      return (
                        <tr
                          key={rowKey}
                          className="hover:bg-gray-800/50 transition-colors cursor-pointer border-b border-gray-700/50"
                          onClick={() => handleRowClick(row)}
                        >
                          {columns.map((col, index) => (
                            <td
                              key={col.key + index}
                              className="px-4 py-2 align-middle"
                              style={{
                                width:
                                  col.width === "auto" ? "auto" : col.width,
                                minWidth:
                                  col.width === "auto" ? "300px" : col.width,
                                wordBreak:
                                  col.key === "actorId"
                                    ? "break-word"
                                    : "normal",
                                overflowWrap:
                                  col.key === "actorId"
                                    ? "break-word"
                                    : "normal",
                              }}
                            >
                              {col.render
                                ? col.render(row)
                                : (row as any)[col.key]}
                            </td>
                          ))}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="text-center py-12 text-gray-400"
                      >
                        No events found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex justify-center items-center gap-2 flex-wrap">
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  title="First page"
                >
                  First
                </button>
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-gray-300 text-sm">Page</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={pageInput}
                    onChange={(e) => handlePageInputChange(e.target.value)}
                    onKeyPress={handlePageInputKeyPress}
                    placeholder={currentPage.toString()}
                    className="w-16 px-2 py-1 border border-gray-600 bg-gray-700 text-gray-200 rounded text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-300 text-sm">of {totalPages}</span>
                  <button
                    onClick={handlePageInputSubmit}
                    className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition text-sm"
                    title="Go to page"
                  >
                    Go
                  </button>
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  title="Last page"
                >
                  Last
                </button>
              </div>
            )}
          </div>
        </>
      )}
      <SlideOver
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={`Event Details - ${selectedEvent?.eventType || "Event"}`}
        data={selectedEvent}
        fields={slideOverFields}
        customWidth={600}
      />

      {/* Delete Events Modal */}
      <Transition show={showDeleteModal} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-[110]"
          onClose={() => setShowDeleteModal(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 z-[110]" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4 z-[110]">
            <Dialog.Panel className="w-full max-w-md rounded-lg bg-gray-800 text-white shadow-xl p-6 border border-gray-700">
              <Dialog.Title className="text-lg font-semibold mb-4">
                Delete Events
              </Dialog.Title>
              <div className="mt-2 text-sm text-gray-300 mb-4">
                This will permanently delete events. This action cannot be
                undone.
                <div className="mt-2 text-xs text-yellow-400 font-medium">
                  ⚠️ Enter <strong>0</strong> to delete <strong>ALL</strong>{" "}
                  events, or enter a number (1-365) to delete events older than
                  that many days.
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Days (0 = delete all, 1-365 = delete older than X days)
                </label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={deleteDays}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setDeleteDays(0);
                    } else {
                      const numValue = parseInt(value);
                      if (
                        !isNaN(numValue) &&
                        numValue >= 0 &&
                        numValue <= 365
                      ) {
                        setDeleteDays(numValue);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-600 bg-gray-700 text-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-xs text-gray-400 mt-1">
                  Range: 0 (all events) to 365 days
                </div>
                {deleteDays === 0 && (
                  <div className="text-xs text-red-400 mt-1 font-medium">
                    ⚠️ Warning: This will delete ALL events in the system!
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEvents}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-500 transition"
                >
                  Delete
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}

export default Events;
