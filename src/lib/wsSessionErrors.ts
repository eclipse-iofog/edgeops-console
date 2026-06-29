const closeReasonMessages: Record<string, string> = {
  "Maximum of 3 concurrent exec sessions allowed for this microservice.":
    "Maximum exec sessions reached for this microservice.",
  "Maximum of 3 concurrent exec sessions allowed":
    "Maximum exec sessions reached for this microservice.",
  "Maximum of 3 concurrent log sessions allowed":
    "Maximum log sessions reached for this resource.",
  "Timeout waiting for agent connection":
    "Agent did not connect — retry.",
  "Authentication failed":
    "Authentication failed. Please check your credentials and try again.",
  "Microservice is not running":
    "Microservice is not running. Please start the microservice first.",
  "Insufficient permissions":
    "Insufficient permissions. Required roles: SRE for Node Exec or Developer for Microservice Exec.",
  "Only SRE can access system microservices":
    "Only SRE can access system microservices. Please contact your administrator.",
};

const relayUnavailableMessage =
  "Cross-replica relay unavailable. Retry or verify Controller HA (NATS hub or AMQP router, depending on deployment).";

export function isRelayUnavailableClose(code: number, reason = ""): boolean {
  return code === 1013 || isRelayUnavailableReason(reason);
}

export function isRelayUnavailableReason(reason: string): boolean {
  return /relay unavailable|router unavailable/i.test(reason);
}

export function isNormalExecSessionClose(
  code: number,
  userInitiatedClose: boolean,
): boolean {
  return code === 1000 || (userInitiatedClose && code === 1005);
}

export function formatWebSocketClose(code: number, reason = ""): string {
  if (code === 1000) {
    return "Session closed normally.";
  }

  if (code === 1001) {
    return "Controller is draining connections. Retry shortly or connect to another replica.";
  }

  if (isRelayUnavailableClose(code, reason)) {
    return relayUnavailableMessage;
  }

  if (code === 1008) {
    for (const key in closeReasonMessages) {
      if (reason.includes(key)) {
        return closeReasonMessages[key];
      }
    }

    const extracted = extractCloseReason(reason);
    if (extracted) {
      return extracted;
    }

    return "Policy violation: Access denied";
  }

  if (code === 1006) {
    return "Connection lost unexpectedly";
  }

  if (code === 1009) {
    return "Message too large";
  }

  if (code === 1011) {
    return "Server error occurred";
  }

  if (reason.trim()) {
    return reason.trim();
  }

  return `Connection closed with code ${code}`;
}

export function formatWebSocketErrorString(err: string): string {
  if (err.includes("close 1008")) {
    for (const key in closeReasonMessages) {
      if (err.includes(key)) {
        return closeReasonMessages[key];
      }
    }
  }

  const codeMatch = err.match(/close (\d+)/);
  if (codeMatch) {
    const code = Number.parseInt(codeMatch[1], 10);
    const reason = extractCloseReason(err);
    return formatWebSocketClose(code, reason);
  }

  if (err.includes("close 1006")) {
    return "Connection lost unexpectedly";
  }
  if (err.includes("close 1009")) {
    return "Message too large";
  }
  if (err.includes("close 1011")) {
    return "Server error occurred";
  }
  if (err.includes("failed to connect")) {
    return "Failed to connect to server";
  }
  if (err.includes("use of closed network connection")) {
    return "Connection was closed";
  }

  if (err.includes("websocket: close")) {
    const reasonMatch = err.match(/reason:\s*(.+)/);
    if (reasonMatch) {
      return reasonMatch[1].trim();
    }

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
  const reasonMatch = errStr.match(/reason:\s*(.+?)(?:\.|$)/);
  if (reasonMatch) {
    return reasonMatch[1].trim();
  }

  const policyMatch = errStr.match(/policy violation:\s*(.+?)(?:\.|$)/i);
  if (policyMatch) {
    return policyMatch[1].trim();
  }

  if (errStr.includes("close 1008")) {
    const quotedMatch = errStr.match(/"([^"]+)"/g);
    if (quotedMatch && quotedMatch.length > 0) {
      const lastQuoted = quotedMatch[quotedMatch.length - 1].slice(1, -1);
      if (lastQuoted) {
        return lastQuoted;
      }
    }

    const afterCloseMatch = errStr.match(/close 1008\s*\(?([^)]+)\)?/);
    if (afterCloseMatch) {
      let afterClose = afterCloseMatch[1].trim();

      if (afterClose.startsWith('"')) {
        const endQuote = afterClose.indexOf('"', 1);
        if (endQuote > 0) {
          return afterClose.slice(1, endQuote);
        }
      }

      const colonIndex = afterClose.indexOf(":");
      if (colonIndex > 0) {
        const reason = afterClose.slice(colonIndex + 1).trim();
        return reason.endsWith(".") ? reason.slice(0, -1) : reason;
      }

      if (afterClose && !afterClose.includes("websocket")) {
        return afterClose;
      }
    }
  }

  return errStr.trim();
}

export function formatLogBackpressureWarning(message: string): string {
  if (/backpressure/i.test(message)) {
    return "Log stream backpressure: some lines may be dropped until the client catches up.";
  }

  return message.trim() || "Log stream warning.";
}
