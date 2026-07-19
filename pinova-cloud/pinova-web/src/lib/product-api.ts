import JSONBigFactory from "json-bigint";
import { cache } from "react";
import type { ProductStock, StoreProduct } from "@/data/storefront";

const JSONBig = JSONBigFactory({ storeAsString: true });
const API_BASE_URL = (
  process.env.PINOVA_API_BASE_URL ?? "http://127.0.0.1:8080"
).replace(/\/$/, "");

const MEDIA_PUBLIC_BASE_URL = new URL(
  `${(
    process.env.PINOVA_MEDIA_PUBLIC_BASE_URL ?? "http://127.0.0.1:19000"
  ).replace(/\/$/, "")}/`,
);
const MEDIA_BUCKET = process.env.PINOVA_MINIO_BUCKET ?? "pinova-public";

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

interface ProductPageDto {
  items: ProductSummaryDto[];
  page: number;
  pageSize: number;
  total: number;
}

interface ProductSummaryDto {
  id: string | number;
  name: string;
  summary: string | null;
  productType: number;
  mainImageKey: string | null;
  categoryCode: string;
  categoryName: string;
  categoryPathCodes: string[];
  priceFen: number | null;
  stock: string | null;
}

function isProductStock(value: string | null): value is ProductStock {
  return value === "in_stock" || value === "low_stock" || value === "sold_out";
}

function getProductImageUrl(objectKey: string | null) {
  if (!objectKey) return null;
  const encodedObjectKey = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return new URL(
    `${encodeURIComponent(MEDIA_BUCKET)}/${encodedObjectKey}`,
    MEDIA_PUBLIC_BASE_URL,
  ).toString();
}

function mapProduct(product: ProductSummaryDto): StoreProduct {
  const image = getProductImageUrl(product.mainImageKey);
  return {
    id: String(product.id),
    name: product.name,
    productType: Number(product.productType),
    mainImageKey: product.mainImageKey,
    categoryCode: product.categoryCode,
    categoryName: product.categoryName,
    categoryPathCodes: product.categoryPathCodes,
    description: product.summary,
    image,
    imageAlt: image ? product.name : "",
    priceFen: product.priceFen,
    stock: isProductStock(product.stock) ? product.stock : null,
  };
}

export const getProducts = cache(
  async (categoryCode?: string): Promise<StoreProduct[]> => {
    const parameters = new URLSearchParams({ page: "1", pageSize: "100" });
    if (categoryCode && categoryCode !== "all") {
      parameters.set("categoryCode", categoryCode);
    }

    const response = await fetch(`${API_BASE_URL}/products?${parameters}`, {
      headers: { Accept: "application/json" },
      ...(process.env.NODE_ENV === "development"
        ? { cache: "no-store" as const }
        : { next: { revalidate: 60, tags: ["products"] } }),
    });
    if (!response.ok) {
      throw new Error(`商品接口请求失败：${response.status} ${response.statusText}`);
    }

    let body: ApiResponse<ProductPageDto>;
    try {
      body = JSONBig.parse(await response.text()) as ApiResponse<ProductPageDto>;
    } catch {
      throw new Error("商品接口返回了无效的 JSON");
    }
    if (body.code !== "SUCCESS") {
      throw new Error(`商品接口返回失败：${body.code} ${body.message}`);
    }
    if (!body.data || !Array.isArray(body.data.items)) {
      throw new Error("商品接口的 data.items 不是数组");
    }
    return body.data.items.map(mapProduct);
  },
);
