import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/setupTests.js"],
      env: {
        VITE_DISTRIBUTION: "datasance",
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(rootDir, "src"),
        "xterm/css/xterm.css": path.resolve(rootDir, "src/__mocks__/empty.js"),
        "xterm-addon-web-links": path.resolve(rootDir, "src/__mocks__/empty.js"),
        xterm: path.resolve(rootDir, "src/__mocks__/xterm.js"),
        "xterm-addon-fit": path.resolve(rootDir, "src/__mocks__/xterm-addon-fit.js"),
        "swagger-ui-react": path.resolve(rootDir, "src/__mocks__/swagger-ui-react.js"),
        "react-router-dom": path.resolve(
          rootDir,
          "node_modules/react-router-dom/dist/index.js",
        ),
        "react-router": path.resolve(
          rootDir,
          "node_modules/react-router/dist/development/index.js",
        ),
        "react-router/dom": path.resolve(
          rootDir,
          "node_modules/react-router/dist/development/dom-export.js",
        ),
      },
    },
    server: {
      deps: {
        inline: [
          "pretty-bytes",
          "react-router-dom",
          "react-router",
          "react-leaflet",
          "leaflet",
          "lucide-react",
          "@react-leaflet",
        ],
      },
    },
  }),
);
