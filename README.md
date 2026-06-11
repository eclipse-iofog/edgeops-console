# EdgeOps Console

Cluster management UI for Eclipse ioFog and Datasance PoT. The app is a static React SPA built with Vite; the Controller embeds the production `build/` output and injects runtime configuration via `window.controllerConfig`.

## Requirements

- [Node.js](https://nodejs.org/) **24.x** LTS (`>= 24.0.0`)
- [npm](https://www.npmjs.com/)

Use [nvm](https://github.com/nvm-sh/nvm):

```sh
nvm use 24   # reads .nvmrc
```

## Install

```sh
npm install --legacy-peer-deps
```

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run start-dev` | Dev server (port 3000). Copies `config/controller-config.dev.js` → `public/controller-config.js`, then runs Vite. |
| `npm run build` | Production build to `build/` (default flavor: **datasance**). Copies `config/controller-config.prod.js` first. |
| `npm run build:datasance` | Same as `build` with `VITE_DISTRIBUTION=datasance`. |
| `npm run build:iofog` | Build with `VITE_DISTRIBUTION=iofog`. |
| `npm run preview` | Serve the last `build/` locally (default port 4173). Run a build first. |
| `npm test` | Vitest unit tests |
| `npm run lint` | ESLint on `src/` |

### Local development

```sh
nvm use 24
npm run start-dev
```

Open [http://localhost:3000](http://localhost:3000). The login page loads at `/#/login`. Dev config is served from `/controller-config.js`.

### Local production preview

```sh
nvm use 24
npm run build
npm run preview
```

Or serve `build/` with any static file server (e.g. `npx serve build`).

## Build flavors (`VITE_DISTRIBUTION`)

Two distribution builds share one codebase. The flavor is fixed at **build time** via `VITE_DISTRIBUTION` (no runtime toggle in production).

| Flavor | Command | Favicon | Login / layout logo |
|--------|---------|---------|---------------------|
| `datasance` (default) | `npm run build:datasance` | `public/branding/datasance/favicon.ico` | `src/assets/branding/datasance/wordmark.svg` |
| `iofog` | `npm run build:iofog` | `public/branding/iofog/favicon.ico` | `src/assets/branding/iofog/logomark.svg` |

Branding is centralized in `src/config/distribution.ts`. Vite’s `transformIndexHtml` hook swaps favicon and manifest href per flavor (`/branding/datasance/…` vs `/branding/iofog/…`).

### YAML `apiVersion` policy

Constants live in `src/lib/constants/constants.js`:

| Constant | `datasance` build | `iofog` build |
|----------|-------------------|---------------|
| `CANONICAL_DISPLAY_CONTROLLER_API_VERSION` | `datasance.com/v3` | `iofog.org/v3` |
| `DEFAULT_CONTROLLER_API_VERSION` | same as canonical | same as canonical |
| `ALLOWED_CONTROLLER_API_VERSIONS` | **both** `datasance.com/v3` and `iofog.org/v3` | **both** groups |

- **Export / display / newly generated YAML** uses the flavor’s canonical `apiVersion`.
- **Import / upload** accepts either API group (`isAllowedControllerApiVersion()`).

## Controller embed

Production output is the static **`build/`** directory. The Controller:

1. Serves files from embedded `build/` (no npm install of this package).
2. Injects `window.controllerConfig` at runtime before the app bundle loads.

### Config contract (Plan 6.1)

The Viewer reads only:

- `publicUrl` — scheme + host + port for the Controller API
- `auth.*` — login, refresh, logout, profile, OAuth, and interaction URLs; `mode` (`embedded` | `external`)
- `controlPlane` (optional)

The Viewer **does not** read `oidcIssuerUrl`, `oidcClientId`, `keycloak*`, or other legacy v3.7 keys.

Example dev config (`config/controller-config.dev.js`):

```javascript
window.controllerConfig = {
  apiPort: 51121,
  publicUrl: 'http://localhost:51121',
  consoleUrl: 'http://localhost:3000',
  auth: {
    mode: 'embedded',
    loginUrl: '/api/v3/user/login',
    refreshUrl: '/api/v3/user/refresh',
    logoutUrl: '/api/v3/user/logout',
    profileUrl: '/api/v3/user/profile',
    changePasswordUrl: '/api/v3/user/change-password',
    oauthAuthorizeUrl: '/api/v3/user/oauth/authorize',
    oauthInteractionUrl: '/login/oauth',
  },
}
```

Dev and build scripts copy the matching template from `config/` to `public/controller-config.js`. Root `index.html` loads it before `src/main.tsx`.

### Release packaging

`package.sh` builds the app and produces a tarball for Controller vendors:

```sh
VITE_DISTRIBUTION=datasance sh package.sh   # default
VITE_DISTRIBUTION=iofog sh package.sh
```

Artifact: `edgeops-console_<flavor>_<version>.tar.gz` containing `build/`.

## Source layout

Path alias **`@/`** → `src/` (Vite, Vitest, `tsconfig.json`).

```
src/
├── main.tsx                 # app entry
├── App.tsx
├── app/
│   ├── routes.tsx           # route table
│   └── providers/           # React context (Config, Data, Controller, Terminal, …)
├── components/
│   ├── layout/              # AppLayout, sidebar, IAM banner
│   ├── ui/                  # tables, modals, forms
│   ├── terminal/            # exec session, log viewer drawers
│   └── yaml/                # YAML editor / deploy tabs
├── features/
│   ├── cluster-config/      # registries, secrets, config maps, …
│   └── topology/            # cluster map (was ECNViewer)
├── lib/
│   ├── yaml/                # YAML parsers and generators
│   ├── constants/           # apiVersion policy, status colors
│   ├── formatting/
│   └── storage/             # localStorage key migration
├── auth/                    # login, OAuth interaction, token store
├── AccessControl/           # RBAC, service accounts, NATS rules
├── Dashboard/
├── Workloads/               # applications, microservices
├── Nodes/                   # agents
├── Identity/                # users, groups, account
├── MessageBus/              # NATS accounts and users
├── Events/
├── config/
│   └── distribution.ts      # VITE_DISTRIBUTION branding
├── assets/branding/         # per-flavor wordmarks (bundled)
└── styles/                  # Tailwind entry

config/                      # controller-config.dev.js, controller-config.prod.js
public/branding/             # per-flavor favicon + manifest (static)
index.html                   # Vite HTML shell; loads /controller-config.js
```

Domain modules (`AccessControl`, `Workloads`, etc.) remain at `src/` root; shared UI and YAML tooling live under `components/` and `lib/`.

## Verification gates

```sh
nvm use 24

npm run lint
npm test
npm run build:datasance
npm run build:iofog
npm audit --omit=dev
```

## License

EPL-2.0 — see [LICENSE](LICENSE).
