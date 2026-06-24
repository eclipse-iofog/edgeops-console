import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import * as msgpack from "@msgpack/msgpack";
import { useDebuggerStatus } from "@/hooks/useDebuggerStatus";
import { getWsBaseUrl } from "@/auth/api";

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
};

type Message = {
  type: number;
  data: Uint8Array;
  microserviceUuid: string;
  execId: string;
  timestamp: number;
};

const MessageTypeStdin = 0;
const MessageTypeStdout = 1;
const MessageTypeStderr = 2;
const MessageTypeControl = 3;
const MessageTypeClose = 4;
const MessageTypeActivation = 5;

const errorMessages: Record<string, string> = {
  "No available exec session":
    "No available exec session for this agent or microservice. Be sure to attach/link exec session to the agent or microservice first. If you already attached/linked exec session to the agent or microservice, please wait for the exec session to be ready.",
  "Microservice has already active exec session":
    "Another user is already connected to this microservice. Only one user can connect at a time.",
  "Timeout waiting for agent connection":
    "Timeout waiting for agent connection. Please ensure the microservice/agent is running and try again.",
  "Authentication failed":
    "Authentication failed. Please check your credentials and try again.",
  "Microservice is not running":
    "Microservice is not running. Please start the microservice first.",
  "Microservice exec is not enabled":
    "Microservice exec is not enabled. Please enable exec for this microservice.",
  "Microservice already has an active session":
    "Another user is already connected to this microservice. Only one user can connect at a time.",
  "Insufficient permissions":
    "Insufficient permissions. Required roles: SRE for Node Exec or Developer for Microservice Exec.",
  "Only SRE can access system microservices":
    "Only SRE can access system microservices. Please contact your administrator.",
};

function formatWebSocketError(err: string) {
  if (err.includes("close 1008")) {
    // Try direct string matching first (more reliable)
    for (const key in errorMessages) {
      if (err.includes(key)) return errorMessages[key];
    }

    // Try to extract the reason from the error message
    const reason = extractCloseReason(err);
    if (reason) return reason;

    // Default fallback for unknown 1008 errors
    return "Policy violation: Access denied";
  }

  if (err.includes("close 1006")) return "Connection lost unexpectedly";
  if (err.includes("close 1009")) return "Message too large";
  if (err.includes("close 1011")) return "Server error occurred";
  if (err.includes("failed to connect")) return "Failed to connect to server";
  if (err.includes("use of closed network connection"))
    return "Connection was closed";

  // Handle websocket close errors with reason extraction
  if (err.includes("websocket: close")) {
    // Extract the reason part if available
    const reasonMatch = err.match(/reason:\s*(.+)/);
    if (reasonMatch) {
      return reasonMatch[1].trim();
    }

    // Extract the code and basic message
    if (err.includes("failed to read message:")) {
      const parts = err.split("failed to read message:");
      if (parts.length > 1) {
        return parts[1].trim();
      }
    }
  }

  return err;
}

function extractCloseReason(errStr: string): string {
  // Look for "reason:" pattern
  const reasonMatch = errStr.match(/reason:\s*(.+?)(?:\.|$)/);
  if (reasonMatch) {
    return reasonMatch[1].trim();
  }

  // Look for "policy violation:" pattern
  const policyMatch = errStr.match(/policy violation:\s*(.+?)(?:\.|$)/i);
  if (policyMatch) {
    return policyMatch[1].trim();
  }

  // Look for quoted reason at the end
  if (errStr.includes("close 1008")) {
    // Try to extract the last quoted string
    const quotedMatch = errStr.match(/"([^"]+)"/g);
    if (quotedMatch && quotedMatch.length > 0) {
      const lastQuoted = quotedMatch[quotedMatch.length - 1].slice(1, -1);
      if (lastQuoted) return lastQuoted;
    }

    // Try to extract after "close 1008"
    const afterCloseMatch = errStr.match(/close 1008\s*\(?([^)]+)\)?/);
    if (afterCloseMatch) {
      let afterClose = afterCloseMatch[1].trim();

      // If it starts with a quote, extract the quoted part
      if (afterClose.startsWith('"')) {
        const endQuote = afterClose.indexOf('"', 1);
        if (endQuote > 0) {
          return afterClose.slice(1, endQuote);
        }
      }

      // If it contains a colon, extract after the colon
      const colonIndex = afterClose.indexOf(":");
      if (colonIndex > 0) {
        const reason = afterClose.slice(colonIndex + 1).trim();
        return reason.endsWith(".") ? reason.slice(0, -1) : reason;
      }

      // Return the whole thing if it looks like a reason
      if (afterClose && !afterClose.includes("websocket")) {
        return afterClose;
      }
    }
  }

  return "";
}

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
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const sessionRef = useRef<{ microserviceUuid: string; execId: string }>({
    microserviceUuid,
    execId,
  });
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  const [statusMessageShown, setStatusMessageShown] = useState(false);
  const [readyMessageShown, setReadyMessageShown] = useState(false);

  // Use debugger status hook when waiting for debugger
  const { debugUuid, status: debuggerStatus } = useDebuggerStatus(
    nodeUuid,
    waitingForDebugger,
    agentName,
  );

  // Show ready message when debugger is available (WebSocket connects separately)
  useEffect(() => {
    if (
      waitingForDebugger &&
      debugUuid &&
      debuggerStatus === "running" &&
      termRef.current &&
      !readyMessageShown
    ) {
      termRef.current.clear();
      termRef.current.writeln(
        "\x1b[32m✓ Debug container is running, connecting to terminal...\x1b[0m",
      );
      setReadyMessageShown(true);
    }
  }, [waitingForDebugger, debugUuid, debuggerStatus, readyMessageShown]);

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
            if (termRef.current) {
              termRef.current.writeln(
                "\r\n\x1b[31m✗ Connection timeout - no keep-alive response received\x1b[0m",
              );
            }
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
      fontSize: 14,
      fontFamily:
        '"Fira Code", "JetBrains Mono", "Cascadia Code", "SF Mono", "Monaco", "Inconsolata", "Roboto Mono", "Source Code Pro", monospace',
      fontWeight: "400",
      lineHeight: 1.2,
      letterSpacing: 0.5,
      convertEol: true,
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
      scrollback: 1000,
      tabStopWidth: 4,
      allowTransparency: false,
      allowProposedApi: true,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    fitRef.current = fitAddon;

    if (containerRef.current) {
      term.open(containerRef.current);
      fitAddon.fit();
      term.focus();
    }
    termRef.current = term;

    return () => {
      term.dispose();
      termRef.current = null;
    };
  }, []);

  // Show status messages when waiting for debugger
  useEffect(() => {
    if (waitingForDebugger && termRef.current && !statusMessageShown) {
      termRef.current.clear();
      termRef.current.writeln(
        "\x1b[33m⏳ Waiting for debug container to start...\x1b[0m",
      );
      setStatusMessageShown(true);
    }
  }, [waitingForDebugger, statusMessageShown]);

  // Update status message based on debugger status
  useEffect(() => {
    if (waitingForDebugger && termRef.current) {
      switch (debuggerStatus) {
        case "waiting":
          termRef.current.write(
            "\r\x1b[K\x1b[33m⏳ Waiting for debug container...\x1b[0m",
          );
          break;
        case "starting":
          termRef.current.write(
            "\r\x1b[K\x1b[36m🔄 Debug container is starting...\x1b[0m",
          );
          break;
        case "error":
          termRef.current.writeln(
            "\r\n\x1b[31m✗ Timeout waiting for debug container to start\x1b[0m",
          );
          break;
      }
    }
  }, [waitingForDebugger, debuggerStatus]);

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
    const session = { ...sessionRef.current };
    isInitializedRef.current = true;

    sessionRef.current.microserviceUuid = finalMicroserviceUuid;

    const wsUrl = authToken
      ? `${finalSocketUrl}?token=${authToken}`
      : finalSocketUrl;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      term.writeln("\x1b[32m✓ Connected to Exec session\x1b[0m");

      // Start ping mechanism to keep connection alive
      startPingMechanism(ws);
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
              // Write output directly to terminal
              term.write(new TextDecoder().decode(decoded.data));
              break;

            case MessageTypeControl:
              // Control messages (like resize, keep-alive responses, etc.)
              const controlData = new TextDecoder().decode(decoded.data);

              if (controlData === "keepalive" || controlData === "pong") {
                // Clear keep-alive timeout on receiving response
                if (pongTimeoutRef.current) {
                  clearTimeout(pongTimeoutRef.current);
                  pongTimeoutRef.current = null;
                }
              } else {
                // Other control messages (like resize, etc.)
                term.writeln(`\r\n [Control] ${controlData}`);
              }
              break;

            case MessageTypeActivation:
              // Session activation message - update exec ID if provided
              if (decoded.execId) {
                // Store the exec ID for future messages
                sessionRef.current.execId = decoded.execId;
              }
              if (decoded.microserviceUuid) {
                sessionRef.current.microserviceUuid = decoded.microserviceUuid;
              }
              term.writeln("\r\n\x1b[36m🔗 Session activated\x1b[0m");
              break;

            case MessageTypeClose:
              // Session close message
              term.writeln("\r\n Session closed");
              ws.close();
              break;

            default:
              console.warn("Unknown message type:", decoded.type);
          }
        } catch (error) {
          console.error("Failed to decode message:", error);
          term.writeln("\r\n Failed to decode message");
        }
      } else if (typeof evt.data === "string") {
        // Handle text messages (fallback)
        term.write(evt.data);
      }
    };
    ws.onclose = (evt) => {
      if (evt.code === 1000) {
        // Normal closure - user exited session successfully
        term.writeln(`\r\n\x1b[32m✓ Exec Session successfully closed\x1b[0m`);

        // Don't auto-close the drawer when session closes normally
        // The user should manually close the tab if they want to
        // This prevents accidental closure when switching tabs
      } else {
        // Use existing error handling logic for other close codes
        const msg = formatWebSocketError(`close ${evt.code} ${evt.reason}`);
        term.writeln(`\r\n\x1b[31m✗ Connection closed: ${msg}\x1b[0m`);
        // Don't auto-close on errors - let user see the error message
      }
    };
    ws.onerror = (evt: any) => {
      const msg = formatWebSocketError(evt.message || "Connection error");
      term.writeln(`\r\n\x1b[31m✗ Connection error: ${msg}\x1b[0m`);
    };

    const inputListener = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        const msg: Message = {
          type: MessageTypeStdin,
          data: new TextEncoder().encode(data),
          microserviceUuid: sessionRef.current.microserviceUuid,
          execId: sessionRef.current.execId,
          timestamp: Date.now(),
        };
        const encoded = msgpack.encode(msg);
        ws.send(encoded);
      }
    });

    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => fitRef.current?.fit(), 50);
    };

    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", handleResize);

    return () => {
      inputListener.dispose();
      ro.disconnect();
      window.removeEventListener("resize", handleResize);

      // Stop ping mechanism
      stopPingMechanism();

      // Send close message before closing the connection
      if (ws.readyState === WebSocket.OPEN) {
        const closeMsg: Message = {
          type: MessageTypeClose,
          data: new Uint8Array(0),
          microserviceUuid: session.microserviceUuid,
          execId: session.execId,
          timestamp: Date.now(),
        };
        try {
          const encoded = msgpack.encode(closeMsg);
          ws.send(encoded);
        } catch (error) {
          console.warn("Failed to send close message:", error);
        }
      }

      ws.close();
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
        padding: "16px",
      }}
    >
      {/* Terminal Content - fills entire container */}
      <div
        ref={containerRef}
        style={{
          height: "100%",
          width: "100%",
          background: "#0d1117",
        }}
        onClick={() => termRef.current?.focus()}
      />
    </div>
  );
};

export default React.memo(ExecSessionTerminal, (prevProps, nextProps) => {
  // Only re-render if essential props change
  const shouldReRender =
    prevProps.socketUrl === nextProps.socketUrl &&
    prevProps.authToken === nextProps.authToken &&
    prevProps.microserviceUuid === nextProps.microserviceUuid &&
    prevProps.execId === nextProps.execId &&
    prevProps.className === nextProps.className;

  if (!shouldReRender) {
  }

  return shouldReRender;
});
