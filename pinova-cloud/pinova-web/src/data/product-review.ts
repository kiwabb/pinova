export interface ProductReviewMedia {
  id: string;
  mediaType: number;
  objectUrl: string | null;
  coverUrl: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  altText: string | null;
}

export interface ProductReview {
  id: string;
  reviewerName: string;
  rating: number;
  content: string;
  skuSpecSnapshot: string | null;
  publishedAt: string;
  media: ProductReviewMedia[];
}

export interface ProductReviewPage {
  items: ProductReview[];
  page: number;
  pageSize: number;
  total: number;
}
