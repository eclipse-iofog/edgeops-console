/* eslint-disable import/no-anonymous-default-export */
const deleteAgent = (request) => async (agent) => {
  return request("/api/v3/iofog/" + agent.uuid, { method: "DELETE" });
};

const listAgents = (request) => async () => {
  const agentsResponse = await request("/api/v3/iofog-list");
  if (!agentsResponse.ok) {
    throw new Error({ message: agentsResponse.statusText });
  }
  return (await agentsResponse.json()).fogs;
};

export default {
  deleteAgent,
  listAgents,
};
