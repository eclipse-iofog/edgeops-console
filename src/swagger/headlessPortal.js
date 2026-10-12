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
 * Keep that class off the portal for as long as the API page is mounted.
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
