"use client";

import {
  Check,
  Heart,
  LoaderCircle,
  Minus,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  isSkuPurchasable,
  type ProductDetailData,
  type ProductDetailSku,
} from "@/data/product-detail";
import type { ProductReviewPage } from "@/data/product-review";
import { formatPrice } from "@/lib/format-price";
import { getStockLabel } from "@/lib/product-availability";
import styles from "../product-detail.module.css";

interface ProductPurchasePanelProps {
  added: boolean;
  error: string | null;
  isAdding: boolean;
  isFavorite: boolean;
  product: ProductDetailData;
  reviews: ProductReviewPage;
  selectedSku: ProductDetailSku | null;
  onAddToCart: (quantity: number) => void;
  onSelectSku: (sku: ProductDetailSku) => void;
  onToggleFavorite: () => void;
}

function availabilityText(sku: ProductDetailSku | null) {
  if (!sku) return "暂无可售规格";
  return getStockLabel(sku.stock) ?? "暂不可购买";
}

function ReviewSummary({ reviews }: { reviews: ProductReviewPage }) {
  const average = useMemo(() => {
    if (!reviews.items.length) return null;
    const sum = reviews.items.reduce((total, item) => total + item.rating, 0);
    return sum / reviews.items.length;
  }, [reviews.items]);

  if (average === null || reviews.total <= 0) return null;

  const rounded = Math.round(average * 10) / 10;
  const filled = Math.round(average);

  return (
    <p className={styles.reviewSummary}>
      <span className={styles.reviewStars} aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <span
            key={index}
            className={index < filled ? styles.starOn : styles.starOff}
          >
            ★
          </span>
        ))}
      </span>
      <strong>{rounded.toFixed(1)}</strong>
      <span>（{reviews.total} 条评价）</span>
    </p>
  );
}

export function ProductPurchasePanel({
  added,
  error,
  isAdding,
  isFavorite,
  product,
  reviews,
  selectedSku,
  onAddToCart,
  onSelectSku,
  onToggleFavorite,
}: ProductPurchasePanelProps) {
  const [quantity, setQuantity] = useState(1);
  const purchasable = selectedSku ? isSkuPurchasable(selectedSku) : false;
  const stockLabel = availabilityText(selectedSku);
  const hasSkuChoice = product.skus.length > 1;

  return (
    <section className={styles.purchasePanel} aria-labelledby="product-title">
      <div className={styles.productFileHeader}>
        <span className={styles.categoryLabel}>{product.categoryName}</span>
      </div>

      <h1 id="product-title">{product.name}</h1>

      <ReviewSummary reviews={reviews} />
      {product.summary && <p className={styles.summary}>{product.summary}</p>}

      <div className={styles.priceRow}>
        <div className={styles.priceRecord}>
          <small>当前价格</small>
          {selectedSku && <strong>{formatPrice(selectedSku.priceFen)}</strong>}
        </div>
        <div className={styles.stockRecord}>
          <span data-stock={selectedSku?.stock ?? "unavailable"}>
            {stockLabel}
          </span>
        </div>
      </div>

      {hasSkuChoice && (
        <fieldset className={styles.skuSelector}>
          <legend>
            选择规格
            <small aria-hidden="true">
              {product.skus.length} 个规格
            </small>
          </legend>
          <div>
            {product.skus.map((sku) => {
              const label =
                sku.specSummary?.trim() ||
                `${formatPrice(sku.priceFen)} · ${availabilityText(sku)}`;
              const active = sku.id === selectedSku?.id;
              return (
                <button
                  key={sku.id}
                  type="button"
                  className={active ? styles.skuActive : ""}
                  onClick={() => onSelectSku(sku)}
                  aria-pressed={active}
                  aria-label={`选择 ${label}`}
                >
                  <span>{label}</span>
                  {active && <Check aria-hidden="true" size={17} />}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className={styles.quantityRow}>
        <span>数量</span>
        <div className={styles.quantityControl}>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            disabled={quantity <= 1}
            aria-label="减少数量"
          >
            <Minus aria-hidden="true" size={16} />
          </button>
          <output aria-live="polite">{quantity}</output>
          <button
            type="button"
            onClick={() => setQuantity((value) => Math.min(99, value + 1))}
            disabled={quantity >= 99}
            aria-label="增加数量"
          >
            <Plus aria-hidden="true" size={16} />
          </button>
        </div>
      </div>

      <div className={styles.actionRow}>
        <button
          type="button"
          className={styles.addButton}
          disabled={!purchasable || isAdding}
          onClick={() => onAddToCart(quantity)}
          aria-busy={isAdding}
          data-added={added}
        >
          {isAdding ? (
            <>
              <LoaderCircle aria-hidden="true" size={19} />
              正在加入
            </>
          ) : added ? (
            <>
              <Check aria-hidden="true" size={19} />
              已加入购物车
            </>
          ) : (
            <>
              <ShoppingCart aria-hidden="true" size={19} />
              {purchasable ? "加入购物车" : stockLabel}
            </>
          )}
        </button>
        <button
          type="button"
          className={
            isFavorite
              ? `${styles.favoriteButton} ${styles.favoriteButtonOn}`
              : styles.favoriteButton
          }
          onClick={onToggleFavorite}
          aria-pressed={isFavorite}
        >
          <Heart
            aria-hidden="true"
            size={18}
            fill={isFavorite ? "currentColor" : "none"}
          />
          收藏
        </button>
      </div>

      {error && (
        <p className={styles.purchaseError} role="alert">
          {error}
        </p>
      )}

    </section>
  );
}
