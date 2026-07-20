"use client";

import Link from "next/link";
import { ArrowLeft, ShoppingBag, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { getShoppingCart } from "@/lib/shopping-cart-api";
import { PinovaBrand } from "./pinova-brand";
import styles from "./commerce-page-header.module.css";

interface CommercePageHeaderProps {
  backHref?: string;
  backLabel?: string;
  cartCount?: number;
  currentArea?: "account" | "cart";
  showNavigation?: boolean;
}

export function CommercePageHeader({
  backHref,
  backLabel,
  cartCount,
  currentArea,
  showNavigation = true,
}: CommercePageHeaderProps) {
  const [fetchedCartCount, setFetchedCartCount] = useState<number | null>(null);

  useEffect(() => {
    if (cartCount !== undefined) return;
    let active = true;
    void getShoppingCart()
      .then((cart) => {
        if (active) {
          setFetchedCartCount(
            cart.items.reduce((total, item) => total + item.quantity, 0),
          );
        }
      })
      .catch(() => {
        if (active) setFetchedCartCount(null);
      });
    return () => {
      active = false;
    };
  }, [cartCount]);

  const displayedCartCount = cartCount ?? fetchedCartCount;

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link className={styles.brand} href="/" aria-label="Pinova 商城首页">
          <PinovaBrand />
        </Link>

        {showNavigation && (
          <nav className={styles.navigation} aria-label="主要导航">
            <Link href="/category/all">全部分类</Link>
            <Link href="/category/starter-kits">新手套装</Link>
            <Link href="/#products">商品</Link>
            <Link href="/category/store-experience">到店体验</Link>
            <Link href="/category/pattern-kits">灵感图集</Link>
          </nav>
        )}

        <div className={styles.actions}>
          {backHref && backLabel && (
            <Link className={styles.backLink} href={backHref}>
              <ArrowLeft aria-hidden="true" size={17} />
              <span>{backLabel}</span>
            </Link>
          )}
          <Link
            className={styles.actionLink}
            href="/account"
            aria-current={currentArea === "account" ? "page" : undefined}
            aria-label="会员账户"
          >
            <UserRound aria-hidden="true" size={19} />
            <span>账户</span>
          </Link>
          <Link
            className={styles.actionLink}
            href="/cart"
            aria-current={currentArea === "cart" ? "page" : undefined}
            aria-label={
              displayedCartCount === null
                ? "购物车"
                : `购物车，共 ${displayedCartCount} 件商品`
            }
          >
            <ShoppingBag aria-hidden="true" size={19} />
            <span>购物车</span>
            {displayedCartCount !== null && displayedCartCount > 0 && (
              <b>
                {displayedCartCount > 99 ? "99+" : displayedCartCount}
              </b>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
