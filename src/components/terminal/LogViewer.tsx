import React, { useEffect, useRef, useState, useMemo } from "react";
import * as msgpack from "@msgpack/msgpack";
import { Download as DownloadIcon } from "lucide-react";

type LogViewerProps = {
  socketUrl: string;
  authToken?: string;
  resourceName: string;
  resourceUuid: string;
  sourceType: "node" | "microservice" | "system-microservice";
  className?: string;
  onClose?: () => void;
  onLogsUpdate?: (logs: string[]) => void;
};

type LogMessage = {
  type: number;
  data?: Uint8Array;
  sessionId?: string;
  message?: string;
  timestamp?: number;
};

const MessageTypeLogLine = 6;
const MessageTypeLogStart = 7;
const MessageTypeLogStop = 8;
const MessageTypeLogError = 9;

const LogViewer: React.FC<LogViewerProps> = ({
  socketUrl,
  authToken,
  resourceName,
  resourceUuid,
  sourceType,
  className,
  onClose,
  onLogsUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("connecting");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const isInitializedRef = useRef<boolean>(false);

  useEffect(() => {
    if (isInitializedRef.current) {
      return;
    }

    isInitializedRef.current = true;
    setLogs([]);

    // Properly append auth token to existing query parameters
    let wsUrl = socketUrl;
    if (authToken) {
      const url = new URL(socketUrl);
      url.searchParams.set("token", authToken);
      wsUrl = url.toString();
    }
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus("connected");
      setErrorMessage("");
    };

    ws.onmessage = (evt) => {
      if (evt.data instanceof ArrayBuffer) {
        try {
          const decoded = msgpack.decode(
            new Uint8Array(evt.data),
          ) as LogMessage;

          switch (decoded.type) {
            case MessageTypeLogStart:
              // Session started
              setLogs([]);
              if (onLogsUpdate) {
                onLogsUpdate([]);
              }
              break;

            case MessageTypeLogLine:
              // Log line received
              if (decoded.data) {
                const logLine = new TextDecoder().decode(decoded.data);
                setLogs((prev) => {
                  const newLogs = [...prev, logLine];
                  if (onLogsUpdate) {
                    onLogsUpdate(newLogs);
                  }
                  return newLogs;
                });

                // Auto-scroll if enabled
                if (autoScroll && containerRef.current) {
                  setTimeout(() => {
                    if (containerRef.current) {
                      containerRef.current.scrollTop =
                        containerRef.current.scrollHeight;
                    }
                  }, 0);
                }
              }
              break;

            case MessageTypeLogStop:
              // Log streaming stopped
              setConnectionStatus("disconnected");
              break;

            case MessageTypeLogError:
              // Error occurred
              const errorMsg = decoded.message || "Unknown error";
              setErrorMessage(errorMsg);
              setConnectionStatus("error");
              break;

            default:
              console.warn("Unknown log message type:", decoded.type);
          }
        } catch (error) {
          console.error("Failed to decode log message:", error);
          setErrorMessage("Failed to decode log message");
          setConnectionStatus("error");
        }
      } else if (typeof evt.data === "string") {
        // Handle text messages (fallback)
        setLogs((prev) => {
          const newLogs = [...prev, evt.data as string];
          if (onLogsUpdate) {
            onLogsUpdate(newLogs);
          }
          return newLogs;
        });
      }
    };

    ws.onclose = (evt) => {
      if (evt.code === 1000) {
        setConnectionStatus("disconnected");
      } else {
        setConnectionStatus("error");
        setErrorMessage(
          evt.reason || `Connection closed with code ${evt.code}`,
        );
      }
    };

    ws.onerror = (evt: any) => {
      setConnectionStatus("error");
      setErrorMessage(evt.message || "WebSocket connection error");
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      isInitializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketUrl, authToken]);

  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setAutoScroll(isAtBottom);
    }
  };

  // Filter and search logs
  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs;

    try {
      const flags = caseSensitive ? "g" : "gi";
      const pattern = useRegex
        ? searchQuery
        : searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(pattern, flags);

      return logs.filter((log) => regex.test(log));
    } catch (e) {
      // Invalid regex, return all logs
      return logs;
    }
  }, [logs, searchQuery, caseSensitive, useRegex]);

  // Find all matches in filtered logs
  const matches = useMemo(() => {
    if (!searchQuery) return [];

    const matchIndices: number[] = [];
    try {
      const flags = caseSensitive ? "g" : "gi";
      const pattern = useRegex
        ? searchQuery
        : searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(pattern, flags);

      filteredLogs.forEach((log, index) => {
        if (regex.test(log)) {
          matchIndices.push(index);
        }
      });
    } catch (e) {
      // Invalid regex
    }
    return matchIndices;
  }, [filteredLogs, searchQuery, caseSensitive, useRegex]);

  const navigateMatch = (direction: "next" | "prev") => {
    if (matches.length === 0) return;

    if (direction === "next") {
      const nextIndex =
        currentMatchIndex < matches.length - 1 ? currentMatchIndex + 1 : 0;
      setCurrentMatchIndex(nextIndex);
    } else {
      const prevIndex =
        currentMatchIndex > 0 ? currentMatchIndex - 1 : matches.length - 1;
      setCurrentMatchIndex(prevIndex);
    }
  };

  useEffect(() => {
    if (
      currentMatchIndex >= 0 &&
      currentMatchIndex < matches.length &&
      containerRef.current &&
      searchQuery
    ) {
      // Scroll to the highlighted match
      const matchLineIndex = matches[currentMatchIndex];
      if (matchLineIndex >= 0 && matchLineIndex < filteredLogs.length) {
        // Find the element and scroll to it
        const logElements =
          containerRef.current.querySelectorAll("[data-log-index]");
        if (logElements[matchLineIndex]) {
          logElements[matchLineIndex].scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }
    }
  }, [currentMatchIndex, matches, filteredLogs.length, searchQuery]);

  const handleDownload = () => {
    const contentToDownload = searchQuery ? filteredLogs : logs;
    const content = contentToDownload.join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${resourceName}-${new Date().toISOString().slice(0, 10)}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSourceTypeLabel = () => {
    switch (sourceType) {
      case "node":
        return "Node";
      case "microservice":
        return "Microservice";
      case "system-microservice":
        return "System Microservice";
      default:
        return "Resource";
    }
  };

  return (
    <div
      className={className}
      style={{
        height: "100%",
        width: "100%",
        background: "#0d1117",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #30363d",
          background: "#161b22",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ color: "#f0f6fc", fontSize: "14px" }}>
            <span style={{ color: "#8b949e" }}>
              Displaying logs from {getSourceTypeLabel()}:{" "}
            </span>
            <span style={{ color: "#58a6ff" }}>{resourceName}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Connection Status */}
            <div
              style={{
                fontSize: "12px",
                color:
                  connectionStatus === "connected"
                    ? "#7ee787"
                    : connectionStatus === "connecting"
                      ? "#f2cc60"
                      : "#ff7b72",
              }}
            >
              {connectionStatus === "connected" && "● Connected"}
              {connectionStatus === "connecting" && "● Connecting..."}
              {connectionStatus === "disconnected" && "● Disconnected"}
              {connectionStatus === "error" && "● Error"}
            </div>
            {errorMessage && (
              <div style={{ fontSize: "12px", color: "#ff7b72" }}>
                {errorMessage}
              </div>
            )}
            <button
              onClick={handleDownload}
              style={{
                padding: "4px 8px",
                background: "#21262d",
                border: "1px solid #30363d",
                borderRadius: "4px",
                color: "#f0f6fc",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Download logs"
            >
              <DownloadIcon style={{ fontSize: "16px" }} />
              <span style={{ fontSize: "12px" }}>Download</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "#0d1117",
            padding: "6px 8px",
            borderRadius: "4px",
            border: "1px solid #30363d",
          }}
        >
          <input
            type="text"
            placeholder="Search in logs"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentMatchIndex(-1);
            }}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "#f0f6fc",
              fontSize: "13px",
              outline: "none",
            }}
          />
          <button
            onClick={() => setCaseSensitive(!caseSensitive)}
            style={{
              padding: "4px 8px",
              background: caseSensitive ? "#58a6ff" : "transparent",
              border: "1px solid #30363d",
              borderRadius: "4px",
              color: "#f0f6fc",
              cursor: "pointer",
              fontSize: "11px",
            }}
            title="Case sensitive"
          >
            Aa
          </button>
          <button
            onClick={() => setUseRegex(!useRegex)}
            style={{
              padding: "4px 8px",
              background: useRegex ? "#58a6ff" : "transparent",
              border: "1px solid #30363d",
              borderRadius: "4px",
              color: "#f0f6fc",
              cursor: "pointer",
              fontSize: "11px",
            }}
            title="Use regex"
          >
            .*
          </button>
          {searchQuery && matches.length > 0 && (
            <>
              <span style={{ color: "#8b949e", fontSize: "12px" }}>
                {currentMatchIndex + 1}/{matches.length}
              </span>
              <button
                onClick={() => navigateMatch("prev")}
                style={{
                  padding: "4px",
                  background: "transparent",
                  border: "1px solid #30363d",
                  borderRadius: "4px",
                  color: "#f0f6fc",
                  cursor: "pointer",
                }}
                title="Previous match"
              >
                ↑
              </button>
              <button
                onClick={() => navigateMatch("next")}
                style={{
                  padding: "4px",
                  background: "transparent",
                  border: "1px solid #30363d",
                  borderRadius: "4px",
                  color: "#f0f6fc",
                  cursor: "pointer",
                }}
                title="Next match"
              >
                ↓
              </button>
            </>
          )}
        </div>
      </div>

      {/* Logs Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          fontFamily:
            '"Fira Code", "JetBrains Mono", "Cascadia Code", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Source Code Pro", monospace',
          fontSize: "14px",
          lineHeight: "1.5",
          color: "#f0f6fc",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {logs.length === 0 && connectionStatus === "connected" && (
          <div style={{ color: "#8b949e", fontStyle: "italic" }}>
            Waiting for logs...
          </div>
        )}
        {logs.length === 0 && connectionStatus === "connecting" && (
          <div style={{ color: "#8b949e", fontStyle: "italic" }}>
            Connecting to log stream...
          </div>
        )}
        {searchQuery
          ? filteredLogs.map((log, index) => {
              const isHighlighted =
                currentMatchIndex >= 0 && matches[currentMatchIndex] === index;
              // Highlight search matches in the log line
              let highlightedLog: React.ReactNode = log;
              if (searchQuery) {
                try {
                  const flags = caseSensitive ? "g" : "gi";
                  const pattern = useRegex
                    ? searchQuery
                    : searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                  const regex = new RegExp(`(${pattern})`, flags);
                  const parts = log.split(regex);
                  highlightedLog = (
                    <>
                      {parts.map((part, partIndex) =>
                        regex.test(part) ? (
                          <span
                            key={partIndex}
                            style={{ background: "#f2cc60", color: "#0d1117" }}
                          >
                            {part}
                          </span>
                        ) : (
                          <React.Fragment key={partIndex}>
                            {part}
                          </React.Fragment>
                        ),
                      )}
                    </>
                  );
                } catch (e) {
                  // Invalid regex, show as-is
                  highlightedLog = log;
                }
              }
              return (
                <div
                  key={`filtered-${index}`}
                  data-log-index={index}
                  style={{
                    marginBottom: "2px",
                    background: isHighlighted ? "#264f78" : "transparent",
                    padding: isHighlighted ? "2px 4px" : "0",
                  }}
                >
                  {highlightedLog}
                </div>
              );
            })
          : logs.map((log, index) => (
              <div key={index} style={{ marginBottom: "2px" }}>
                {log}
              </div>
            ))}
      </div>
    </div>
  );
};

export default React.memo(LogViewer, (prevProps, nextProps) => {
  return (
    prevProps.socketUrl === nextProps.socketUrl &&
    prevProps.authToken === nextProps.authToken &&
    prevProps.resourceUuid === nextProps.resourceUuid &&
    prevProps.className === nextProps.className
  );
});
