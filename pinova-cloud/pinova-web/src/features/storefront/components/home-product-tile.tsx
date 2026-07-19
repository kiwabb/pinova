"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart } from "lucide-react";
import type { StoreProduct } from "@/data/storefront";
import homeStyles from "../home.module.css";
import { formatPrice } from "../lib/format";
import type { HomeProductKind } from "../lib/home-merchandising";
import { getProductPurchaseState } from "../lib/product-purchase";

interface HomeProductTileProps {
  isFavorite: boolean;
  kind: HomeProductKind;
  kindLabel: string;
  product: StoreProduct;
  onAddToCart: (product: StoreProduct) => void;
  onQuickView: (product: StoreProduct) => void;
  onToggleFavorite: (product: StoreProduct) => void;
}

export function HomeProductTile({
  isFavorite,
  product,
  onAddToCart,
  onToggleFavorite,
}: HomeProductTileProps) {
  const purchaseState = getProductPurchaseState(product);

  return (
    <article className={homeStyles.product}>
      <div className={homeStyles.productMedia}>
        <Link
          className={homeStyles.productImageLink}
          href={`/products/${product.id}`}
          aria-label={`查看 ${product.name}`}
        >
          {product.image ? (
            <Image
              src={product.image}
              alt={product.imageAlt}
              fill
              loading="lazy"
              sizes="(max-width: 539px) 50vw, (max-width: 1023px) 33vw, 25vw"
            />
          ) : (
            <span className={homeStyles.productPlaceholder} aria-hidden="true" />
          )}
        </Link>
        <button
          type="button"
          className={
            isFavorite
              ? `${homeStyles.productFav} ${homeStyles.productFavOn}`
              : homeStyles.productFav
          }
          onClick={() => onToggleFavorite(product)}
          aria-label={
            isFavorite ? `取消收藏 ${product.name}` : `收藏 ${product.name}`
          }
          aria-pressed={isFavorite}
        >
          <Heart
            aria-hidden="true"
            size={16}
            fill={isFavorite ? "currentColor" : "none"}
          />
        </button>
      </div>

      <div className={homeStyles.productBody}>
        <h3>
          <Link href={`/products/${product.id}`}>{product.name}</Link>
        </h3>
        <div className={homeStyles.productFoot}>
          {product.priceFen !== null ? (
            <strong className={homeStyles.productPrice}>
              {formatPrice(product.priceFen)}
            </strong>
          ) : (
            <span className={homeStyles.productPriceEmpty}>暂无报价</span>
          )}
          <button
            type="button"
            className={homeStyles.productCart}
            disabled={!purchaseState.purchasable}
            onClick={() => onAddToCart(product)}
            aria-label={`${purchaseState.actionLabel}：${product.name}`}
          >
            {purchaseState.purchasable ? "加购" : purchaseState.actionLabel}
          </button>
        </div>
      </div>
    </article>
  );
}
