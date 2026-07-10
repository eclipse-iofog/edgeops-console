import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, transformWithEsbuild } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const appVersion = (
  JSON.parse(
    readFileSync(path.join(rootDir, "package.json"), "utf8"),
  ) as { version: string }
).version;

type Distribution = "datasance" | "iofog";

function resolveDistribution(): Distribution {
  return process.env.VITE_DISTRIBUTION === "iofog" ? "iofog" : "datasance";
}

function controllerConfigCacheBust() {
  return {
    name: "controller-config-cache-bust",
    transformIndexHtml(html: string) {
      return html.replace(
        'src="/controller-config.js"',
        `src="/controller-config.js?v=${appVersion}"`,
      );
    },
  };
}

function distributionBranding() {
  const distribution = resolveDistribution();
  const faviconHref =
    distribution === "iofog"
      ? "/branding/iofog/favicon.ico"
      : "/branding/datasance/favicon.ico";
  const manifestHref =
    distribution === "iofog"
      ? "/branding/iofog/manifest.json"
      : "/branding/datasance/manifest.json";

  return {
    name: "distribution-branding",
    transformIndexHtml(html: string) {
      return html
        .replace(
          'href="/branding/datasance/favicon.ico"',
          `href="${faviconHref}"`,
        )
        .replace(
          'href="/branding/datasance/manifest.json"',
          `href="${manifestHref}"`,
        );
    },
  };
}

function jsxInJs() {
  return {
    name: "jsx-in-js",
    enforce: "pre" as const,
    async transform(code: string, id: string) {
      if (!/\/src\/.*\.js$/.test(id)) {
        return null;
      }

      return transformWithEsbuild(code, id, {
        loader: "jsx",
        jsx: "automatic",
      });
    },
  };
}

export default defineConfig({
  plugins: [
    controllerConfigCacheBust(),
    distributionBranding(),
    jsxInJs(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  build: {
    outDir: "build",
  },
  server: {
    port: 3000,
  },
});
