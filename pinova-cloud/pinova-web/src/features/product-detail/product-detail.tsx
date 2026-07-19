"use client";

import { ChevronRight, Home } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CommercePageHeader } from "@/components/commerce-page-header";
import type { ProductDetailData, ProductDetailSku } from "@/data/product-detail";
import type { ProductReviewPage } from "@/data/product-review";
import { useShoppingCart } from "@/features/shopping-cart";
import { parseStoredStringArray } from "@/lib/local-storage-parsers";
import { ProductContent } from "./components/product-content";
import { ProductGallery } from "./components/product-gallery";
import { ProductPurchasePanel } from "./components/product-purchase-panel";
import { ProductReviews } from "./components/product-reviews";
import { indexProductMedia, resolveDisplayMedia } from "./lib/product-media";
import styles from "./product-detail.module.css";

const FAVORITES_KEY = "pinova-demo-favorites";

interface ProductDetailProps {
  initialSkuId?: string;
  initialReviewError: string | null;
  initialReviews: ProductReviewPage;
  product: ProductDetailData;
}

export function ProductDetail({
  initialReviewError,
  initialReviews,
  product,
  initialSkuId,
}: ProductDetailProps) {
  const initialSku =
    product.skus.find((sku) => sku.id === initialSkuId) ?? product.skus[0] ?? null;
  const [selectedSkuId, setSelectedSkuId] = useState(initialSku?.id ?? null);
  const selectedSku =
    product.skus.find((sku) => sku.id === selectedSkuId) ?? product.skus[0] ?? null;
  const displayMedia = resolveDisplayMedia(product, selectedSku);
  const [selectedMediaId, setSelectedMediaId] = useState(displayMedia[0]?.id ?? null);
  const [added, setAdded] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const mediaByObjectKey = useMemo(() => indexProductMedia(product), [product]);
  const cart = useShoppingCart();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFavorites(
        parseStoredStringArray(window.localStorage.getItem(FAVORITES_KEY)),
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const selectSku = (sku: ProductDetailSku) => {
    setSelectedSkuId(sku.id);
    setSelectedMediaId(resolveDisplayMedia(product, sku)[0]?.id ?? null);
    setAdded(false);
    window.history.replaceState(null, "", `/products/${product.id}?skuId=${sku.id}`);
  };

  const addToCart = async (quantity: number) => {
    if (!selectedSku) return;
    const success = await cart.addSku(selectedSku.id, quantity);
    setAdded(success);
  };

  const toggleFavorite = () => {
    const active = !favorites.includes(product.id);
    const next = active
      ? [...favorites, product.id]
      : favorites.filter((id) => id !== product.id);
    setFavorites(next);
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  };

  const pendingSkuId = selectedSku ? `sku:${selectedSku.id}` : null;
  return (
    <div className={styles.page}>
      <CommercePageHeader cartCount={cart.count} />

      <main className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="面包屑">
          <Link href="/">
            <Home aria-hidden="true" size={15} />
            首页
          </Link>
          <ChevronRight aria-hidden="true" size={14} />
          <Link href={`/category/${product.categoryPathCodes.join("/")}`}>
            {product.categoryName}
          </Link>
          <ChevronRight aria-hidden="true" size={14} />
          <span aria-current="page">{product.name}</span>
        </nav>

        <div className={styles.productLayout}>
          <ProductGallery
            media={displayMedia}
            productName={product.name}
            selectedMediaId={selectedMediaId}
            onSelectMedia={setSelectedMediaId}
          />
          <ProductPurchasePanel
            added={added}
            error={cart.error}
            isAdding={pendingSkuId !== null && cart.pendingItemId === pendingSkuId}
            isFavorite={favorites.includes(product.id)}
            product={product}
            reviews={initialReviews}
            selectedSku={selectedSku}
            onAddToCart={addToCart}
            onSelectSku={selectSku}
            onToggleFavorite={toggleFavorite}
          />
        </div>

        <ProductContent content={product.detail} mediaByObjectKey={mediaByObjectKey} />
        <ProductReviews
          initialError={initialReviewError}
          initialPage={initialReviews}
          productId={product.id}
          productName={product.name}
        />
      </main>
    </div>
  );
}
