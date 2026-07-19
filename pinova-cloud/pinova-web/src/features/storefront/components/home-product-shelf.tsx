"use client";

import type { StoreProduct } from "@/data/storefront";
import homeStyles from "../home.module.css";
import type { HomeProductGroup } from "../lib/home-merchandising";
import { HomeProductTile } from "./home-product-tile";

interface HomeProductShelfProps {
  favorites: string[];
  group: HomeProductGroup;
  onAddToCart: (product: StoreProduct) => void;
  onQuickView: (product: StoreProduct) => void;
  onToggleFavorite: (product: StoreProduct) => void;
}

export function HomeProductShelf({
  favorites,
  group,
  onAddToCart,
  onQuickView,
  onToggleFavorite,
}: HomeProductShelfProps) {
  const titleId = `home-shelf-${group.kind}`;

  return (
    <section
      className={homeStyles.homeShelf}
      data-kind={group.kind}
      aria-labelledby={titleId}
    >
      <header className={homeStyles.homeShelfHeader}>
        <span>{group.index}</span>
        <p>{group.label}</p>
        <h3 id={titleId}>{group.title}</h3>
        <small>{group.description}</small>
      </header>
      <div className={homeStyles.homeShelfGrid}>
        {group.products.map((product) => (
          <HomeProductTile
            key={product.id}
            isFavorite={favorites.includes(product.id)}
            kind={group.kind}
            kindLabel={group.label}
            product={product}
            onAddToCart={onAddToCart}
            onQuickView={onQuickView}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    </section>
  );
}
