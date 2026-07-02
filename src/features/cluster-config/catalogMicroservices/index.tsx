import React, { useEffect, useState } from "react";
import CustomDataTable from "@/components/ui/CustomDataTable";
import {
  ControllerContext,
  useResourceList,
  useResourceStore,
} from "@/app/providers";
import { FeedbackContext } from "@/app/providers";
import SlideOver from "@/components/ui/SlideOver";
import CustomLoadingModal from "@/components/ui/CustomLoadingModal";
import UnsavedChangesModal from "@/components/ui/UnsavedChangesModal";
import { useLocation } from "react-router-dom";
import ResourceLink from "@/components/ui/ResourceLink";
import yaml from "js-yaml";
import { parseCatalogMicroservice } from "@/lib/yaml/parseCatalogMicroservice";
import { appendImageToYamlAcc } from "@/lib/imageArchYAML";
import { normalizeCatalogImages } from "@/lib/catalogImages";
import { useUnifiedYamlUpload } from "../../../hooks/useUnifiedYamlUpload";
import { useTerminal } from "@/app/providers";
import { CANONICAL_DISPLAY_CONTROLLER_API_VERSION } from "@/lib/constants/constants";
import { architectures } from "../../../lib/formatting";

const DEPLOY_ARCH_IDS = [1, 2, 3, 4] as const;

const getContainerImageForArch = (
  images: Array<{ archId?: number; containerImage?: string }> | undefined,
  archId: number,
) =>
  images?.find((image) => image.archId === archId)?.containerImage ?? "";

function CatalogMicroservices() {
  const {
    items: catalog,
    loading: listLoading,
  } = useResourceList("catalogMicroservices");
  const catalogMicroservicesStore = useResourceStore("catalogMicroservices");
  const [detailFetching, setDetailFetching] = useState(false);
  const { request } = React.useContext(ControllerContext);
  const { pushFeedback } = React.useContext(FeedbackContext);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCatalogMicroservice, setselectedCatalogMicroservice] =
    useState<any | null>(null);
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const catalogItemId = params.get("catalogItemid");
  const { addYamlSession } = useTerminal();

  const [loading, setLoading] = React.useState(false);
  const [loadingMessage, setLoadingMessage] =
    React.useState("Catalog Adding...");
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

  const handleRowClick = (row: any) => {
    if (row.id) {
      fetchCatalogItem(row.id);
    }
  };

  async function fetchCatalogItem(catalogId: string) {
    try {
      setDetailFetching(true);
      const catalogItemResponse = await request(
        `/api/v3/catalog/microservices/${catalogId}`,
      );
      if (!catalogItemResponse.ok) {
        pushFeedback({
          message: catalogItemResponse.message,
          type: "error",
        });
        setDetailFetching(false);
        return;
      }
      const catalogItems = await catalogItemResponse.json();
      setselectedCatalogMicroservice(catalogItems);
      setIsOpen(true);
      setDetailFetching(false);
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error" });
      setDetailFetching(false);
    }
  }

  const handleRefreshCatalogMicroservice = async () => {
    if (!selectedCatalogMicroservice?.id) return;
    try {
      const catalogItemResponse = await request(
        `/api/v3/catalog/microservices/${selectedCatalogMicroservice.id}`,
      );
      if (catalogItemResponse.ok) {
        const catalogItems = await catalogItemResponse.json();
        setselectedCatalogMicroservice(catalogItems);
      }
    } catch (e) {
      console.error("Error refreshing catalog microservice data:", e);
    }
  };

  const refreshFunctions = React.useMemo(() => {
    const map = new Map();
    map.set("CatalogItem", async () => {
      await catalogMicroservicesStore.fetch({ silent: true });
    });
    return map;
  }, [catalogMicroservicesStore]);

  const { processYamlFile: processUnifiedYaml } = useUnifiedYamlUpload({
    request,
    pushFeedback,
    refreshFunctions,
  });

  useEffect(() => {
    if (catalogItemId && catalog) {
      const found = catalog.find(
        (item: any) => item.id.toString() === catalogItemId,
      );
      if (found) {
        handleRowClick(found);
        setIsOpen(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalogItemId, catalog]);

  const handleEditYaml = () => {
    if (!selectedCatalogMicroservice) return;

    const yamlImageKeys = (selectedCatalogMicroservice.images || []).reduce(
      (acc: Record<string, unknown>, image: { archId?: number; containerImage?: string }) =>
        appendImageToYamlAcc(acc, image),
      {},
    );

    const yamlObj = {
      apiVersion: CANONICAL_DISPLAY_CONTROLLER_API_VERSION,
      kind: "CatalogItem",
      metadata: {
        name: selectedCatalogMicroservice.name,
      },
      spec: {
        description: selectedCatalogMicroservice.description,
        category: selectedCatalogMicroservice.category,
        ...yamlImageKeys,
        registry: selectedCatalogMicroservice.registryId,
        configExample: selectedCatalogMicroservice.configExample,
      },
    };

    const yamlString = yaml.dump(yamlObj, {
      noRefs: true,
      indent: 2,
      lineWidth: -1,
    });

    addYamlSession({
      title: `CatalogItem YAML: ${selectedCatalogMicroservice.name}`,
      content: yamlString,
      isDirty: false,
      onSave: async (content: string) => {
        try {
          const parsedDoc = yaml.load(content);
          const [catalogItem, err] = await parseCatalogMicroservice(parsedDoc);

          if (err) {
            pushFeedback({ message: err, type: "error" });
            return;
          }

          await postCatalogItem(catalogItem, "PATCH");
        } catch (e: any) {
          pushFeedback({ message: e.message, type: "error", uuid: "error" });
        }
      },
    });
  };

  const postCatalogItem = async (item: any, method?: string) => {
    const newItem = {
      ...item,
      images: normalizeCatalogImages(item.images),
    };
    setLoadingMessage(
      method === "PATCH" ? "Catalog Updating..." : "Catalog Adding...",
    );
    setLoading(true);

    // For PATCH, use the ID from selectedCatalogMicroservice since the parsed item doesn't have id
    const catalogId =
      method === "PATCH" ? selectedCatalogMicroservice?.id : null;

    const response = await request(
      `/api/v3/catalog/microservices${method === "PATCH" && catalogId ? "/" + catalogId : ""}`,
      {
        method: method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newItem),
      },
    );
    if (response?.ok) {
      pushFeedback({
        message: `Catalog ${method === "PATCH" ? "Updated" : "Added"}!`,
        type: "success",
      });
      await catalogMicroservicesStore.fetch({ silent: true });
      setLoading(false);
    } else {
      pushFeedback({ message: response?.message, type: "error" });
      setLoading(false);
    }
  };

  const handleDeleteCatalogMicroservice = async () => {
    try {
      if (!selectedCatalogMicroservice?.id) {
        pushFeedback({
          message: "No catalog microservice selected",
          type: "error",
        });
        return;
      }

      const res = await request(
        `/api/v3/catalog/microservices/${selectedCatalogMicroservice.id}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        pushFeedback({
          message: res.message,
          type: "error",
        });
      } else {
        pushFeedback({
          message: `Catalog Microservice ${selectedCatalogMicroservice.name} deleted`,
          type: "success",
        });
        setShowDeleteConfirmModal(false);
        setIsOpen(false);
        setselectedCatalogMicroservice(null);
        await catalogMicroservicesStore.fetch({ silent: true });
      }
    } catch (e: any) {
      pushFeedback({ message: e.message, type: "error", uuid: "error" });
    }
  };

  const showLoadingModal = listLoading || detailFetching;

  const columns = [
    {
      key: "id",
      header: "ID",
      render: (row: any) => <span>{row.id || "-"}</span>,
    },
    {
      key: "name",
      header: "Name",
      render: (row: any) => (
        <div
          className="cursor-pointer text-blue-400 hover:underline"
          onClick={() => handleRowClick(row)}
        >
          {row.name}
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (row: any) => <span>{row.description || "-"}</span>,
    },
    {
      key: "registryId",
      header: "Registry Id",
      render: (row: any) => {
        if (!row?.registryId) return <span className="text-gray-400">N/A</span>;
        return (
          <ResourceLink
            path="/config/Registries"
            query={{ registryId: row.registryId }}
          >
            {row.registryId}
          </ResourceLink>
        );
      },
    },
    ...DEPLOY_ARCH_IDS.map((archId) => ({
      key: `images-${archId}`,
      header: architectures[archId],
      render: (row: any) => (
        <span>{getContainerImageForArch(row.images, archId) || "-"}</span>
      ),
    })),
    {
      key: "category",
      header: "Category",
      render: (row: any) => <span>{row.category || "-"}</span>,
    },
  ];

  const slideOverFields = [
    {
      label: "Name",
      render: (row: any) => row.name || "N/A",
    },
    {
      label: "Category",
      render: (row: any) => row.category || "N/A",
    },
    {
      label: "Config Example",
      render: (row: any) => row.configExample || "N/A",
    },
    {
      label: "Description",
      render: (row: any) => row.description || "N/A",
    },
    // {
    //   label: "Disk Required",
    //   render: (row: any) => (row.diskRequired === 0 ? "false" : "true"),
    // },
    // {
    //   label: "Input Type",
    //   render: (row: any) => {
    //     if (!row.inputType) return "N/A";
    //     if (typeof row.inputType === "object") {
    //       return JSON.stringify(row.inputType);
    //     }
    //     return row.inputType;
    //   },
    // },
    // {
    //   label: "Is Public",
    //   render: (row: any) => row.isPublic.toString() || "N/A",
    // },
    // {
    //   label: "Output Type",
    //   render: (row: any) => {
    //     if (!row.outputType) return "N/A";
    //     if (typeof row.outputType === "object") {
    //       return JSON.stringify(row.outputType);
    //     }
    //     return row.outputType;
    //   },
    // },
    // {
    //   label: "publisher",
    //   render: (row: any) => row.publisher || "N/A",
    // },
    // {
    //   label: "Ram Required",
    //   render: (row: any) => row.ramRequired.toString() || "N/A",
    // },
    {
      label: "Registry Id",
      render: (row: any) => {
        if (!row?.registryId) return <span className="text-gray-400">N/A</span>;
        return (
          <ResourceLink
            path="/config/Registries"
            query={{ registryId: row.registryId }}
          >
            {row.registryId}
          </ResourceLink>
        );
      },
    },
    {
      label: "Images",
      render: () => "",
      isSectionHeader: true,
    },
    {
      label: "",
      isFullSection: true,
      render: (node: any) => {
        const images = node?.images || [];

        const tableData = DEPLOY_ARCH_IDS.map((archId) => ({
          archId,
          architecture: architectures[archId],
          containerImage: getContainerImageForArch(images, archId) || "-",
        }));

        const imageColumns = [
          {
            key: "architecture",
            header: "Architecture",
            formatter: ({ row }: any) => (
              <span className="text-white">{row.architecture}</span>
            ),
          },
          {
            key: "containerImage",
            header: "Container Image",
            formatter: ({ row }: any) => (
              <span className="text-white">{row.containerImage}</span>
            ),
          },
        ];

        return (
          <CustomDataTable
            columns={imageColumns}
            data={tableData}
            getRowKey={(row: any) => row.archId}
          />
        );
      },
    },
  ];

  return (
    <>
      {showLoadingModal ? (
        <>
          <CustomLoadingModal
            open={true}
            message="Fetching Catalog Microservices"
            spinnerSize="lg"
            spinnerColor="text-green-500"
            overlayOpacity={60}
          />
        </>
      ) : (
        <>
          <div className="bg-gray-900 text-white p-4">
            <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">
              Catalog Microservices
            </h1>

            <CustomDataTable
              columns={columns}
              data={catalog}
              getRowKey={(row: any) => row.id}
              uploadDropzone
              uploadFunction={processUnifiedYaml}
            />
          </div>
        </>
      )}
      <SlideOver
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onDelete={() => setShowDeleteConfirmModal(true)}
        onEditYaml={handleEditYaml}
        title={
          selectedCatalogMicroservice?.name || "Catalog Microservice Details"
        }
        data={selectedCatalogMicroservice}
        fields={slideOverFields}
        customWidth={600}
        enablePolling={true}
        onRefresh={handleRefreshCatalogMicroservice}
      />
      <CustomLoadingModal
        open={loading}
        message={loadingMessage}
        spinnerSize="lg"
        spinnerColor="text-green-500"
        overlayOpacity={60}
      />

      <UnsavedChangesModal
        open={showDeleteConfirmModal}
        onCancel={() => setShowDeleteConfirmModal(false)}
        onConfirm={handleDeleteCatalogMicroservice}
        title={`Deleting Catalog Microservice ${selectedCatalogMicroservice?.name}`}
        message={
          "This action will remove the catalog microservice from the system if item's category is not 'SYSTEM' or not in use by any microservices. This is not reversible."
        }
        cancelLabel={"Cancel"}
        confirmLabel={"Delete"}
      />
    </>
  );
}

export default CatalogMicroservices;
