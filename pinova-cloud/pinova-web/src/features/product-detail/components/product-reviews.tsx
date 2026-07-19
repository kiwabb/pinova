"use client";

import Image from "next/image";
import { LoaderCircle, Star } from "lucide-react";
import { useState } from "react";
import type {
  ProductReview,
  ProductReviewMedia,
  ProductReviewPage,
} from "@/data/product-review";
import { getProductReviewsFromRoute } from "@/lib/product-review-api";
import styles from "../product-detail.module.css";

interface ProductReviewsProps {
  initialError: string | null;
  initialPage: ProductReviewPage;
  productId: string;
  productName: string;
}

function formatReviewDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "评价暂时无法读取，请重试";
}

function ReviewStars({ rating }: { rating: number }) {
  const safeRating = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className={styles.reviewStars} aria-label={`${safeRating} 分评价，满分 5 分`}>
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          size={15}
          fill={index < safeRating ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

function ReviewMedia({ media, index }: { media: ProductReviewMedia; index: number }) {
  if (!media.objectUrl) return null;
  const width = media.width && media.width > 0 ? media.width : 1;
  const height = media.height && media.height > 0 ? media.height : 1;
  const frameStyle = { aspectRatio: `${width} / ${height}` };
  const isVideo =
    media.mimeType?.startsWith("video/") || media.mediaType === 2;

  return (
    <figure className={styles.reviewMediaFrame} style={frameStyle}>
      {isVideo ? (
        <video
          controls
          preload="metadata"
          poster={media.coverUrl ?? undefined}
          aria-label={media.altText ?? `评价视频 ${index + 1}`}
        >
          <source src={media.objectUrl} type={media.mimeType ?? undefined} />
        </video>
      ) : (
        <Image
          src={media.objectUrl}
          alt={media.altText ?? ""}
          fill
          loading="lazy"
          sizes="(max-width: 719px) 42vw, 160px"
        />
      )}
    </figure>
  );
}

function ReviewItem({ review }: { review: ProductReview }) {
  return (
    <article className={styles.reviewItem}>
      <header className={styles.reviewItemHeader}>
        <div>
          <strong>{review.reviewerName}</strong>
        </div>
        <div>
          <ReviewStars rating={review.rating} />
          <time dateTime={review.publishedAt}>
            {formatReviewDate(review.publishedAt)}
          </time>
        </div>
      </header>

      {review.skuSpecSnapshot && (
        <p className={styles.reviewSku}>规格 / {review.skuSpecSnapshot}</p>
      )}
      {review.content && <p className={styles.reviewContent}>{review.content}</p>}

      {review.media.length > 0 && (
        <div className={styles.reviewMediaGrid}>
          {review.media.map((media, index) => (
            <ReviewMedia key={media.id} media={media} index={index} />
          ))}
        </div>
      )}
    </article>
  );
}

export function ProductReviews({
  initialError,
  initialPage,
  productId,
  productName,
}: ProductReviewsProps) {
  const [reviews, setReviews] = useState(initialPage.items);
  const [page, setPage] = useState(initialPage.page);
  const [total, setTotal] = useState(initialPage.total);
  const [error, setError] = useState(initialError);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const hasMore = reviews.length < total;

  const loadMore = async () => {
    setIsLoadingMore(true);
    setError(null);
    try {
      const targetPage = reviews.length === 0 ? 1 : page + 1;
      const nextPage = await getProductReviewsFromRoute(
        productId,
        targetPage,
        initialPage.pageSize,
      );
      setReviews((current) =>
        targetPage === 1 ? nextPage.items : [...current, ...nextPage.items],
      );
      setPage(nextPage.page);
      setTotal(nextPage.total);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <section className={styles.reviewsBand} aria-labelledby="product-reviews-title">
      <div className={styles.reviewsHeader}>
        <h2 id="product-reviews-title">商品评价</h2>
        <output aria-live="polite">{total} 条公开评价</output>
      </div>

      {error && (
        <div className={styles.reviewError} role="alert">
          <p>{error}</p>
          <button type="button" disabled={isLoadingMore} onClick={loadMore}>
            重试
          </button>
        </div>
      )}

      {reviews.length > 0 ? (
        <div className={styles.reviewList}>
          {reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div className={styles.reviewEmpty}>
          <h3>还没有公开评价</h3>
          <p>{productName} 的评价发布后会出现在这里。</p>
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          className={styles.loadMoreReviews}
          disabled={isLoadingMore}
          onClick={loadMore}
        >
          {isLoadingMore && <LoaderCircle aria-hidden="true" size={17} />}
          加载更多评价
        </button>
      )}
    </section>
  );
}
