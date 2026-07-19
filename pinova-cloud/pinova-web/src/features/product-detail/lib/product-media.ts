import type {
  ProductDetailData,
  ProductDetailMedia,
  ProductDetailSku,
} from "@/data/product-detail";

const GALLERY_ROLES = new Set([1, 2]);

export function resolveDisplayMedia(
  product: ProductDetailData,
  sku: ProductDetailSku | null,
): ProductDetailMedia[] {
  const skuMedia = sku?.media.filter((media) => GALLERY_ROLES.has(media.mediaRole)) ?? [];
  if (skuMedia.length) return skuMedia;
  const commonMedia = product.commonMedia.filter((media) =>
    GALLERY_ROLES.has(media.mediaRole),
  );
  if (commonMedia.length) return commonMedia;
  const fallbackUrl = sku?.mainImageUrl ?? product.mainImageUrl;
  return fallbackUrl
    ? [{
        id: `fallback-${sku?.id ?? product.id}`,
        mediaType: 1,
        mediaRole: 1,
        objectKey: "",
        url: fallbackUrl,
        coverUrl: null,
        mimeType: "image/*",
        width: 1,
        height: 1,
        durationMs: null,
        altText: product.name,
        sortOrder: 0,
      }]
    : [];
}

export function indexProductMedia(product: ProductDetailData) {
  return new Map(
    [...product.commonMedia, ...product.skus.flatMap((sku) => sku.media)].map(
      (media) => [media.objectKey, media],
    ),
  );
}
