import React from "react";
import { useController } from "../ControllerProvider";
import { find, groupBy, get } from "lodash";
import useRecursiveTimeout from "../../../hooks/useInterval";
import { useAuth } from "../../../auth";
import {
  usePollingConfig,
  POLLING_CONFIG_STORAGE_KEY,
} from "../PollingConfig/PollingConfigProvider";

import AgentManager from "./agent-manager";
import ApplicationManager from "./application-manager";

export const DataContext = React.createContext();
export const useData = () => React.useContext(DataContext);

const initState = {
  controller: {
    info: {
      location: {},
      user: {},
    },
    agents: [],
    microservices: [],
    applications: [],
  },
  activeAgents: [],
  activeMsvcs: [],
  msvcsPerAgent: [],
  applications: [],
  systemApplications: [],
};

export const actions = {
  UPDATE: "UPDATE",
  SET_AGENT: "SET_AGENT",
};

const updateData = (state, newController) => {
  if (!newController) {
    return state;
  }
  newController.agents.sort((a, b) => {
    const statusOrder = {
      RUNNING: 1,
      UNKOWN: 2,
    };
    if (a.daemonStatus === b.daemonStatus) {
      return a.name.localeCompare(b.name);
    } else {
      return (
        (statusOrder[a.daemonStatus] || 3) - (statusOrder[b.daemonStatus] || 3)
      );
    }
  });
  newController.applications.sort((a, b) => {
    if (a.isActivated === b.isActivated) {
      return a.name.localeCompare(b.name);
    }
    return (a.isActivated ? 1 : 2) - (b.isActivated ? 1 : 2);
  });
  const reducedAgents = newController.agents.reduce(
    (acc, a) => {
      acc.byUUID[a.uuid] = a;
      acc.byName[a.name] = a;
      return acc;
    },
    {
      byUUID: {},
      byName: {},
    },
  );

  let mergedApplications = [
    ...newController.applications,
    ...newController?.systemApplications,
  ];
  const reducedApplications = mergedApplications.reduce(
    (acc, a) => {
      acc.byId[a.id] = a;
      acc.byName[a.name] = a;
      return acc;
    },
    {
      byId: {},
      byName: {},
    },
  );
  const activeApplications = newController.applications.filter(
    (app) => app.isActivated === true,
  );
  const activeAgents = newController.agents.filter(
    (a) => a.daemonStatus === "RUNNING",
  );
  const msvcsPerAgent = groupBy(
    newController.microservices.map((m) => ({
      ...m,
      applicationActive: !!find(
        activeApplications,
        (app) => m.application === app.name,
      ),
    })),
    "iofogUuid",
  );
  const activeMsvcs = activeAgents.reduce(
    (res, a) =>
      res.concat(
        get(msvcsPerAgent, a.uuid, []).filter((m) => m.applicationActive) || [],
      ),
    [],
  );

  if (!state.agent || !state.agent.uuid) {
    state.agent = newController.agents[0] || {};
  }

  const systemApplications = newController?.systemApplications;

  return {
    ...state,
    controller: newController,
    applications: newController.applications,
    activeApplications,
    activeAgents,
    activeMsvcs,
    msvcsPerAgent,
    reducedAgents,
    reducedApplications,
    systemApplications,
  };
};

const reducer = (state, action) => {
  switch (action.type) {
    case actions.UPDATE:
      return updateData(state, action.data);
    default:
      return state;
  }
};

export const DataProvider = ({ children }) => {
  const { request, refresh } = useController();
  const [state, dispatch] = React.useReducer(reducer, initState);
  const [loading, setLoading] = React.useState(true);
  const { getPollingInterval } = usePollingConfig();
  const [error, setError] = React.useState(false);
  const { isAuthenticated } = useAuth();

  // Get polling interval from config, fallback to controller config or default
  const [timeout, setTimeout] = React.useState(() => {
    try {
      const configInterval = getPollingInterval();
      if (configInterval) return configInterval;
    } catch (e) {
      // Fallback if provider not available
    }
    return +refresh || 3000;
  });

  // Listen for localStorage changes to update polling interval dynamically
  React.useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === POLLING_CONFIG_STORAGE_KEY && e.newValue) {
        try {
          const newConfig = JSON.parse(e.newValue);
          if (newConfig.mainPollingInterval) {
            setTimeout(newConfig.mainPollingInterval);
          }
        } catch (error) {
          console.error("Error parsing polling config change:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Poll for changes (since same-tab localStorage changes don't trigger storage event)
    const intervalId = setInterval(() => {
      try {
        const configInterval = getPollingInterval();
        if (configInterval && configInterval !== timeout) {
          setTimeout(configInterval);
        }
      } catch (e) {
        // Fallback if provider not available
      }
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(intervalId);
    };
  }, [getPollingInterval, timeout]);

  const update = async () => {
    if (isAuthenticated) {
      // List fogs
      let agents = [];
      try {
        agents = await AgentManager.listAgents(request)();
      } catch (e) {
        setError(e);
        return;
      }

      // List applications with microservices (same as AgentManager pattern)
      let applications = [];
      try {
        applications =
          await ApplicationManager.listApplicationsWithMicroservices(request)();
      } catch (e) {
        setError(e);
        return;
      }

      let systemApplications = [];
      try {
        systemApplications =
          await ApplicationManager.listSystemApplicationsWithMicroservices(
            request,
          )();
      } catch (e) {
        setError(e);
        return;
      }

      const microservices = applications.flatMap(
        (app) => app.microservices || [],
      );
      if (error) {
        setError(false);
      }
      dispatch({
        type: actions.UPDATE,
        data: { agents, applications, microservices, systemApplications },
      });
      if (loading) {
        setLoading(false);
      }
    }
  };

  useRecursiveTimeout(update, timeout);

  return (
    <DataContext.Provider
      value={{
        data: state,
        error,
        loading,
        refreshData: update,
        deleteAgent: AgentManager.deleteAgent(request),
        deleteApplication: ApplicationManager.deleteApplication(request),
        toggleApplication: ApplicationManager.toggleApplication(request),
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
