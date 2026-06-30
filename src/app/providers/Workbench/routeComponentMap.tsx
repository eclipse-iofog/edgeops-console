import React from "react";
import { Navigate, Route } from "react-router-dom";

import ForcePasswordChangePage from "@/auth/ForcePasswordChangePage";
import Dashboard from "@/Dashboard";
import SwaggerDoc from "@/swagger/SwaggerDoc";
import NodesList from "@/Nodes/List";
import MicroservicesList from "@/Workloads/Microservices";
import SystemMicroservicesList from "@/Workloads/SystemMicroservices";
import ApplicationList from "@/Workloads/Applications";
import SystemApplicationList from "@/Workloads/SystemApplications";
import AppTemplates from "@/features/cluster-config/appTemplates/index";
import CatalogMicroservices from "@/features/cluster-config/catalogMicroservices";
import Registries from "@/features/cluster-config/registries";
import ConfigMaps from "@/features/cluster-config/configMaps";
import VolumeMounts from "@/features/cluster-config/volumeMounts";
import Secrets from "@/features/cluster-config/secret";
import Certificates from "@/features/cluster-config/certificates";
import Services from "@/features/cluster-config/services";
import PollingSettings from "@/features/cluster-config/pollingSettings";
import Map from "@/features/topology/Map/Map";
import Events from "@/Events";
import Roles from "@/AccessControl/roles";
import RoleBindings from "@/AccessControl/rolebindings";
import ServiceAccounts from "@/AccessControl/serviceaccounts";
import NatsAccountRules from "@/AccessControl/natsAccountRules";
import NatsUserRules from "@/AccessControl/natsUserRules";
import Operators from "@/MessageBus/Operators";
import Accounts from "@/MessageBus/Accounts";
import Users from "@/MessageBus/Users";
import IdentityUsersList from "@/Identity/Users";
import IdentityGroupsList from "@/Identity/Groups";
import IdentityAccountPage from "@/Identity/Account";

type RouteMapOptions = {
  collapsed: boolean;
};

/** Route elements shared by AppRoutes and WorkbenchPanelStack. */
export function createWorkbenchRouteElements({
  collapsed,
}: RouteMapOptions): React.ReactNode {
  return (
    <>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" Component={Dashboard} />
      <Route
        path="/account/force-password-change"
        Component={ForcePasswordChangePage}
      />
      <Route path="/account" Component={IdentityAccountPage} />

      <Route path="/api" Component={SwaggerDoc} />
      <Route path="/nodes/list" Component={NodesList} />
      <Route
        path="/Workloads/MicroservicesList"
        Component={MicroservicesList}
      />
      <Route
        path="/Workloads/SystemMicroservicesList"
        Component={SystemMicroservicesList}
      />
      <Route path="/Workloads/ApplicationList" Component={ApplicationList} />
      <Route
        path="/Workloads/SystemApplicationList"
        Component={SystemApplicationList}
      />
      <Route path="/nodes/Map" element={<Map collapsed={collapsed} />} />
      <Route path="/config/AppTemplates" Component={AppTemplates} />
      <Route
        path="/config/CatalogMicroservices"
        Component={CatalogMicroservices}
      />
      <Route path="/config/Registries" Component={Registries} />
      <Route path="/config/ConfigMaps" Component={ConfigMaps} />
      <Route path="/config/secret" Component={Secrets} />
      <Route path="/config/VolumeMounts" Component={VolumeMounts} />
      <Route path="/config/certificates" Component={Certificates} />
      <Route path="/config/services" Component={Services} />
      <Route path="/config/pollingSettings" Component={PollingSettings} />
      <Route path="/events" Component={Events} />
      <Route path="/access-control/roles" Component={Roles} />
      <Route path="/access-control/rolebindings" Component={RoleBindings} />
      <Route
        path="/access-control/serviceaccounts"
        Component={ServiceAccounts}
      />
      <Route
        path="/access-control/nats-account-rules"
        Component={NatsAccountRules}
      />
      <Route
        path="/access-control/nats-user-rules"
        Component={NatsUserRules}
      />
      <Route path="/access-control/users" Component={IdentityUsersList} />
      <Route path="/access-control/groups" Component={IdentityGroupsList} />
      <Route path="/messagebus/operators" Component={Operators} />
      <Route path="/messagebus/accounts" Component={Accounts} />
      <Route path="/messagebus/users" Component={Users} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </>
  );
}
