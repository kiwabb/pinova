import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ProductReviewPage } from "@/data/product-review";
import { ProductDetail } from "@/features/product-detail";
import { getProductDetail } from "@/lib/product-detail-api";
import { getProductReviews } from "@/lib/product-review-api";

interface ProductDetailPageProps {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ skuId?: string }>;
}

async function loadProduct(productId: string) {
  if (!/^\d+$/.test(productId)) return null;
  return getProductDetail(productId);
}

function emptyReviewPage(pageSize = 5): ProductReviewPage {
  return { items: [], page: 1, pageSize, total: 0 };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "商品评价暂时无法读取";
}

export async function generateMetadata({
  params,
}: ProductDetailPageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await loadProduct(productId);
  if (!product) return {};
  return {
    title: `${product.name} | PINOVA 色谱工作台`,
    description: product.summary ?? `查看 ${product.name} 的规格、价格与商品详情。`,
  };
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: ProductDetailPageProps) {
  const [{ productId }, { skuId }] = await Promise.all([params, searchParams]);
  if (!/^\d+$/.test(productId)) notFound();
  const [product, reviewsResult] = await Promise.all([
    loadProduct(productId),
    getProductReviews(productId, 1, 5)
      .then((reviews) => ({ reviews, error: null }))
      .catch((error: unknown) => ({
        reviews: emptyReviewPage(),
        error: getErrorMessage(error),
      })),
  ]);
  if (!product) notFound();
  return (
    <ProductDetail
      product={product}
      initialSkuId={skuId}
      initialReviews={reviewsResult.reviews}
      initialReviewError={reviewsResult.error}
    />
  );
}
