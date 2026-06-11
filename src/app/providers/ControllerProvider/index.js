import React from "react";
import { useAuth } from "../../../auth";
import { getApiBase } from "../../../auth/apiBase";
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

const getControllerStatus = async () => {
  const response = await fetch(getUrl("/api/v3/status"));
  if (response.ok) return response.json();
  console.log("Controller status unreachable", { status: response.statusText });
  return null;
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
  const auth = useAuth();
  const feedbackContext = useFeedback();
  const pushFeedback = feedbackContext?.pushFeedback;

  const authRef = React.useRef(auth);
  authRef.current = auth;

  const updateController = (data) => {
    dispatch({ type: "UPDATE", data });
  };

  const request = async (path, options = {}, attempt = 0) => {
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
      response = await fetch(getUrl(path), {
        ...options,
        headers: { ...headers },
      });
    } catch (error) {
      console.error("Request failed:", error);
      return null;
    }

    if (response.ok) {
      return response;
    }

    const status = response.status;
    const errorData = await parseErrorBody(response);

    if (status === 401 && attempt === 0 && currentAuth?.refreshSession) {
      try {
        const refreshed = await currentAuth.refreshSession();
        if (refreshed) {
          return request(path, options, attempt + 1);
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

    if ((status === 401 || status === 403) && pushFeedback) {
      const errorMessage =
        errorData.message ||
        (status === 401
          ? "Unauthorized: You don't have permission to access this resource"
          : "Forbidden: Access to this resource is denied");

      pushFeedback({
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
  };

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
    const effect = async () => {
      const status = await getControllerStatus();
      dispatch({ type: "UPDATE", data: { status } });
    };

    if (auth.isAuthenticated) {
      dispatch({ type: "UPDATE", data: { user: auth.user } });
      effect();
    }
  }, [auth.user, auth.isAuthenticated]);

  return (
    <ControllerContext.Provider
      value={{
        ...state,
        updateController,
        request,
      }}
    >
      {children}
    </ControllerContext.Provider>
  );
};
