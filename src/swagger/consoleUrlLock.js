const SCALAR_HASH = /^#[a-z]/i;

/**
 * Scalar writes operation links into the URL. This console already uses the
 * hash for its own routes, so those writes have to be ignored.
 */
export function shouldIgnoreHistoryUpdate(nextHref, lockedHref) {
  if (nextHref == null || nextHref === "") {
    return false;
  }

  let next;
  try {
    next = new URL(String(nextHref), lockedHref);
  } catch {
    return false;
  }

  const locked = new URL(lockedHref);

  if (next.pathname !== locked.pathname) {
    return true;
  }

  const nextHash = next.hash;
  const lockedHash = locked.hash;

  if (nextHash === lockedHash) {
    return false;
  }

  if (SCALAR_HASH.test(nextHash)) {
    return true;
  }

  const lockedPath = lockedHash.split("?")[0];
  if (lockedPath && nextHash.startsWith(lockedPath)) {
    return true;
  }

  return false;
}

/** Section id carried by a docs link, without the console route or query. */
export function sectionSlugFromDocsHref(href, lockedHref) {
  if (href == null || href === "") {
    return "";
  }

  let url;
  try {
    url = new URL(String(href), lockedHref || "http://localhost/");
  } catch {
    return "";
  }

  const hash = decodeURIComponent(url.hash.replace(/^#/, ""));
  if (!hash || !lockedHref) {
    return hash;
  }

  let lockedHash = "";
  try {
    lockedHash = decodeURIComponent(new URL(lockedHref).hash.replace(/^#/, ""));
  } catch {
    return hash;
  }

  if (!lockedHash || hash === lockedHash) {
    return hash === lockedHash ? "" : hash;
  }

  if (hash.startsWith(`${lockedHash}/`)) {
    return hash.slice(lockedHash.length + 1);
  }

  const lockedPath = lockedHash.split("?")[0];
  if (lockedPath && hash.startsWith(`${lockedPath}/`)) {
    return hash.slice(lockedPath.length + 1);
  }

  if (lockedPath && hash.startsWith(`${lockedPath}?`)) {
    const lockedQuery = lockedHash.includes("?")
      ? lockedHash.slice(lockedHash.indexOf("?") + 1)
      : "";
    const nextQuery = hash.slice(lockedPath.length + 1);
    if (lockedQuery && nextQuery.startsWith(`${lockedQuery}/`)) {
      return nextQuery.slice(lockedQuery.length + 1);
    }
  }

  if (hash.startsWith("/")) {
    return "";
  }

  return hash;
}
