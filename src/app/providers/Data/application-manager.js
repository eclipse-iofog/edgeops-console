import {
  dedupeInFlight,
  getInFlightDedupeKey,
} from "@/lib/http/inFlightDedupe";

/* eslint-disable import/no-anonymous-default-export */
const deleteApplication = (request) => async (app) => {
  return request("/api/v3/application/" + app.name, { method: "DELETE" });
};

const listApplications = (request) => async () =>
  dedupeInFlight(getInFlightDedupeKey("GET", "/api/v3/application"), async () => {
    const agentsResponse = await request("/api/v3/application");
    if (!agentsResponse.ok) {
      throw new Error({ message: agentsResponse.statusText });
    }
    return (await agentsResponse.json()).applications;
  });

const listSystemApplications = (request) => async () =>
  dedupeInFlight(
    getInFlightDedupeKey("GET", "/api/v3/application/system"),
    async () => {
      const agentsResponse = await request("/api/v3/application/system");
      if (!agentsResponse.ok) {
        throw new Error({ message: agentsResponse.statusText });
      }
      return (await agentsResponse.json()).applications;
    },
  );

/**
 * Lists applications with microservices populated (same shape as Data provider).
 * Used by Data provider and by Microservices slideover refresh.
 */
const listApplicationsWithMicroservices = (request) => async () =>
  dedupeInFlight("listApplicationsWithMicroservices", async () => {
    const applications = await listApplications(request)();
    for (const application of applications) {
      const path = `/api/v3/microservices?application=${application.name}`;
      const microservicesResponse = await dedupeInFlight(
        getInFlightDedupeKey("GET", path),
        () => request(path),
      );
      if (!microservicesResponse?.ok) {
        throw new Error({
          message:
            microservicesResponse?.statusText || "Failed to fetch microservices",
        });
      }
      const { microservices } = await microservicesResponse.json();
      application.microservices = microservices || [];
    }
    return applications;
  });

/**
 * Lists system applications with microservices populated (same shape as Data provider).
 * Used by Data provider and by SystemMicroservices slideover refresh.
 */
const listSystemApplicationsWithMicroservices = (request) => async () =>
  dedupeInFlight("listSystemApplicationsWithMicroservices", async () => {
    const systemApplications = await listSystemApplications(request)();
    for (const application of systemApplications) {
      const path = `/api/v3/microservices/system?application=${application.name}`;
      const microservicesResponse = await dedupeInFlight(
        getInFlightDedupeKey("GET", path),
        () => request(path),
      );
      if (!microservicesResponse?.ok) {
        throw new Error({
          message:
            microservicesResponse?.statusText ||
            "Failed to fetch system microservices",
        });
      }
      const { microservices } = await microservicesResponse.json();
      application.microservices = microservices || [];
    }
    return systemApplications;
  });

const toggleApplication = (request) => async (app) => {
  const agentsResponse = await request(`/api/v3/application/${app.name}`, {
    method: "PATCH",
    body: {
      isActivated: !app.isActivated,
    },
  });
  if (!agentsResponse.ok) {
    throw new Error({ message: agentsResponse.statusText });
  }
  return agentsResponse;
};

export default {
  deleteApplication,
  listApplications,
  listApplicationsWithMicroservices,
  listSystemApplications,
  listSystemApplicationsWithMicroservices,
  toggleApplication,
};
