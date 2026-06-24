import React, { useEffect, useMemo, useState } from "react";
import CustomLeaflet from "@/components/ui/CustomLeaflet";
import CustomSelect from "@/components/ui/CustomSelect";
import { useData, useController } from "@/app/providers";
import AgentSlideOverPanel from "@/features/agents/AgentSlideOverPanel";
import { resolveAgentMarkerColor } from "@/lib/platformReconcile";

interface CustomLeafletProps {
  collapsed: boolean;
}

const DEFAULT_MAP_CENTER: [number, number] = [39.9255, 32.8663];
const DEFAULT_MAP_ZOOM = 3;
const CONTROLLER_LOCATION_ZOOM = 6;

function resolveMapCenter(location: {
  lat?: string | number;
  lon?: string | number;
} | null): [number, number] {
  const lat = Number.parseFloat(String(location?.lat ?? ""));
  const lon = Number.parseFloat(String(location?.lon ?? ""));
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    return [lat, lon];
  }
  return DEFAULT_MAP_CENTER;
}

const Map: React.FC<CustomLeafletProps> = ({ collapsed }) => {
  const { data } = useData();
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { location } = useController();
  const mapCenter = useMemo(() => resolveMapCenter(location), [location]);
  const mapFallbackZoom = useMemo(() => {
    const lat = Number.parseFloat(String(location?.lat ?? ""));
    const lon = Number.parseFloat(String(location?.lon ?? ""));
    return Number.isFinite(lat) && Number.isFinite(lon)
      ? CONTROLLER_LOCATION_ZOOM
      : DEFAULT_MAP_ZOOM;
  }, [location]);
  const [selectedAgentItem, setSelectedAgentItem] = useState<any>(null);

  const markers = useMemo(() => {
    if (!data?.reducedAgents?.byName) {
      return [];
    }
    return Object.values(data.reducedAgents.byName)
      .filter((agent: any) => agent.latitude && agent.longitude)
      .map((agent: any) => ({
        id: agent.uuid,
        position: [agent.latitude, agent.longitude] as [number, number],
        color: resolveAgentMarkerColor(agent),
        label: agent.name,
        description: agent.description,
        ip: agent.ipAddress,
        daemonStatus: agent.daemonStatus,
        createdAt: agent.createdAt,
      }));
  }, [data?.reducedAgents?.byName]);

  const selectOptions = markers.map((m) => ({
    value: m.id,
    label: m.label,
  }));

  useEffect(() => {
    if (selectedAgentItem) {
      const selectedAgent = data.reducedAgents.byUUID[selectedAgentItem];
      setSelectedNode(selectedAgent);
      setIsOpen(true);
    } else {
      setSelectedNode(null);
      setIsOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgentItem]);

  const handleButtonClick = (marker: any) => {
    if (marker) {
      const selectedAgents = data.reducedAgents.byUUID[marker.id];
      setSelectedNode(selectedAgents);
      setIsOpen(true);
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-grow relative">
        <CustomLeaflet
          markers={markers}
          center={mapCenter}
          zoom={DEFAULT_MAP_ZOOM}
          fallbackZoom={mapFallbackZoom}
          onMarkerAction={handleButtonClick}
          collapsed={collapsed}
          selectedMarkerId={selectedNode?.uuid || undefined}
        />
        <CustomSelect
          options={selectOptions}
          setSelected={setSelectedAgentItem}
          isClearable
          placeholder="Select an agent..."
          className="!absolute top-3 left-16 w-[250px] z-[50] bg-white rounded shadow"
        />
      </div>

      <AgentSlideOverPanel
        open={isOpen}
        onClose={() => setIsOpen(false)}
        selectedNode={selectedNode}
        onSelectedNodeChange={setSelectedNode}
      />
    </div>
  );
};

export default Map;
