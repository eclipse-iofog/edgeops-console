import {
  dedupeInFlight,
  getInFlightDedupeKey,
} from "@/lib/http/inFlightDedupe";

/* eslint-disable import/no-anonymous-default-export */
const deleteAgent = (request) => async (agent) => {
  return request("/api/v3/iofog/" + agent.uuid, { method: "DELETE" });
};

const listAgents = (request) => async () =>
  dedupeInFlight(getInFlightDedupeKey("GET", "/api/v3/iofog-list"), async () => {
    const agentsResponse = await request("/api/v3/iofog-list");
    if (!agentsResponse.ok) {
      throw new Error({ message: agentsResponse.statusText });
    }
    return (await agentsResponse.json()).fogs;
  });

export default {
  deleteAgent,
  listAgents,
};
