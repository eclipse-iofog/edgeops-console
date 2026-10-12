import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ApiReferenceReact } from "@scalar/api-reference-react";
import "@scalar/api-reference-react/style.css";
import { useLocation } from "react-router-dom";
import YAML from "js-yaml";

import { retainHeadlessPortalWatch } from "./headlessPortal";
import {
  sectionSlugFromDocsHref,
  shouldIgnoreHistoryUpdate,
} from "./consoleUrlLock";
import "./api-reference-page.css";

const DEFAULT_BASE_URL = "http://localhost:51121/api/v3";

function readApiQuery(search) {
  const fromSearch = new URLSearchParams(search);
  if (fromSearch.has("authToken") || fromSearch.has("baseUrl")) {
    return {
      authToken: fromSearch.get("authToken") || "",
      baseUrl: fromSearch.get("baseUrl") || DEFAULT_BASE_URL,
    };
  }

  const hash = window.location.hash;
  const queryIndex = hash.indexOf("?");
  const fromHash = new URLSearchParams(
    queryIndex === -1 ? "" : hash.slice(queryIndex + 1),
  );

  return {
    authToken: fromHash.get("authToken") || "",
    baseUrl: fromHash.get("baseUrl") || DEFAULT_BASE_URL,
  };
}

function findDocsSection(page, slug) {
  if (!page || !slug) {
    return null;
  }

  const rendered = page.querySelector(".references-rendered") || page;
  const nodes = rendered.querySelectorAll("[id]");
  for (const node of nodes) {
    if (node.id === slug || node.id.endsWith(`/${slug}`)) {
      return node;
    }
  }

  return null;
}

function scrollDocsSection(page, slug) {
  const attempt = (remaining) => {
    const target = findDocsSection(page, slug);
    if (target) {
      target.scrollIntoView({ block: "start" });
      return;
    }
    if (remaining > 0) {
      window.setTimeout(() => attempt(remaining - 1), 50);
    }
  };

  attempt(20);
}

function createAuthorizedFetch(authToken, baseUrl) {
  return (input, init) => {
    const request = new Request(input, init);
    if (
      authToken &&
      baseUrl &&
      request.url.startsWith(baseUrl) &&
      !request.headers.has("Authorization")
    ) {
      request.headers.set("Authorization", `Bearer ${authToken}`);
    }
    return fetch(request);
  };
}

const SwaggerDoc = () => {
  const location = useLocation();
  const pageRef = useRef(null);
  const lockedHrefRef = useRef(
    typeof window === "undefined" ? "" : window.location.href,
  );
  const [document, setDocument] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const { authToken, baseUrl } = readApiQuery(location.search);

  useLayoutEffect(() => {
    retainHeadlessPortalWatch(window.document);
  }, []);

  useLayoutEffect(() => {
    const lockedHref = lockedHrefRef.current;
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    const guard =
      (original) =>
      function guardedHistoryUpdate(state, title, url) {
        if (url != null && shouldIgnoreHistoryUpdate(url, lockedHref)) {
          return;
        }
        return original.call(this, state, title, url);
      };

    window.history.pushState = guard(originalPushState);
    window.history.replaceState = guard(originalReplaceState);

    if (window.location.href !== lockedHref) {
      originalReplaceState.call(window.history, window.history.state, "", lockedHref);
    }

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  useEffect(() => {
    const fetchSwaggerDoc = async () => {
      try {
        const response = await fetch("/swagger.yaml");
        const yamlText = await response.text();
        const spec = YAML.load(yamlText);
        if (!spec.components) spec.components = {};
        if (!spec.components.securitySchemes) spec.components.securitySchemes = {};
        spec.components.securitySchemes.authToken = {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        };
        spec.servers = [{ url: baseUrl }];
        spec.security = authToken ? [{ authToken: [] }] : [];
        setDocument(spec);
      } catch (error) {
        console.error("API reference failed to load:", error);
        setLoadError(true);
      }
    };

    fetchSwaggerDoc();
  }, [authToken, baseUrl]);

  const configuration = useMemo(() => {
    if (!document) {
      return null;
    }

    return {
      content: document,
      agent: { disabled: true },
      telemetry: false,
      withDefaultFonts: false,
      showDeveloperTools: "never",
      theme: "none",
      forceDarkModeState: "light",
      mcp: { disabled: true },
      modelsSectionLabel: "Payload Schemas",
      hideClientButton: true,
      persistAuth: false,
      customFetch: createAuthorizedFetch(authToken, baseUrl),
      authentication: authToken
        ? {
            preferredSecurityScheme: "authToken",
            securitySchemes: {
              authToken: {
                token: authToken,
              },
            },
          }
        : undefined,
    };
  }, [document, authToken, baseUrl]);

  useLayoutEffect(() => {
    const page = pageRef.current;
    if (!page) {
      return undefined;
    }

    const lockedHref = lockedHrefRef.current;
    const onClick = (event) => {
      const anchor = event.target.closest?.("a");
      if (!anchor || !page.contains(anchor)) {
        return;
      }
      if (!shouldIgnoreHistoryUpdate(anchor.href, lockedHref)) {
        return;
      }
      // Scalar ignores a click whose default is already cancelled, so this
      // runs on the way back up. If Scalar handled it, the operation is
      // already scrolling. Otherwise cancel the hash change and scroll here.
      if (event.defaultPrevented) {
        return;
      }
      event.preventDefault();
      const slug = sectionSlugFromDocsHref(anchor.href, lockedHref);
      if (slug) {
        scrollDocsSection(page, slug);
      }
    };

    page.addEventListener("click", onClick);
    return () => page.removeEventListener("click", onClick);
  }, [configuration]);

  if (loadError) {
    return <div>API reference failed to load.</div>;
  }

  if (!configuration) {
    return <div>Loading...</div>;
  }

  return (
    <div ref={pageRef} className="api-reference-page flex-1 min-h-0 w-full overflow-hidden">
      <ApiReferenceReact key={`${baseUrl}:${authToken}`} configuration={configuration} />
    </div>
  );
};

export default SwaggerDoc;
