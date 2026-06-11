/** Routes where identity/IAM UI is shown (banner, admin pages). */
export const IAM_ROUTE_PREFIXES = [
  "/account",
  "/access-control/users",
  "/access-control/groups",
] as const;

export function isIamRoute(pathname: string): boolean {
  return IAM_ROUTE_PREFIXES.some(
    (prefix) =>
      pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
