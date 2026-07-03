const listClusterControllers = (request) => async () => {
  const response = await request("/api/v3/cluster/controllers");
  if (!response?.ok) {
    return null;
  }
  return response.json();
};

export default {
  listClusterControllers,
};
