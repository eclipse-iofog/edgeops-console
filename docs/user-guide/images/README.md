# Screenshot checklist

Put PNG files in this folder. Each caption in the guide names the file. Suggested captures:

## Shell

- `shell-sidebar-expanded.png` - expanded sidebar with groups open
- `shell-sidebar-collapsed.png` - icon-only sidebar
- `shell-workbench-tabs.png` - several tabs, one preview (italic) and one active
- `shell-controller-unreachable.png` - red connectivity banner
- `shell-iam-external-banner.png` - amber external-identity banner
- `shell-bottom-drawer-terminal.png` - terminal session in the bottom drawer
- `shell-bottom-drawer-yaml.png` - YAML editor with a dirty tab (`*`)
- `shell-list-toolbar.png` - Search box and YAML dropzone together

## Overview

- `overview-header.png` - title, subtitle, last-updated clock
- `overview-metric-cards.png` - metric cards, including Cluster Controllers when present
- `overview-compute-nodes.png` - status chips, donut, resource bubble chart
- `overview-microservices.png` - microservice status and resource charts
- `overview-system-microservices.png` - system microservice charts
- `overview-cluster-controllers.png` - cluster controller section

## Nodes

- `nodes-list.png` - Edgelet List table
- `nodes-list-name-link.png` - name cell that opens the detail panel
- `nodes-agent-slideover.png` - agent detail panel, header icons visible
- `nodes-agent-slideover-links.png` - a linked table inside the agent panel (applications or volume mounts)
- `nodes-provision-key.png` - Provision Key dialog
- `nodes-version-change.png` - Version Change dialog
- `nodes-exec-config.png` - exec session dialog
- `nodes-log-config.png` - log viewing dialog
- `nodes-map.png` - map with markers and the agent selector
- `nodes-map-marker-card.png` - marker popup with the Detail button
- `nodes-mesh-router.png` - Mesh Graph, Router layer
- `nodes-mesh-nats.png` - Mesh Graph, Message Fabric layer
- `nodes-mesh-filters.png` - role chips, fog-name filter, legend
- `nodes-mesh-topology-slideover.png` - topology node detail (no agent)
- `nodes-mesh-focus.png` - neighborhood focus after selecting a node

## Workloads

- `workloads-applications.png` - Application List
- `workloads-application-slideover.png` - application detail, including microservices table
- `workloads-system-applications.png` - System Application List
- `workloads-microservices.png` - Microservices List with CPU, memory, and status
- `workloads-microservice-slideover.png` - microservice detail header and first sections
- `workloads-microservice-models.png` - AI Model Catalog editor inside the panel
- `workloads-microservice-knowledge.png` - AI Knowledge Catalog editor
- `workloads-microservice-ports-volumes.png` - ports and volumes tables with row actions
- `workloads-microservice-env-volume.png` - extra fileds
- `workloads-microservice-config.png` - config YAML editor
- `workloads-system-microservices.png` - list with a Controller badge
- `workloads-confirm-dialog.png` - a typical confirm dialog (delete, rebuild, or start/stop)

## Catalog and templates

- `config-registries.png` - Registries list
- `config-registry-slideover.png` - registry detail, including CA reveal
- `config-catalog.png` - Catalog Microservices list with per-architecture images
- `config-catalog-slideover.png` - catalog detail and registry picker
- `config-models.png` - AI Model Catalog list
- `config-model-slideover.png` - model detail and linked fog nodes
- `config-model-attach.png` - Attach dialog
- `config-knowledge.png` - AI Knowledge Catalog
- `config-app-templates.png` - Application Templates list
- `config-app-template-slideover.png` - template detail with variables
- `config-app-template-deploy.png` - deploy form in the bottom drawer
- `config-ms-templates.png` - Microservice Templates list
- `config-ms-template-deploy.png` - microservice template deploy form

## Configuration

- `config-configmaps.png` - Config Maps list
- `config-configmap-slideover.png` - data keys and inline editors
- `config-secrets.png` - Secrets list
- `config-secret-slideover.png` - secret values with show/copy
- `config-certificates.png` - Certificates list
- `config-certificate-slideover.png` - certificate detail and linked CA
- `config-volume-mounts.png` - Volume Mounts list
- `config-volume-mount-slideover.png` - volume mount detail and linked nodes
- `config-runtime-classes.png` - Runtime Classes list
- `config-runtime-class-attach.png` - attach dialog showing an Edgelet-only hint

## Network, message bus, access control

- `network-services.png` - Services list
- `network-service-slideover.png` - service detail and Sync now
- `messagebus-operators.png` - NATS Operators page
- `messagebus-accounts.png` - NATS Accounts list and Ensure button
- `messagebus-account-slideover.png` - account detail with JWT
- `messagebus-users.png` - NATS Users filters and table
- `messagebus-user-slideover.png` - user detail, creds, and actions
- `access-roles.png` - Roles list
- `access-role-slideover.png` - role rules
- `access-rolebindings.png` - Role Bindings list
- `access-serviceaccounts.png` - Service Accounts list
- `access-nats-account-rules.png` - NATS Account Rules
- `access-nats-user-rules.png` - NATS User Rules

## Identity, events, settings, YAML

- `auth-sign-in.png` - Sign in page
- `auth-credentials.png` - username and password step, when shown
- `auth-mfa.png` - two-factor verification
- `auth-mfa-setup.png` - two-factor setup
- `auth-force-password.png` - required password change
- `identity-account.png` - My Account
- `identity-users.png` - Identity Users list
- `identity-user-slideover.png` - user detail and actions
- `identity-user-create.png` - Create user dialog
- `identity-groups.png` - Identity Groups list
- `identity-group-create.png` - Identity Groups create
- `identity-group-slideover.png` - group detail and MFA policy
- `events-filters.png` - Events filters and toolbar
- `events-table.png` - events table and pagination
- `events-slideover.png` - event detail panel
- `events-delete.png` - Delete Events dialog
- `console-polling.png` - Polling Settings
- `api-swagger.png` - API tab with the API reference
- `yaml-dropzone.png` - dropzone idle and while dragging a file
<!-- - `yaml-toasts.png` - success and failure toasts after an upload
- `yaml-editor.png` - YAML editor tab and Save
- `yaml-deploy-confirm.png` - Deploy confirmation for a template -->
