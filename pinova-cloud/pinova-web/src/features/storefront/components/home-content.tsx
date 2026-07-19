"use client";

import type { StoreCategory, StoreProduct } from "@/data/storefront";
import { CategoryShowcase } from "./category-showcase";
import { HomeHero } from "./home-hero";
import { HomeProductSection } from "./home-product-section";
import { StorePromo } from "./store-promo";
import { getHomeMerchandising } from "../lib/home-merchandising";

interface HomeContentProps {
  appliedSearch: string;
  categories: StoreCategory[];
  favorites: string[];
  products: StoreProduct[];
  visibleProducts: StoreProduct[];
  onAddToCart: (product: StoreProduct) => void;
  onClearFilters: () => void;
  onQuickView: (product: StoreProduct) => void;
  onToggleFavorite: (product: StoreProduct) => void;
}

export function HomeContent(props: HomeContentProps) {
  const merchandising = getHomeMerchandising(props.products);

  return (
    <>
      <HomeHero product={merchandising.featuredProduct} />
      <CategoryShowcase categories={props.categories} />
      <HomeProductSection
        appliedSearch={props.appliedSearch}
        categories={props.categories}
        favorites={props.favorites}
        productGroups={merchandising.productGroups}
        products={props.visibleProducts}
        onAddToCart={props.onAddToCart}
        onClearFilters={props.onClearFilters}
        onQuickView={props.onQuickView}
        onToggleFavorite={props.onToggleFavorite}
      />
      {!props.appliedSearch && <StorePromo />}
    </>
  );
}
