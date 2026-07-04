import {
  dedupeInFlight,
  getInFlightDedupeKey,
} from "@/lib/http/inFlightDedupe";

const listClusterControllers = (request) => async () =>
  dedupeInFlight(
    getInFlightDedupeKey("GET", "/api/v3/cluster/controllers"),
    async () => {
      const response = await request("/api/v3/cluster/controllers");
      if (!response?.ok) {
        return null;
      }
      return response.json();
    },
  );

export default {
  listClusterControllers,
};
