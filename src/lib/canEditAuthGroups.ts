/** Matches system roles that can PATCH auth groups (admin, sre). */
export function canEditAuthGroups(groups: string[] = []): boolean {
  return groups.includes("admin") || groups.includes("sre");
}
