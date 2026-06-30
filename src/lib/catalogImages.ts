export const normalizeCatalogImages = (
  images: Array<{ archId?: number; containerImage?: string }> | undefined,
) => {
  if (!Array.isArray(images)) {
    return [];
  }

  return images
    .filter(
      (image) =>
        image?.archId !== undefined &&
        image.archId >= 1 &&
        image.archId <= 4 &&
        image.containerImage,
    )
    .map(({ archId, containerImage }) => ({
      archId: archId as number,
      containerImage: containerImage as string,
    }));
};
