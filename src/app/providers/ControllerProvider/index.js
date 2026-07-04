import React from "react";
import { useAuth } from "../../../auth";
import { getApiBase } from "../../../auth/apiBase";
import { HEALTH_CHECK_INTERVAL_MS, HEALTH_CHECK_TIMEOUT_MS } from "@/lib/http/constants";
import {
  fetchWithTimeout,
  isNetworkOrTimeoutError,
} from "@/lib/http/fetchWithTimeout";
import { useFeedback } from "../feedback";

const controllerConfig = window.controllerConfig || {};
const IPLookUp = "http://ip-api.com/json/";

const getBaseUrl = () => getApiBase(controllerConfig);

const getUrl = (path) => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${getBaseUrl()}${path}`;
};

export const ControllerContext = React.createContext();
export const useController = () => React.useContext(ControllerContext);

const initState = {
  user: null,
  status: null,
  refresh: null,
  location: null,
};

const reducer = (state, action) => {
  switch (action.type) {
    case "UPDATE":
      return { ...state, ...action.data };
    default:
      return state;
  }
};

const lookUpControllerInfo = async (ip) => {
  if (!ip) ip = window.location.host.split(":")[0];

  const localhost = /(0\.0\.0\.0|localhost|127\.0\.0\.1|192\.168\.)/;
  const lookupIP = localhost.test(ip) ? "8.8.8.8" : ip;

  const response = await fetch(
    IPLookUp + lookupIP.replace("http://", "").replace("https://", ""),
  );
  if (response.ok) {
    return response.json();
  }
  throw new Error(response.statusText);
};

const parseErrorBody = async (response) => {
  try {
    return await response.json();
  } catch (e) {
    return {
      message: response.statusText || "An error occurred",
    };
  }
};

export const ControllerProvider = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, initState);
  const [isControllerHealthy, setIsControllerHealthy] = React.useState(true);
  const auth = useAuth();
  const feedbackContext = useFeedback();
  const pushFeedback = feedbackContext?.pushFeedback;

  const authRef = React.useRef(auth);
  authRef.current = auth;

  const pushFeedbackRef = React.useRef(pushFeedback);
  pushFeedbackRef.current = pushFeedback;

  const isControllerHealthyRef = React.useRef(true);
  isControllerHealthyRef.current = isControllerHealthy;
  const healthCheckTimerRef = React.useRef(null);
  const requestRef = React.useRef(null);

  const markHealthy = React.useCallback((statusData) => {
    isControllerHealthyRef.current = true;
    setIsControllerHealthy(true);
    if (statusData) {
      dispatch({ type: "UPDATE", data: { status: statusData } });
    }
  }, []);

  const markUnhealthy = React.useCallback(() => {
    if (!isControllerHealthyRef.current) {
      return;
    }
    isControllerHealthyRef.current = false;
    setIsControllerHealthy(false);
  }, []);

  const markHealthyRef = React.useRef(markHealthy);
  markHealthyRef.current = markHealthy;

  const markUnhealthyRef = React.useRef(markUnhealthy);
  markUnhealthyRef.current = markUnhealthy;

  const probeControllerHealth = React.useCallback(async () => {
    try {
      const response = await fetchWithTimeout(
        getUrl("/api/v3/status"),
        {},
        HEALTH_CHECK_TIMEOUT_MS,
      );
      if (response.ok) {
        const status = await response.json();
        markHealthy(status);
        return true;
      }
    } catch (error) {
      console.warn("Controller health check failed:", error);
    }
    return false;
  }, [markHealthy]);

  const updateController = React.useCallback((data) => {
    dispatch({ type: "UPDATE", data });
  }, []);

  const request = React.useCallback(async (path, options = {}, attempt = 0) => {
    const currentAuth = authRef.current;
    let token = currentAuth?.token;

    if (currentAuth?.ensureFreshToken) {
      try {
        const freshToken = await currentAuth.ensureFreshToken();
        if (freshToken) {
          token = freshToken;
        }
      } catch (error) {
        console.error("Token refresh before request failed:", error);
      }
    }

    const headers = {
      ...options.headers,
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
      response = await fetchWithTimeout(getUrl(path), {
        ...options,
        headers: { ...headers },
      });
    } catch (error) {
      console.error("Request failed:", error);
      if (isNetworkOrTimeoutError(error)) {
        markUnhealthyRef.current();
      }
      return null;
    }

    if (response.ok) {
      if (!isControllerHealthyRef.current) {
        markHealthyRef.current(null);
      }
      return response;
    }

    const status = response.status;
    const errorData = await parseErrorBody(response);

    if (status === 401 && attempt === 0 && currentAuth?.refreshSession) {
      try {
        const refreshed = await currentAuth.refreshSession();
        if (refreshed) {
          return requestRef.current(path, options, attempt + 1);
        }
      } catch (error) {
        console.error("401 refresh attempt failed:", error);
        return {
          ...errorData,
          ok: false,
          status,
          statusText: response.statusText,
        };
      }

      if (currentAuth?.hasRefreshToken) {
        if (currentAuth?.logout) {
          currentAuth.logout();
        }
        window.location.replace(`${window.location.origin}/#/login`);
      }
      return {
        ...errorData,
        ok: false,
        status,
        statusText: response.statusText,
      };
    }

    const pushFeedbackFn = pushFeedbackRef.current;
    if ((status === 401 || status === 403) && pushFeedbackFn) {
      const errorMessage =
        errorData.message ||
        (status === 401
          ? "Unauthorized: You don't have permission to access this resource"
          : "Forbidden: Access to this resource is denied");

      pushFeedbackFn({
        message: errorMessage,
        type: "error",
      });
    }

    return {
      ...errorData,
      ok: false,
      status,
      statusText: response.statusText,
    };
  }, []);

  requestRef.current = request;

  React.useEffect(() => {
    const effect = async () => {
      try {
        const ipInfo = await lookUpControllerInfo(window.location.hostname);
        dispatch({ type: "UPDATE", data: { location: ipInfo } });
      } catch (e) {
        dispatch({
          type: "UPDATE",
          data: {
            location: {
              lat: "40.935",
              lon: "28.97",
              query: window.location.hostname,
            },
          },
        });
      }
    };
    effect();
  }, []);

  React.useEffect(() => {
    if (!auth.isAuthenticated) {
      return;
    }

    dispatch({ type: "UPDATE", data: { user: auth.user } });

    const loadStatus = async () => {
      try {
        const response = await fetchWithTimeout(getUrl("/api/v3/status"));
        if (response.ok) {
          markHealthy(await response.json());
          return;
        }
        console.log("Controller status unreachable", {
          status: response.statusText,
        });
      } catch (error) {
        console.log("Controller status unreachable", error);
        if (isNetworkOrTimeoutError(error)) {
          markUnhealthy();
        }
      }
    };

    loadStatus();
  }, [auth.user, auth.isAuthenticated, markHealthy, markUnhealthy]);

  React.useEffect(() => {
    if (isControllerHealthy) {
      if (healthCheckTimerRef.current) {
        clearInterval(healthCheckTimerRef.current);
        healthCheckTimerRef.current = null;
      }
      return;
    }

    void probeControllerHealth();

    healthCheckTimerRef.current = setInterval(() => {
      void probeControllerHealth();
    }, HEALTH_CHECK_INTERVAL_MS);

    return () => {
      if (healthCheckTimerRef.current) {
        clearInterval(healthCheckTimerRef.current);
        healthCheckTimerRef.current = null;
      }
    };
  }, [isControllerHealthy, probeControllerHealth]);

  return (
    <ControllerContext.Provider
      value={{
        ...state,
        updateController,
        request,
        isControllerHealthy,
      }}
    >
      {children}
    </ControllerContext.Provider>
  );
};
