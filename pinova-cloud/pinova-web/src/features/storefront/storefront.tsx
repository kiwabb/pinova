"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  findCategoryByCode,
  getCategoryHref,
  type StoreProduct,
} from "@/data/storefront";
import { useShoppingCart } from "@/features/shopping-cart";
import { CartDrawer } from "./components/cart-drawer";
import { CategoryCatalog } from "./components/category-catalog";
import { HomeContent } from "./components/home-content";
import { ProductQuickView } from "./components/product-quick-view";
import { StorefrontFooter } from "./components/storefront-footer";
import { StorefrontHeader } from "./components/storefront-header";
import { useCategoryLoader } from "./hooks/use-category-loader";
import { useFavorites } from "./hooks/use-favorites";
import { useProductSearch } from "./hooks/use-product-search";
import { useToast } from "./hooks/use-toast";
import type { StorefrontProps } from "./types";
import styles from "./storefront-page.module.css";

export function Storefront({
  categories: initialCategories,
  products,
  categoryPageCode,
}: StorefrontProps) {
  const router = useRouter();
  const { message: toast, showToast } = useToast();
  const onCategoryError = useCallback(
    () => showToast("分类加载失败，请重试"),
    [showToast],
  );
  const { categories, loadingCategoryIds, loadCategory } = useCategoryLoader(
    initialCategories,
    onCategoryError,
  );
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quickView, setQuickView] = useState<StoreProduct | null>(null);

  const jumpTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView();
  }, []);
  const showSearchResults = useCallback(() => {
    window.setTimeout(() => jumpTo("products"), 0);
  }, [jumpTo]);
  const effectiveCategoryCode = categoryPageCode ?? "all";
  const search = useProductSearch(
    products,
    effectiveCategoryCode,
    showSearchResults,
  );

  const cart = useShoppingCart();

  useEffect(() => {
    const shouldOpenCart =
      new URLSearchParams(window.location.search).get("cart") === "open";
    if (!shouldOpenCart) return;
    const timer = window.setTimeout(() => setIsCartOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const closeCart = useCallback(() => {
    setIsCartOpen(false);
    const url = new URL(window.location.href);
    if (url.searchParams.get("cart") === "open") {
      url.searchParams.delete("cart");
      window.history.replaceState(
        null,
        "",
        `${url.pathname}${url.search}${url.hash}`,
      );
    }
  }, []);
  const onFavoriteToggle = useCallback(
    (product: StoreProduct, active: boolean) =>
      showToast(active ? `${product.name} 已收藏` : "已取消收藏"),
    [showToast],
  );
  const { favorites, toggleFavorite } = useFavorites(onFavoriteToggle);
  const selectProductSpec = useCallback(
    (product: StoreProduct) => {
      router.push(`/products/${product.id}`);
    },
    [router],
  );
  const categorySearchName = categoryPageCode
    ? findCategoryByCode(categoryPageCode, categories)?.name ?? "当前分类"
    : null;

  const overlayOpen = isCartOpen || Boolean(quickView);
  return (
    <div id="top" className={styles.page}>
      <a className={styles.skipLink} href="#content">
        跳到主要内容
      </a>

      <StorefrontHeader
        cartCount={cart.count}
        categories={categories}
        loadingCategoryIds={loadingCategoryIds}
        search={search.searchProps}
        searchPlaceholder={
          categorySearchName
            ? `在${categorySearchName}中搜索`
            : "搜索色号、图纸、材料或体验"
        }
        onLoadCategory={loadCategory}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main id="content">
        {categoryPageCode ? (
          <CategoryCatalog
            appliedSearch={search.appliedSearch}
            categories={categories}
            currentCode={categoryPageCode}
            favorites={favorites}
            loadingCategoryIds={loadingCategoryIds}
            products={search.filteredProducts}
            onAddToCart={selectProductSpec}
            onLoadCategory={loadCategory}
            onQuickView={setQuickView}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <HomeContent
            appliedSearch={search.appliedSearch}
            categories={categories}
            favorites={favorites}
            products={products}
            visibleProducts={search.filteredProducts}
            onAddToCart={selectProductSpec}
            onClearFilters={search.clear}
            onQuickView={setQuickView}
            onToggleFavorite={toggleFavorite}
          />
        )}
      </main>

      <StorefrontFooter />
      <CartDrawer
        count={cart.count}
        error={cart.error}
        isLoading={cart.isLoading}
        items={cart.cart.items}
        open={isCartOpen}
        pendingItemId={cart.pendingItemId}
        total={cart.selectedTotal}
        onBrowseStarterKits={() => {
          setIsCartOpen(false);
          router.push(getCategoryHref("starter-kits", categories));
        }}
        onClose={closeCart}
        onRefresh={cart.refresh}
        onRemoveItem={cart.removeItem}
        onUpdateQuantity={cart.updateQuantity}
      />
      <ProductQuickView
        product={quickView}
        onAddToCart={selectProductSpec}
        onClose={() => setQuickView(null)}
      />

      <div
        className={`${styles.toast} ${
          overlayOpen ? styles.toastOverlay : ""
        } ${toast ? styles.toastVisible : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast}
      </div>
    </div>
  );
}
