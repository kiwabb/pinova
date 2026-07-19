"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import {
  getCategoryHref,
  type StoreCategory,
  type StoreProduct,
} from "@/data/storefront";
import homeStyles from "../home.module.css";
import type { HomeProductGroup } from "../lib/home-merchandising";
import { HomeProductTile } from "./home-product-tile";
import { ProductGrid } from "./product-grid";

interface HomeProductSectionProps {
  appliedSearch: string;
  categories: StoreCategory[];
  favorites: string[];
  productGroups: HomeProductGroup[];
  products: StoreProduct[];
  onAddToCart: (product: StoreProduct) => void;
  onClearFilters: () => void;
  onQuickView: (product: StoreProduct) => void;
  onToggleFavorite: (product: StoreProduct) => void;
}

export function HomeProductSection({
  appliedSearch,
  categories,
  favorites,
  products,
  onAddToCart,
  onClearFilters,
  onQuickView,
  onToggleFavorite,
}: HomeProductSectionProps) {
  const isDefaultView = !appliedSearch;

  return (
    <section
      id="products"
      className={homeStyles.products}
      aria-labelledby="products-title"
    >
      <div className={homeStyles.homeContainer}>
        <header className={homeStyles.sectionHead}>
          <div>
            <h2 id="products-title">
              {isDefaultView ? "推荐商品" : `“${appliedSearch}”的搜索结果`}
            </h2>
            <p>{products.length} 件商品</p>
          </div>
          {isDefaultView ? (
            <Link
              className={homeStyles.sectionMore}
              href={getCategoryHref("all", categories)}
            >
              查看全部
              <ArrowRight aria-hidden="true" size={15} />
            </Link>
          ) : (
            <button
              type="button"
              className={homeStyles.clearBtn}
              onClick={onClearFilters}
            >
              清除筛选
              <X aria-hidden="true" size={15} />
            </button>
          )}
        </header>

        {isDefaultView ? (
          <div className={homeStyles.productGrid}>
            {products.map((product) => (
              <HomeProductTile
                key={product.id}
                isFavorite={favorites.includes(product.id)}
                kind="other"
                kindLabel=""
                product={product}
                onAddToCart={onAddToCart}
                onQuickView={onQuickView}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        ) : (
          <ProductGrid
            products={products}
            favorites={favorites}
            searchQuery={appliedSearch}
            onAddToCart={onAddToCart}
            onQuickView={onQuickView}
            onToggleFavorite={onToggleFavorite}
            emptyAction={
              <Link
                className={homeStyles.inlineLink}
                href={getCategoryHref("starter-kits", categories)}
              >
                查看新手套装
              </Link>
            }
          />
        )}
      </div>
    </section>
  );
}
