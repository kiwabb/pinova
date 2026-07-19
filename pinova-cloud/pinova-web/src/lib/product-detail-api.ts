import JSONBigFactory from "json-bigint";
import { cache } from "react";
import type {
  ProductDetailBlock,
  ProductDetailData,
  ProductDetailDocument,
  ProductDetailMedia,
  ProductDetailSku,
} from "@/data/product-detail";
import type { ProductStock } from "@/data/storefront";

const JSONBig = JSONBigFactory({ storeAsString: true });
const API_BASE_URL = (
  process.env.PINOVA_API_BASE_URL ?? "http://127.0.0.1:8080"
).replace(/\/$/, "");

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

interface ProductMediaDto {
  id: string | number;
  mediaType: number;
  mediaRole: number;
  objectKey: string;
  url: string;
  coverUrl: string | null;
  mimeType: string;
  width: number;
  height: number;
  durationMs: number | null;
  altText: string | null;
  sortOrder: number;
}

interface ProductSkuDto {
  id: string | number;
  specSummary: string | null;
  priceFen: number;
  stock: string | null;
  mainImageUrl: string | null;
  media: ProductMediaDto[];
}

interface ProductDetailDto {
  id: string | number;
  name: string;
  summary: string | null;
  productType: number;
  mainImageUrl: string | null;
  categoryCode: string;
  categoryName: string;
  categoryPathCodes: string[];
  detail: {
    contentSchemaVersion: number;
    document: unknown;
    packingList: string | null;
    usageInstructions: string | null;
    afterSalesNote: string | null;
  };
  commonMedia: ProductMediaDto[];
  skus: ProductSkuDto[];
}

function isProductStock(value: string | null): value is ProductStock {
  return value === "in_stock" || value === "low_stock" || value === "sold_out";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mapDocument(value: unknown): ProductDetailDocument {
  if (!isRecord(value) || !Array.isArray(value.blocks)) return { blocks: [] };
  const blocks = value.blocks.flatMap<ProductDetailBlock>((block) => {
    if (!isRecord(block) || typeof block.type !== "string" || !isRecord(block.data)) {
      return [];
    }
    const data = block.data;
    return [{
      type: block.type,
      data: {
        text: typeof data.text === "string" ? data.text : undefined,
        level: typeof data.level === "number" ? data.level : undefined,
        objectKey: typeof data.objectKey === "string" ? data.objectKey : undefined,
        objectKeys: Array.isArray(data.objectKeys)
          ? data.objectKeys.filter((key): key is string => typeof key === "string")
          : undefined,
        alt: typeof data.alt === "string" ? data.alt : undefined,
      },
    }];
  });
  return { blocks };
}

function mapMedia(media: ProductMediaDto): ProductDetailMedia {
  return { ...media, id: String(media.id) };
}

function mapSku(sku: ProductSkuDto): ProductDetailSku {
  return {
    ...sku,
    id: String(sku.id),
    stock: isProductStock(sku.stock) ? sku.stock : null,
    media: sku.media.map(mapMedia),
  };
}

function mapProductDetail(product: ProductDetailDto): ProductDetailData {
  return {
    ...product,
    id: String(product.id),
    detail: {
      ...product.detail,
      document: mapDocument(product.detail.document),
    },
    commonMedia: product.commonMedia.map(mapMedia),
    skus: product.skus.map(mapSku),
  };
}

export const getProductDetail = cache(
  async (productId: string): Promise<ProductDetailData | null> => {
    const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
      headers: { Accept: "application/json" },
      ...(process.env.NODE_ENV === "development"
        ? { cache: "no-store" as const }
        : { next: { revalidate: 60, tags: [`product-${productId}`] } }),
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`商品详情接口请求失败：${response.status} ${response.statusText}`);
    }
    const body = JSONBig.parse(await response.text()) as ApiResponse<ProductDetailDto>;
    if (body.code !== "SUCCESS" || !body.data) {
      throw new Error(`商品详情接口返回失败：${body.code} ${body.message}`);
    }
    return mapProductDetail(body.data);
  },
);
