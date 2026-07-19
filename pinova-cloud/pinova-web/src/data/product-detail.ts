import {
  isAvailableStock,
  type ProductStock,
} from "@/lib/product-availability";

export interface ProductDetailBlockData {
  text?: string;
  level?: number;
  objectKey?: string;
  objectKeys?: string[];
  alt?: string;
}

export interface ProductDetailBlock {
  type: string;
  data: ProductDetailBlockData;
}

export interface ProductDetailDocument {
  blocks: ProductDetailBlock[];
}

export interface ProductDetailContent {
  contentSchemaVersion: number;
  document: ProductDetailDocument;
  packingList: string | null;
  usageInstructions: string | null;
  afterSalesNote: string | null;
}

export interface ProductDetailMedia {
  id: string;
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

export interface ProductDetailSku {
  id: string;
  specSummary: string | null;
  priceFen: number;
  stock: ProductStock | null;
  mainImageUrl: string | null;
  media: ProductDetailMedia[];
}

export interface ProductDetailData {
  id: string;
  name: string;
  summary: string | null;
  productType: number;
  mainImageUrl: string | null;
  categoryCode: string;
  categoryName: string;
  categoryPathCodes: string[];
  detail: ProductDetailContent;
  commonMedia: ProductDetailMedia[];
  skus: ProductDetailSku[];
}

export function isSkuPurchasable(sku: ProductDetailSku) {
  return isAvailableStock(sku.stock);
}
