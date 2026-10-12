export const HEADLESS_PORTAL_ID = "headlessui-portal-root";
export const SCALAR_APP_CLASS = "scalar-app";

function stripScalarApp(root) {
  if (root?.classList.contains(SCALAR_APP_CLASS)) {
    root.classList.remove(SCALAR_APP_CLASS);
  }
}

/**
 * Scalar tags the shared Headless UI portal with scalar-app, and its
 * unlayered `.scalar-app .flex` rule then overrides console slideover grids.
 */
export function watchHeadlessPortal(doc) {
  let portalObserver = null;
  let observedRoot = null;

  const attachPortal = () => {
    const root = doc.getElementById(HEADLESS_PORTAL_ID);
    if (!root) {
      return;
    }
    stripScalarApp(root);
    if (observedRoot === root) {
      return;
    }
    portalObserver?.disconnect();
    observedRoot = root;
    portalObserver = new MutationObserver(() => stripScalarApp(root));
    portalObserver.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });
  };

  attachPortal();
  const bodyObserver = new MutationObserver(attachPortal);
  if (doc.body) {
    bodyObserver.observe(doc.body, { childList: true });
  }

  return () => {
    bodyObserver.disconnect();
    portalObserver?.disconnect();
    stripScalarApp(doc.getElementById(HEADLESS_PORTAL_ID));
  };
}

let releaseSessionWatch = null;

/**
 * Scalar's own portal observer stays after the API tab closes and tags the
 * next dialog root. This watch stays up for the rest of the session too.
 */
export function retainHeadlessPortalWatch(doc) {
  if (releaseSessionWatch) {
    stripScalarApp(doc.getElementById(HEADLESS_PORTAL_ID));
    return;
  }
  releaseSessionWatch = watchHeadlessPortal(doc);
}

export function resetHeadlessPortalWatchForTests() {
  releaseSessionWatch?.();
  releaseSessionWatch = null;
}
