import datasanceLogomark from "../assets/branding/datasance/wordmark.svg";
import iofogLogomark from "../assets/branding/iofog/logomark.svg";
import iofogWordmark from "../assets/branding/iofog/logomark.svg";

export type Distribution = "datasance" | "iofog";

export const DISTRIBUTION: Distribution =
  import.meta.env.VITE_DISTRIBUTION === "iofog" ? "iofog" : "datasance";

export const sidebarLogomark =
  DISTRIBUTION === "iofog" ? iofogLogomark : datasanceLogomark;

export const loginLogomark =
  DISTRIBUTION === "iofog" ? iofogWordmark : datasanceLogomark;

export const LOGO_ALT_TEXT =
  DISTRIBUTION === "iofog" ? "ioFog" : "Datasance";

export const FAVICON_HREF =
  DISTRIBUTION === "iofog"
    ? "/branding/iofog/favicon.ico"
    : "/branding/datasance/favicon.ico";

export const MANIFEST_HREF =
  DISTRIBUTION === "iofog"
    ? "/branding/iofog/manifest.json"
    : "/branding/datasance/manifest.json";

export const DOCS_URL =
  DISTRIBUTION === "iofog"
    ? "https://iofog.org/docs"
    : "https://docs.datasance.com";

export const GITHUB_URL =
  DISTRIBUTION === "iofog"
    ? "https://github.com/eclipse-iofog"
    : "https://github.com/Datasance";

export const LICENSE_URL =
  DISTRIBUTION === "iofog"
    ? "https://www.eclipse.org/legal/epl-2.0/"
    : "https://datasance.com/EULA.pdf";
