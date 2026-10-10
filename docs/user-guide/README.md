# EdgeOps Console user guide

This guide describes what you see and what you can do in the EdgeOps Console. It is written for operators: every page, every list, every detail panel, and the YAML uploader.

The console is the cluster management UI for Eclipse ioFog and Datasance PoT. It is a browser application served by the Controller. You use it to watch compute nodes, deploy applications and microservices, manage catalogs and configuration, and open shells and logs.

Two builds share this interface. A Datasance build and an ioFog build differ in logo, favicon, and the `apiVersion` written into exported YAML. Upload accepts both `datasance.com/v3` and `iofog.org/v3`.

## How to read this guide

Start with [The console shell](./01-console-shell.md). It explains the sidebar, workbench tabs, the shared list, and the detail panel that most pages use. Later chapters assume that vocabulary.

| Chapter | What it covers |
| --- | --- |
| [01 — Console shell](./01-console-shell.md) | Sidebar, tabs, banners, lists, detail panels, header icons, bottom drawer |
| [02 — Overview](./02-overview.md) | Home dashboard |
| [03 — Nodes](./03-nodes.md) | Edgelet List, Edgelet Map, Mesh Graph, and the agent detail panel |
| [04 — Workloads](./04-workloads.md) | Applications and microservices, including system workloads |
| [05 — Catalog and templates](./05-catalog-and-templates.md) | Registries, catalog items, AI models, AI knowledge, application and microservice templates |
| [06 — Configuration](./06-configuration.md) | Config maps, secrets, certificates, volume mounts, runtime classes |
| [07 — Network](./07-network.md) | Services |
| [08 — Message bus](./08-message-bus.md) | NATS operators, accounts, and users |
| [09 — Access control](./09-access-control.md) | Roles, bindings, service accounts, NATS rules |
| [10 — Identity and sign-in](./10-identity-and-sign-in.md) | Login, password, MFA, users, groups, My Account |
| [11 — Events, console settings, and API](./11-events-console-and-api.md) | Audit log, polling settings, Swagger |
| [12 — YAML uploader](./12-yaml-uploader.md) | Dropzone, multi-document deploy, editor, template deploy |

## Screenshots

Every screen has a placeholder. Drop the image into [`images/`](./images/) using the filename in the caption. The markdown image will render as soon as the file is there.

```markdown
![Edgelet List](./images/nodes-list.png)

> **Screenshot:** `images/nodes-list.png` — the Edgelet List, including search and the YAML dropzone.
```

The full capture list is in [images/README.md](./images/README.md).
