import { Search } from "lucide-react";
import type { ReactNode } from "react";
import type { StoreProduct } from "@/data/storefront";
import { ProductCard } from "./product-card";
import styles from "./product-grid.module.css";

interface ProductGridProps {
  products: StoreProduct[];
  favorites: string[];
  emptyAction?: ReactNode;
  searchQuery?: string;
  onAddToCart: (product: StoreProduct) => void;
  onQuickView: (product: StoreProduct) => void;
  onToggleFavorite: (product: StoreProduct) => void;
}

export function ProductGrid({
  products,
  favorites,
  emptyAction,
  searchQuery,
  onAddToCart,
  onQuickView,
  onToggleFavorite,
}: ProductGridProps) {
  if (!products.length) {
    const normalizedSearchQuery = searchQuery?.trim();
    return (
      <div className={styles.emptyState}>
        <Search aria-hidden="true" size={28} />
        <h3>
          {normalizedSearchQuery
            ? `没有找到与“${normalizedSearchQuery}”匹配的商品`
            : "当前分类没有商品"}
        </h3>
        <p>
          {normalizedSearchQuery
            ? "请尝试更短的关键词，或清除搜索条件后继续浏览。"
            : "请选择其他分类继续浏览。"}
        </p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className={styles.productGrid}>
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          highPriorityImage={index === 0}
          isFavorite={favorites.includes(product.id)}
          product={product}
          onAddToCart={onAddToCart}
          onQuickView={onQuickView}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
