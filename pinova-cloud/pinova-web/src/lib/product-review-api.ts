import JSONBigFactory from "json-bigint";
import type {
  ProductReview,
  ProductReviewMedia,
  ProductReviewPage,
} from "@/data/product-review";

const JSONBig = JSONBigFactory({ storeAsString: true });
const API_BASE_URL = (
  process.env.PINOVA_API_BASE_URL ?? "http://127.0.0.1:8080"
).replace(/\/$/, "");

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

interface ProductReviewMediaDto {
  id: string | number;
  mediaType: string | number;
  objectUrl: string | null;
  coverUrl: string | null;
  mimeType: string | null;
  width: string | number | null;
  height: string | number | null;
  durationMs: string | number | null;
  altText: string | null;
}

interface ProductReviewDto {
  id: string | number;
  reviewerName: string | null;
  rating: string | number;
  content: string | null;
  skuSpecSnapshot: string | null;
  publishedAt: string;
  media: ProductReviewMediaDto[];
}

interface ProductReviewPageDto {
  items: ProductReviewDto[];
  page: string | number;
  pageSize: string | number;
  total: string | number;
}

interface ProblemDetailDto {
  detail?: string;
  title?: string;
}

export class ProductReviewApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductReviewApiError";
  }
}

function toNullableNumber(value: string | number | null) {
  return value === null ? null : Number(value);
}

function mapReviewMedia(media: ProductReviewMediaDto): ProductReviewMedia {
  return {
    id: String(media.id),
    mediaType: Number(media.mediaType),
    objectUrl: media.objectUrl,
    coverUrl: media.coverUrl,
    mimeType: media.mimeType,
    width: toNullableNumber(media.width),
    height: toNullableNumber(media.height),
    durationMs: toNullableNumber(media.durationMs),
    altText: media.altText,
  };
}

function mapReview(review: ProductReviewDto): ProductReview {
  return {
    id: String(review.id),
    reviewerName: review.reviewerName ?? "已购用户",
    rating: Number(review.rating),
    content: review.content ?? "",
    skuSpecSnapshot: review.skuSpecSnapshot,
    publishedAt: review.publishedAt,
    media: Array.isArray(review.media) ? review.media.map(mapReviewMedia) : [],
  };
}

function mapReviewPage(page: ProductReviewPageDto): ProductReviewPage {
  return {
    items: Array.isArray(page.items) ? page.items.map(mapReview) : [],
    page: Number(page.page),
    pageSize: Number(page.pageSize),
    total: Number(page.total),
  };
}

async function parseError(response: Response) {
  try {
    const body = JSON.parse(await response.text()) as ProblemDetailDto;
    return body.detail ?? body.title ?? `评价请求失败（${response.status}）`;
  } catch {
    return `评价请求失败（${response.status}）`;
  }
}

async function readReviewPage(response: Response) {
  if (!response.ok) {
    throw new ProductReviewApiError(await parseError(response));
  }
  const body = JSONBig.parse(await response.text()) as ApiResponse<ProductReviewPageDto>;
  if (body.code !== "SUCCESS" || !body.data) {
    throw new ProductReviewApiError(body.message || "商品评价暂时无法读取");
  }
  return mapReviewPage(body.data);
}

export async function getProductReviews(
  productId: string,
  page = 1,
  pageSize = 20,
) {
  const parameters = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const response = await fetch(
    `${API_BASE_URL}/products/${productId}/reviews?${parameters}`,
    {
      headers: { Accept: "application/json" },
      ...(process.env.NODE_ENV === "development"
        ? { cache: "no-store" as const }
        : { next: { revalidate: 60, tags: [`product-${productId}-reviews`] } }),
    },
  );
  return readReviewPage(response);
}

export async function getProductReviewsFromRoute(
  productId: string,
  page = 1,
  pageSize = 20,
) {
  const parameters = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const response = await fetch(
    `/api/products/${encodeURIComponent(productId)}/reviews?${parameters}`,
    {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    },
  );
  return readReviewPage(response);
}
