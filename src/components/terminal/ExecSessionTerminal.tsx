import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { SearchAddon } from "@xterm/addon-search";
import { Unicode11Addon } from "@xterm/addon-unicode11";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { WebglAddon } from "@xterm/addon-webgl";
import "@xterm/xterm/css/xterm.css";
import * as msgpack from "@msgpack/msgpack";
import { useDebuggerStatus } from "@/hooks/useDebuggerStatus";
import { getWsBaseUrl } from "@/auth/api";
import {
  formatWebSocketClose,
  formatWebSocketErrorString,
  isNormalExecSessionClose,
} from "@/lib/wsSessionErrors";
import {
  isPublishableTerminalSize,
  isSafeTerminalLink,
  isTerminalViewportMeasurable,
  resizeControlPayload,
  takeExecStatusNotice,
  TERMINAL_FONT_FAMILY,
  type TerminalSize,
} from "./terminalSession";

type ExecSessionTerminalProps = {
  socketUrl: string;
  authToken?: string;
  className?: string;
  microserviceUuid?: string;
  execId?: string;
  onClose?: () => void;
  nodeUuid?: string;
  agentName?: string;
  waitingForDebugger?: boolean;
  active?: boolean;
};

type Message = {
  type: number;
  data: Uint8Array;
  microserviceUuid: string;
  execId: string;
  sessionId?: string;
  timestamp: number;
};

const MessageTypeStdin = 0;
const MessageTypeStdout = 1;
const MessageTypeStderr = 2;
const MessageTypeControl = 3;
const MessageTypeClose = 4;
const MessageTypeActivation = 5;

const ExecSessionTerminal: React.FC<ExecSessionTerminalProps> = ({
  socketUrl,
  authToken,
  className,
  microserviceUuid = "",
  execId = "",
  onClose,
  nodeUuid,
  agentName,
  waitingForDebugger = false,
  active = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const searchRef = useRef<SearchAddon | null>(null);
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const sessionRef = useRef<{ microserviceUuid: string; execId: string }>({
    microserviceUuid,
    execId,
  });
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const sessionEndedRef = useRef<boolean>(false);
  const userInitiatedCloseRef = useRef<boolean>(false);
  const closeNoticeRef = useRef<string | null>(null);
  const inputListenerRef = useRef<{ dispose: () => void } | null>(null);
  const lastPublishedSizeRef = useRef<TerminalSize | null>(null);
  const activeRef = useRef(active);
  const requestFitRef = useRef<() => void>(() => {});
  const onFindRef = useRef<() => void>(() => {});
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  activeRef.current = active;
  const [banner, setBanner] = useState<string | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findMiss, setFindMiss] = useState(false);

  requestFitRef.current = () => {
    const el = containerRef.current;
    const fit = fitRef.current;
    const term = termRef.current;
    const ws = wsRef.current;
    // Hidden tabs stay at the last published size so their PTY and grid match.
    if (!activeRef.current || sessionEndedRef.current) {
      return;
    }
    if (!el || !fit || !term) {
      return;
    }
    if (!isTerminalViewportMeasurable(el.clientWidth, el.clientHeight)) {
      return;
    }
    try {
      fit.fit();
    } catch {
      return;
    }
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const sessionExecId = sessionRef.current.execId;
    if (!sessionExecId) {
      return;
    }
    const cols = term.cols;
    const rows = term.rows;
    if (!isPublishableTerminalSize(cols, rows, lastPublishedSizeRef.current)) {
      return;
    }
    const resizeMsg: Message = {
      type: MessageTypeControl,
      data: new TextEncoder().encode(resizeControlPayload(cols, rows)),
      microserviceUuid: sessionRef.current.microserviceUuid,
      execId: sessionExecId,
      timestamp: Date.now(),
    };
    try {
      ws.send(msgpack.encode(resizeMsg));
      lastPublishedSizeRef.current = { cols, rows };
    } catch (error) {
      console.warn("Failed to send terminal resize:", error);
    }
  };

  onFindRef.current = () => {
    const selected = termRef.current
      ?.getSelection()
      .split(/\r?\n/)[0]
      ?.trim();
    if (selected) {
      setFindQuery(selected);
    }
    setFindOpen(true);
    requestAnimationFrame(() => findInputRef.current?.focus());
  };

  const closeFind = () => {
    searchRef.current?.clearDecorations();
    setFindOpen(false);
    setFindMiss(false);
    if (!sessionEndedRef.current) {
      termRef.current?.focus();
    }
  };

  const runFind = (direction: "next" | "previous") => {
    const addon = searchRef.current;
    if (!addon || !findQuery) {
      setFindMiss(false);
      return;
    }
    const found =
      direction === "next"
        ? addon.findNext(findQuery)
        : addon.findPrevious(findQuery);
    setFindMiss(!found);
  };

  useEffect(() => {
    if (!findOpen || !findQuery) {
      return;
    }
    const addon = searchRef.current;
    if (!addon) {
      return;
    }
    setFindMiss(!addon.findNext(findQuery, { incremental: true }));
  }, [findOpen, findQuery]);

  // Use debugger status hook when waiting for debugger
  const { debugUuid, status: debuggerStatus } = useDebuggerStatus(
    nodeUuid,
    waitingForDebugger,
    agentName,
  );

  // Debug progress stays above the grid. The shell must start at column 0.
  useEffect(() => {
    if (!waitingForDebugger) {
      return;
    }
    if (debuggerStatus === "error") {
      setBanner("Timeout waiting for debug container to start");
      return;
    }
    if (debuggerStatus === "running" && debugUuid) {
      setBanner("Debug container is running, connecting to terminal…");
      return;
    }
    if (debuggerStatus === "starting") {
      setBanner("Debug container is starting…");
      return;
    }
    setBanner("Waiting for debug container to start…");
  }, [waitingForDebugger, debuggerStatus, debugUuid]);

  const startPingMechanism = (ws: WebSocket) => {
    // Clear any existing ping interval
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
    }

    // Send keep-alive messages every 30 seconds
    // Note: Browser WebSocket API doesn't expose native ping frames directly
    // We'll use a lightweight keep-alive approach that works with the server
    pingIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          // Send a lightweight keep-alive message
          // The server should respond to keep the connection alive
          const keepAliveMsg: Message = {
            type: MessageTypeControl,
            data: new TextEncoder().encode("keepalive"),
            microserviceUuid: sessionRef.current.microserviceUuid,
            execId: sessionRef.current.execId,
            timestamp: Date.now(),
          };

          const encodedKeepAlive = msgpack.encode(keepAliveMsg);
          ws.send(encodedKeepAlive);

          // Set timeout for response (10 seconds)
          if (pongTimeoutRef.current) {
            clearTimeout(pongTimeoutRef.current);
          }

          pongTimeoutRef.current = setTimeout(() => {
            console.warn("Keep-alive timeout - connection may be dead");
            closeNoticeRef.current =
              "Connection timeout — no keep-alive response received";
            setBanner(closeNoticeRef.current);
            ws.close();
          }, 10000);
        } catch (error) {
          console.warn("Failed to send keep-alive:", error);
        }
      }
    }, 30000); // 30 seconds
  };

  const stopPingMechanism = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    if (pongTimeoutRef.current) {
      clearTimeout(pongTimeoutRef.current);
      pongTimeoutRef.current = null;
    }
  };

  // Initialize terminal (always, even when waiting for debugger)
  useEffect(() => {
    if (termRef.current) {
      return; // Terminal already initialized
    }

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      fontSize: 14,
      fontFamily: TERMINAL_FONT_FAMILY,
      fontWeight: "400",
      lineHeight: 1,
      letterSpacing: 0,
      convertEol: false,
      macOptionIsMeta: true,
      smoothScrollDuration: 0,
      theme: {
        background: "#0d1117",
        foreground: "#f0f6fc",
        cursor: "#58a6ff",
        cursorAccent: "#0d1117",
        selectionBackground: "#264f78",
        black: "#484f58",
        red: "#ff7b72",
        green: "#7ee787",
        yellow: "#f2cc60",
        blue: "#79c0ff",
        magenta: "#bc8cff",
        cyan: "#56d4dd",
        white: "#f0f6fc",
        brightBlack: "#6e7681",
        brightRed: "#ffa198",
        brightGreen: "#56d364",
        brightYellow: "#e3b341",
        brightBlue: "#58a6ff",
        brightMagenta: "#bc8cff",
        brightCyan: "#39c5cf",
        brightWhite: "#b1bac4",
      },
      scrollback: 10000,
      tabStopWidth: 4,
      allowTransparency: false,
      allowProposedApi: true,
    });
    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new Unicode11Addon());
    term.unicode.activeVersion = "11";
    term.loadAddon(
      new WebLinksAddon((_event, uri) => {
        if (!isSafeTerminalLink(uri)) {
          return;
        }
        window.open(uri, "_blank", "noopener,noreferrer");
      }),
    );
    term.loadAddon(searchAddon);
    term.attachCustomKeyEventHandler((event) => {
      if (event.type !== "keydown") {
        return true;
      }
      const key = event.key.toLowerCase();
      const copySelection =
        term.hasSelection() &&
        !event.altKey &&
        ((event.metaKey && !event.ctrlKey && !event.shiftKey && key === "c") ||
          (event.ctrlKey && event.shiftKey && key === "c"));
      if (copySelection) {
        const text = term.getSelection();
        if (text && navigator.clipboard?.writeText) {
          void navigator.clipboard.writeText(text);
        }
        term.clearSelection();
        event.preventDefault();
        return false;
      }
      const modified = event.metaKey || event.ctrlKey;
      if (modified && !event.altKey && !event.shiftKey && key === "f") {
        event.preventDefault();
        onFindRef.current();
        return false;
      }
      return true;
    });
    fitRef.current = fitAddon;
    searchRef.current = searchAddon;
    termRef.current = term;

    if (containerRef.current) {
      term.open(containerRef.current);
      try {
        const webgl = new WebglAddon();
        webgl.onContextLoss(() => {
          webgl.dispose();
        });
        term.loadAddon(webgl);
      } catch (error) {
        console.warn("WebGL terminal renderer unavailable", error);
      }
      requestFitRef.current();
      term.focus();
    }

    let disposed = false;
    const fontsReady = document.fonts?.ready;
    if (fontsReady) {
      void fontsReady.then(() => {
        if (!disposed) {
          requestFitRef.current();
        }
      });
    }

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleFit = () => {
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      resizeTimer = setTimeout(() => {
        resizeTimer = undefined;
        requestFitRef.current();
      }, 50);
    };
    const ro = new ResizeObserver(scheduleFit);
    if (containerRef.current) {
      ro.observe(containerRef.current);
    }
    window.addEventListener("resize", scheduleFit);

    return () => {
      disposed = true;
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      ro.disconnect();
      window.removeEventListener("resize", scheduleFit);
      searchRef.current = null;
      fitRef.current = null;
      term.dispose();
      termRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!active) {
      return;
    }
    requestFitRef.current();
    if (!sessionEndedRef.current) {
      termRef.current?.focus();
    }
  }, [active]);

  // Initialize WebSocket connection (only when debugger is ready or not waiting)
  useEffect(() => {
    let finalSocketUrl: string;
    let finalMicroserviceUuid: string;

    if (waitingForDebugger) {
      if (debuggerStatus !== "running" || !debugUuid) {
        return;
      }
      finalSocketUrl = `${getWsBaseUrl()}/api/v3/microservices/system/exec/${debugUuid}`;
      finalMicroserviceUuid = debugUuid;
    } else {
      if (!socketUrl) {
        return;
      }
      finalSocketUrl = socketUrl;
      finalMicroserviceUuid = microserviceUuid;
    }

    // Prevent multiple initializations
    if (isInitializedRef.current) {
      return;
    }

    if (!termRef.current) {
      return; // Terminal not initialized yet
    }
    const term = termRef.current;
    isInitializedRef.current = true;
    sessionEndedRef.current = false;
    userInitiatedCloseRef.current = false;
    lastPublishedSizeRef.current = null;

    sessionRef.current.microserviceUuid = finalMicroserviceUuid;

    const sendExecCloseFrame = (targetWs: WebSocket) => {
      if (sessionEndedRef.current || targetWs.readyState !== WebSocket.OPEN) {
        return;
      }
      const { execId, microserviceUuid: msUuid } = sessionRef.current;
      if (!execId) {
        return;
      }

      const closeMsg: Message = {
        type: MessageTypeClose,
        data: new Uint8Array(0),
        microserviceUuid: msUuid,
        execId,
        sessionId: execId,
        timestamp: Date.now(),
      };

      try {
        targetWs.send(msgpack.encode(closeMsg));
        userInitiatedCloseRef.current = true;
      } catch (error) {
        console.warn("Failed to send close message:", error);
      }
    };

    const getSessionEndMessage = (code: number, reason: string) => {
      if (isNormalExecSessionClose(code, userInitiatedCloseRef.current)) {
        return "Exec session closed";
      }

      return `Connection closed: ${formatWebSocketClose(code, reason)}`;
    };

    const markSessionEnded = (message: string) => {
      if (sessionEndedRef.current) {
        return;
      }
      sessionEndedRef.current = true;
      stopPingMechanism();
      inputListenerRef.current?.dispose();
      inputListenerRef.current = null;
      term.options.disableStdin = true;
      term.options.cursorBlink = false;
      setBanner(closeNoticeRef.current ?? message);
    };

    const writePty = (data: Uint8Array) => {
      const { status, rest } = takeExecStatusNotice(data);
      if (rest.byteLength > 0) {
        setBanner(null);
        term.write(rest);
        return;
      }
      if (status) {
        setBanner(status);
      }
    };

    const wsUrl = authToken
      ? `${finalSocketUrl}?token=${authToken}`
      : finalSocketUrl;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      startPingMechanism(ws);
      requestAnimationFrame(() => requestFitRef.current());
    };
    ws.onmessage = (evt) => {
      // Handle application messages
      if (evt.data instanceof ArrayBuffer) {
        try {
          const decoded = msgpack.decode(new Uint8Array(evt.data)) as Message;

          // Handle different message types
          switch (decoded.type) {
            case MessageTypeStdout:
            case MessageTypeStderr:
              if (decoded.data?.byteLength) {
                writePty(decoded.data);
              }
              break;

            case MessageTypeControl: {
              // Control messages (like resize, keep-alive responses, etc.)
              const controlData = new TextDecoder().decode(decoded.data);

              if (controlData === "keepalive" || controlData === "pong") {
                // Clear keep-alive timeout on receiving response
                if (pongTimeoutRef.current) {
                  clearTimeout(pongTimeoutRef.current);
                  pongTimeoutRef.current = null;
                }
              }
              break;
            }

            case MessageTypeActivation: {
              const activationExecId =
                decoded.execId || decoded.sessionId || "";
              if (activationExecId) {
                sessionRef.current.execId = activationExecId;
              }
              if (decoded.microserviceUuid) {
                sessionRef.current.microserviceUuid = decoded.microserviceUuid;
              }
              if (decoded.data?.length) {
                try {
                  const activation = JSON.parse(
                    new TextDecoder().decode(decoded.data),
                  ) as {
                    sessionId?: string;
                    microserviceUuid?: string;
                  };
                  if (activation.sessionId) {
                    sessionRef.current.execId = activation.sessionId;
                  }
                  if (activation.microserviceUuid) {
                    sessionRef.current.microserviceUuid =
                      activation.microserviceUuid;
                  }
                } catch {
                  // ACTIVATION data is optional JSON; ignore parse failures
                }
              }
              requestFitRef.current();
              break;
            }

            case MessageTypeClose:
              markSessionEnded("Session closed");
              onCloseRef.current?.();
              break;

            default:
              console.warn("Unknown message type:", decoded.type);
          }
        } catch (error) {
          console.error("Failed to decode message:", error);
          setBanner("Failed to decode message");
        }
      } else if (typeof evt.data === "string") {
        writePty(new TextEncoder().encode(evt.data));
      }
    };
    ws.onclose = (evt) => {
      markSessionEnded(getSessionEndMessage(evt.code, evt.reason));
    };
    ws.onerror = () => {
      setBanner(formatWebSocketErrorString("Connection error"));
    };

    const inputListener = term.onData((data) => {
      if (sessionEndedRef.current || ws.readyState !== WebSocket.OPEN) {
        return;
      }

      const msg: Message = {
        type: MessageTypeStdin,
        data: new TextEncoder().encode(data),
        microserviceUuid: sessionRef.current.microserviceUuid,
        execId: sessionRef.current.execId,
        timestamp: Date.now(),
      };
      ws.send(msgpack.encode(msg));
    });
    inputListenerRef.current = inputListener;

    return () => {
      inputListenerRef.current?.dispose();
      inputListenerRef.current = null;
      stopPingMechanism();

      if (!sessionEndedRef.current && ws.readyState === WebSocket.OPEN) {
        sendExecCloseFrame(ws);
      }

      // Tab unmount only — let server close first after shell exit (avoid 1005 race).
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      isInitializedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketUrl, waitingForDebugger, debuggerStatus, debugUuid, microserviceUuid]);

  return (
    <div
      className={className}
      style={{
        height: "100%",
        width: "100%",
        background: "#0d1117",
        overflow: "hidden",
        padding: "8px",
        position: "relative",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {banner && (
        <div
          role="status"
          style={{
            flex: "0 0 auto",
            marginBottom: 6,
            color: "#f0f6fc",
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 6,
            fontSize: 12,
            lineHeight: "18px",
            fontFamily: TERMINAL_FONT_FAMILY,
            padding: "4px 8px",
          }}
        >
          {banner}
        </div>
      )}
      {findOpen && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            runFind("next");
          }}
          style={{
            position: "absolute",
            top: 8,
            right: 12,
            zIndex: 2,
            display: "flex",
            gap: 4,
            alignItems: "center",
            background: "#161b22",
            border: `1px solid ${findMiss ? "#f85149" : "#30363d"}`,
            borderRadius: 6,
            padding: "4px 6px",
          }}
        >
          <input
            ref={findInputRef}
            aria-label="Find in terminal"
            value={findQuery}
            spellCheck={false}
            onChange={(event) => {
              setFindQuery(event.target.value);
              setFindMiss(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeFind();
              } else if (event.key === "Enter") {
                event.preventDefault();
                runFind(event.shiftKey ? "previous" : "next");
              }
            }}
            placeholder="Find"
            style={{
              width: 180,
              background: "#0d1117",
              color: "#f0f6fc",
              border: "none",
              outline: "none",
              fontSize: 13,
              fontFamily: TERMINAL_FONT_FAMILY,
              padding: "2px 6px",
            }}
          />
          <button
            type="button"
            aria-label="Previous match"
            onClick={() => runFind("previous")}
            style={findButtonStyle}
          >
            Prev
          </button>
          <button type="submit" aria-label="Next match" style={findButtonStyle}>
            Next
          </button>
          <button
            type="button"
            aria-label="Close find"
            onClick={closeFind}
            style={findButtonStyle}
          >
            Esc
          </button>
        </form>
      )}
      {/* Terminal Content - fills entire container */}
      <div
        ref={containerRef}
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          width: "100%",
          background: "#0d1117",
        }}
        onClick={() => {
          if (!sessionEndedRef.current) {
            termRef.current?.focus();
          }
        }}
      />
    </div>
  );
};

const findButtonStyle: React.CSSProperties = {
  background: "transparent",
  color: "#f0f6fc",
  border: "1px solid #30363d",
  borderRadius: 4,
  fontSize: 12,
  lineHeight: "18px",
  padding: "0 6px",
  cursor: "pointer",
};

export default React.memo(ExecSessionTerminal, (prevProps, nextProps) => {
  // Only re-render if essential props change
  return (
    prevProps.socketUrl === nextProps.socketUrl &&
    prevProps.authToken === nextProps.authToken &&
    prevProps.microserviceUuid === nextProps.microserviceUuid &&
    prevProps.execId === nextProps.execId &&
    prevProps.className === nextProps.className &&
    prevProps.active === nextProps.active
  );
});
