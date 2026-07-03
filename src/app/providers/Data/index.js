import React from "react";
import { useController } from "../ControllerProvider";
import { find, groupBy, get } from "lodash";
import { useAuth } from "../../../auth";
import AgentManager from "./agent-manager";
import ApplicationManager from "./application-manager";
import ClusterControllerManager from "./cluster-controller-manager";

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
  clusterControllers: null,
};

export const actions = {
  UPDATE: "UPDATE",
  LIGHT_UPDATE: "LIGHT_UPDATE",
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
    clusterControllers:
      newController.clusterControllers !== undefined
        ? newController.clusterControllers
        : state.clusterControllers,
  };
};

const reducer = (state, action) => {
  switch (action.type) {
    case actions.UPDATE:
      return updateData(state, action.data);
    case actions.LIGHT_UPDATE:
      return updateData(state, {
        ...action.data,
        microservices: state.controller?.microservices ?? [],
      });
    default:
      return state;
  }
};

export const DataProvider = ({ children }) => {
  const { request } = useController();
  const [state, dispatch] = React.useReducer(reducer, initState);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const { isAuthenticated } = useAuth();

  const refreshData = React.useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    let agents = [];
    try {
      agents = await AgentManager.listAgents(request)();
    } catch (e) {
      setError(e);
      return;
    }

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

    let clusterControllers = null;
    try {
      clusterControllers =
        await ClusterControllerManager.listClusterControllers(request)();
    } catch {
      clusterControllers = null;
    }

    setError(false);
    dispatch({
      type: actions.UPDATE,
      data: {
        agents,
        applications,
        microservices,
        systemApplications,
        clusterControllers,
      },
    });
    setLoading(false);
  }, [isAuthenticated, request]);

  const refreshRuntimeLight = React.useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    let agents = [];
    try {
      agents = await AgentManager.listAgents(request)();
    } catch (e) {
      setError(e);
      return;
    }

    let applications = [];
    try {
      applications = await ApplicationManager.listApplications(request)();
    } catch (e) {
      setError(e);
      return;
    }

    let systemApplications = [];
    try {
      systemApplications =
        await ApplicationManager.listSystemApplications(request)();
    } catch (e) {
      setError(e);
      return;
    }

    setError(false);
    dispatch({
      type: actions.LIGHT_UPDATE,
      data: { agents, applications, systemApplications },
    });
    setLoading(false);
  }, [isAuthenticated, request]);

  React.useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    }
  }, [isAuthenticated, refreshData]);

  return (
    <DataContext.Provider
      value={{
        data: state,
        error,
        loading,
        refreshData,
        refreshRuntimeLight,
        deleteAgent: AgentManager.deleteAgent(request),
        deleteApplication: ApplicationManager.deleteApplication(request),
        toggleApplication: ApplicationManager.toggleApplication(request),
      }}
    >
      {children}
    </DataContext.Provider>
  );
};
