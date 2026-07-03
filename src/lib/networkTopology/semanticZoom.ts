export type SemanticZoomLevel = "overview" | "standard" | "detail";

const OVERVIEW_THRESHOLD = 0.4;
const DETAIL_THRESHOLD = 0.75;

export function getSemanticZoomLevel(zoom: number): SemanticZoomLevel {
  if (zoom < OVERVIEW_THRESHOLD) {
    return "overview";
  }
  if (zoom < DETAIL_THRESHOLD) {
    return "standard";
  }
  return "detail";
}

export const SEMANTIC_ZOOM_LABELS: Record<SemanticZoomLevel, string> = {
  overview: "Overview",
  standard: "Standard",
  detail: "Detail",
};
