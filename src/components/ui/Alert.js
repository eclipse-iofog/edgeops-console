import React, { useState } from "react";
import { Alert as MuiAlert, Box, IconButton, useTheme } from "@mui/material";
import {
  AlertTriangle as WarningIcon,
  Check as CheckCircleIcon,
  AlertCircle as ErrorIcon,
  Info as InfoIcon,
  X as CloseIcon,
} from "lucide-react";

const variantIcon = {
  success: CheckCircleIcon,
  warning: WarningIcon,
  error: ErrorIcon,
  info: InfoIcon,
};

export default function Alert(props) {
  const theme = useTheme();
  const { open, alerts } = props;
  const [enteringIds, setEnteringIds] = useState(new Set());
  const [exitingIds, setExitingIds] = useState(new Set());

  React.useEffect(() => {
    if (open && alerts.length > 0) {
      alerts.forEach((alert) => {
        if (!enteringIds.has(alert.id) && !exitingIds.has(alert.id)) {
          setEnteringIds((prev) => new Set([...prev, alert.id]));
          setTimeout(() => {
            setEnteringIds((prev) => {
              const next = new Set(prev);
              next.delete(alert.id);
              return next;
            });
          }, 300);
        }
      });
    }
    const currentAlertIds = new Set(alerts.map((a) => a.id));
    setEnteringIds((prev) => {
      const filtered = Array.from(prev).filter((id) => currentAlertIds.has(id));
      return filtered.length !== prev.size ? new Set(filtered) : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only run when alerts/open change to avoid loops
  }, [alerts, open]);

  const handleClose = (alert) => {
    setExitingIds((prev) => new Set([...prev, alert.id]));
    setTimeout(() => {
      if (alert.onClose) {
        alert.onClose();
      }
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(alert.id);
        return next;
      });
    }, 300);
  };

  const getAnimationClass = (alert) => {
    if (exitingIds.has(alert.id)) return "exiting";
    if (enteringIds.has(alert.id)) return "entering";
    return "entered";
  };

  const variantBg = {
    success: theme.colors?.success ?? theme.palette?.success?.main ?? "#26D6F1",
    error: theme.colors?.error ?? theme.palette?.error?.main ?? "#FF585D",
    info: theme.colors?.cobalt ?? "#5064EC",
    warning: theme.colors?.danger ?? theme.colors?.gold ?? "#F5A623",
  };

  return open ? (
    <Box
      sx={{
        position: "fixed",
        top: "20px",
        right: "20px",
        left: "auto",
        zIndex: 105,
        maxWidth: "400px",
        width: "100%",
        display: "flex",
        flexDirection: "column-reverse",
        gap: "12px",
        pointerEvents: "none",
        "@media (max-width: 640px)": {
          maxWidth: "calc(100vw - 40px)",
          top: "16px",
          right: "20px",
          left: "20px",
        },
      }}
    >
      {alerts.map((a, idx) => {
        const variantKey = a.type || "info";
        const Icon = variantIcon[variantKey];
        const animationClass = getAnimationClass(a);
        return (
          <Box
            key={a.key || a.id || idx}
            sx={{ pointerEvents: "auto" }}
            onMouseEnter={a.onMouseEnter}
            onMouseLeave={a.onMouseLeave}
          >
            <MuiAlert
              severity={variantKey === "warning" ? "warning" : variantKey}
              icon={
                <Icon
                  size={20}
                  style={{ opacity: 0.9, marginRight: theme.spacing(1.5) }}
                />
              }
              action={
                <IconButton
                  size="small"
                  aria-label="Close"
                  color="inherit"
                  onClick={() => handleClose(a)}
                >
                  <CloseIcon size={20} />
                </IconButton>
              }
              className={a.className || ""}
              sx={{
                borderRadius: "8px",
                minHeight: "56px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                transition: "all 0.3s ease",
                marginBottom: "12px",
                opacity:
                  animationClass === "entered" || animationClass === "entering"
                    ? 1
                    : 0,
                transform:
                  animationClass === "exiting"
                    ? "translateX(100%)"
                    : "translateX(0)",
                "&:hover": {
                  boxShadow: "0 6px 16px rgba(0,0,0,0.2)",
                  transform: "translateX(0) scale(1.02)",
                },
                ...(variantKey === "success" && {
                  backgroundColor: variantBg.success,
                  color: "#fff",
                  "& .MuiAlert-icon": { color: "#fff" },
                }),
                ...(variantKey === "error" && {
                  backgroundColor: variantBg.error,
                  color: "#fff",
                  "& .MuiAlert-icon": { color: "#fff" },
                }),
                ...(variantKey === "info" && {
                  backgroundColor: variantBg.info,
                  color: "#fff",
                  "& .MuiAlert-icon": { color: "#fff" },
                }),
                ...(variantKey === "warning" && {
                  backgroundColor: variantBg.warning,
                  color: "#fff",
                  "& .MuiAlert-icon": { color: "#fff" },
                }),
              }}
            >
              <Box
                component="span"
                id="client-snackbar"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  fontSize: 14,
                  fontWeight: 500,
                  paddingRight: 1,
                }}
              >
                {a.message}
              </Box>
            </MuiAlert>
          </Box>
        );
      })}
    </Box>
  ) : null;
}
