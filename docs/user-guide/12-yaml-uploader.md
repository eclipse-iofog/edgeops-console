# YAML uploader

The dropzone is how you create and update most resources. It deploys the file. It does not open a preview.

You will find **Drag YAML here or upload** on the resource lists: edgelets, all four workload lists, every Config page except Console Config, Services, Access Control, NATS accounts, and NATS users. Operators has the dropzone without a table. Overview, the map, Mesh Graph, Events, Users, Groups, and My Account do not.

![Dropzone](./images/yaml-dropzone.png)

## Adding a file

- Drop one file on the dashed box, or click the box and pick a file.
- The name must end in `.yaml` or `.yml`. Anything else raises *Only YAML files are allowed*.
- If you drop several files, the console takes the first one.
- A multi-document file is one file with several YAML documents separated by `---`. That is the way to deploy a set of resources together.

Upload accepts `apiVersion: datasance.com/v3` and `apiVersion: iofog.org/v3`. A Datasance build writes `datasance.com/v3` when the console generates YAML. An ioFog build writes `iofog.org/v3`. Importers accept either group.

## What the file may contain

Each document needs `kind`. These kinds are accepted:

| Kind | What it becomes |
| --- | --- |
| Agent | An edgelet |
| Secret | A secret |
| CertificateAuthority | A certificate authority |
| Certificate | A certificate |
| ConfigMap | A config map |
| VolumeMount | A volume mount |
| Role | A role |
| RoleBinding | A role binding |
| ServiceAccount | A service account |
| NatsAccountRule | A NATS account rule |
| NatsUserRule | A NATS user rule |
| Registry | A registry |
| Model | An AI model catalog entry |
| Knowledge | An AI knowledge catalog entry |
| RuntimeClass | A runtime class |
| CatalogItem | A catalog microservice |
| ApplicationTemplate | An application template |
| MicroserviceTemplate | A microservice template |
| Application | An application, including its microservices when they are inline |
| Microservice | One microservice |
| Service | A network service |

A document with a missing or unknown kind is skipped and reported. The rest of the file still deploys.

### Order inside one file

Before anything is sent, documents are ordered so dependencies exist first:

1. Agent
2. Secret
3. CertificateAuthority
4. Certificate
5. ConfigMap
6. VolumeMount
7. Role
8. RoleBinding
9. ServiceAccount
10. NatsAccountRule
11. NatsUserRule
12. Registry
13. Model
14. Knowledge
15. RuntimeClass
16. CatalogItem
17. ApplicationTemplate
18. MicroserviceTemplate
19. Application
20. Microservice
21. Service

You can write the file in any order. The uploader sorts it.

## What happens after you drop the file

There is no review step. The console parses the file, then creates or updates each resource.

1. Parse errors appear as error toasts, one per problem.
2. If nothing in the file is valid, the toast is **No valid resources found in YAML file**.
3. Each valid resource is checked. If it already exists, the console updates it. If it does not, the console creates it.
4. Each resource gets its own toast. A failure names the kind and the identifier.
5. A summary toast closes the upload: **Successfully deployed {n} resource(s)**, or **Deployed {n} resource(s), {n} failed**.
6. The list you uploaded from refreshes when that kind is one it shows. Other kinds in the same file still deploy; their pages pick them up when you open them or when their poll runs.

A few kinds have extra rules:

| Kind | Rule |
| --- | --- |
| Certificate, CertificateAuthority | An existing certificate is not patched. The toast tells you to delete it and upload again. |
| Registry | A document with an id updates that registry. A document without an id creates one. |
| Agent | An existing edgelet is matched by name and updated. |
| Application | A new document creates the application. An existing name is updated. On System Application List, a new application is created as a system application. Saving from the pencil is narrower than upload: the editor applies application-level fields and does not push microservice changes that you typed into that same YAML. |
| Microservice | Creates or updates that microservice. On a system microservice, the pencil updates the system microservice. |
| Service | Create and update both leave hub provisioning running. The service panel’s **Sync now** repeats that setup later. |
| Model | When the registry is Hugging Face, the file list is part of the spec. |
| Knowledge | Format text outside the known set is stored as unknown. An empty format is omitted. |

Identity users and groups are not YAML kinds. Create them from the dialogs on those pages.

## Editing YAML from a detail panel

The dropzone is for files. The pencil on a detail panel is for one resource you are already looking at.

**Edit** opens a tab in the bottom drawer:

| Where you clicked Edit | Tab title |
| --- | --- |
| Edgelet | `AgentConfig YAML: {name}` |
| Application | `Application YAML: {name}` |
| System application | `System Application YAML: {name}` |
| Microservice | `Microservice YAML: {application}/{name}` |
| System microservice | `System Microservice YAML: {application}/{name}` |
| Any config or access-control resource | That resource’s YAML |

The editor is a YAML text area. The tab title grows a `*` when the text differs from what was loaded. **Save** submits it. Parse and API errors come back as toasts. A successful save clears the dirty mark.

Application save asks you to confirm first, because that save does not apply microservice edits embedded in the application document. Upload the application file when those microservice changes should go out.

Certificates have no pencil. Replace them by deleting the certificate and uploading a new file.

## Deploying a template

Templates use **Publish**, not the dropzone. Publish opens a form, not the raw YAML.

| Template | Drawer tab | You fill in |
| --- | --- | --- |
| Application template | `Application Template Form: {name}` | Application name and the template’s variables |
| Microservice template | `Microservice Template Form: {name}` | Instance name, application, edgelet, and the template’s variables |

The drawer title is **Editing Deploy an application from {name} Template** or **Editing Deploy a microservice from {name} Template**.

Variable rows:

- An edgelet variable is **Select an agent**.
- An application variable on a microservice template is **Select an application**.
- A boolean is **Select**, **true**, or **false**.
- A locked variable reads **Variable {key} is not configurable**.

The form must be valid before deploy. An application template needs an application name. A microservice template needs an instance name, an application, and an edgelet.

**Save** opens **Deploy {name}**. The message asks you to deploy the application or the microservice from that template. **Cancel** returns to the form. **Deploy** runs it.

Success toasts: **Application deployed!** or **Microservice deployed!**.

Uploading an `ApplicationTemplate` or `MicroserviceTemplate` document updates the template itself. It does not deploy an instance. Use **Publish** on the template’s detail panel to deploy.
