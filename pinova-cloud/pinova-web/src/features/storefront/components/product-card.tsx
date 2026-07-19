"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, Heart, ShoppingBag } from "lucide-react";
import type { StoreProduct } from "@/data/storefront";
import { formatPrice } from "../lib/format";
import { getProductPurchaseState } from "../lib/product-purchase";
import styles from "./product-card.module.css";

interface ProductCardProps {
  highPriorityImage: boolean;
  isFavorite: boolean;
  product: StoreProduct;
  onAddToCart: (product: StoreProduct) => void;
  onQuickView: (product: StoreProduct) => void;
  onToggleFavorite: (product: StoreProduct) => void;
}

export function ProductCard({
  highPriorityImage,
  isFavorite,
  product,
  onAddToCart,
  onQuickView,
  onToggleFavorite,
}: ProductCardProps) {
  const purchaseState = getProductPurchaseState(product);

  return (
    <article className={styles.productSample}>
      <div className={styles.productMedia}>
        <Link
          href={`/products/${product.id}`}
          className={styles.productImageLink}
          aria-label={`查看 ${product.name} 详情`}
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.imageAlt}
              fill
              fetchPriority={highPriorityImage ? "high" : "auto"}
              loading={highPriorityImage ? "eager" : "lazy"}
              sizes="(max-width: 767px) 42vw, (max-width: 1119px) 50vw, 33vw"
            />
          ) : (
            <span className={styles.productImagePlaceholder} aria-hidden="true">
              <span />
            </span>
          )}
        </Link>

        {purchaseState.stockLabel && (
          <span
            className={styles.productStockBadge}
            data-tone={purchaseState.stockTone}
          >
            {purchaseState.stockLabel}
          </span>
        )}

        <div className={styles.productActionRail}>
          <button
            type="button"
            className={`${styles.mediaAction} ${
              isFavorite ? styles.favoriteActive : ""
            }`}
            onClick={() => onToggleFavorite(product)}
            aria-label={
              isFavorite ? `取消收藏 ${product.name}` : `收藏 ${product.name}`
            }
            aria-pressed={isFavorite}
            title={isFavorite ? "取消收藏" : "收藏"}
          >
            <Heart
              aria-hidden="true"
              size={18}
              fill={isFavorite ? "currentColor" : "none"}
            />
          </button>

          <button
            type="button"
            className={styles.mediaAction}
            onClick={() => onQuickView(product)}
            aria-label={`快速预览 ${product.name}`}
            title="快速预览"
          >
            <Eye aria-hidden="true" size={18} />
          </button>
        </div>
      </div>

      <div className={styles.productInfo}>
        <div className={styles.productArchiveLine}>
          <span className={styles.productCategory}>{product.categoryName}</span>
        </div>
        <Link href={`/products/${product.id}`} className={styles.productName}>
          {product.name}
        </Link>
        <div className={styles.productPurchaseRow}>
          <div className={styles.productMeta}>
            {product.priceFen !== null && (
              <strong>{formatPrice(product.priceFen)}</strong>
            )}
          </div>
          <button
            type="button"
            className={styles.addButton}
            disabled={!purchaseState.purchasable}
            onClick={() => onAddToCart(product)}
            aria-label={`${purchaseState.actionLabel}：${product.name}`}
          >
            <ShoppingBag aria-hidden="true" size={17} />
            <span>{purchaseState.actionLabel}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
