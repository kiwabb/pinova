"use client";

import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import type { StoreProduct } from "@/data/storefront";
import { useOverlayDialog } from "../hooks/use-overlay-dialog";
import { formatPrice } from "../lib/format";
import { getProductPurchaseState } from "../lib/product-purchase";
import { OverlayShell } from "./overlay-shell";
import styles from "./overlay.module.css";

interface ProductQuickViewProps {
  product: StoreProduct | null;
  onAddToCart: (product: StoreProduct) => void;
  onClose: () => void;
}

export function ProductQuickView({
  product,
  onAddToCart,
  onClose,
}: ProductQuickViewProps) {
  const dialogRef = useOverlayDialog<HTMLElement>({
    isOpen: Boolean(product),
    onClose,
  });
  if (!product) return null;
  const purchaseState = getProductPurchaseState(product);
  const description = product.description?.trim();

  return (
    <OverlayShell closeLabel="关闭商品预览" onClose={onClose}>
      <section
        ref={dialogRef}
        className={styles.quickView}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quick-view-title"
        tabIndex={-1}
      >
        <button
          type="button"
          className={styles.quickClose}
          onClick={onClose}
          aria-label="关闭商品详情"
        >
          <X aria-hidden="true" size={21} />
        </button>
        <div className={styles.quickImage}>
          {product.image && (
            <Image
              src={product.image}
              alt={product.imageAlt}
              fill
              loading="eager"
              sizes="(max-width: 767px) 100vw, 48vw"
            />
          )}
        </div>
        <div className={styles.quickContent}>
          <span className={styles.productCategory}>{product.categoryName}</span>
          <h2 id="quick-view-title">{product.name}</h2>
          {description && <p>{description}</p>}
          {product.priceFen !== null && (
            <div className={styles.quickPrice}>
              <strong>{formatPrice(product.priceFen)}</strong>
            </div>
          )}
          <button
            type="button"
            className={styles.primaryButton}
            disabled={!purchaseState.purchasable}
            onClick={() => {
              onAddToCart(product);
              onClose();
            }}
          >
            {purchaseState.actionLabel}
          </button>
          <Link
            className={styles.quickDetailLink}
            href={`/products/${product.id}`}
            onClick={onClose}
          >
            查看完整商品档案
          </Link>
        </div>
      </section>
    </OverlayShell>
  );
}
