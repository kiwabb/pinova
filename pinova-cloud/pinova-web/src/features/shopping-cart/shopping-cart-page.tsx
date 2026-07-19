"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Home,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import { CommercePageHeader } from "@/components/commerce-page-header";
import type { StoreProduct } from "@/data/storefront";
import { formatPrice } from "@/lib/format-price";
import { useShoppingCart } from "./hooks/use-shopping-cart";
import { ShoppingCartLine } from "./components/shopping-cart-line";
import styles from "./shopping-cart.module.css";

interface ShoppingCartPageProps {
  suggestProducts?: StoreProduct[];
}

export function ShoppingCartPage({
  suggestProducts = [],
}: ShoppingCartPageProps) {
  const {
    cart,
    count,
    error,
    isLoading,
    pendingItemId,
    refresh,
    removeItem,
    selectedCount,
    selectedTotal,
    updateQuantity,
    updateSelected,
  } = useShoppingCart();
  const hasItems = cart.items.length > 0;
  const allSelected = hasItems && cart.items.every((item) => item.selected);
  const canCheckout =
    selectedCount > 0 &&
    cart.items
      .filter((item) => item.selected)
      .every((item) => item.priceFen !== null);

  const suggestions = useMemo(() => {
    const inCart = new Set(
      cart.items.map((item) => item.spuId).filter(Boolean),
    );
    return suggestProducts
      .filter((product) => !inCart.has(product.id))
      .slice(0, 4);
  }, [cart.items, suggestProducts]);

  const toggleSelectAll = () => {
    const next = !allSelected;
    cart.items.forEach((item) => {
      if (item.selected !== next) {
        void updateSelected(item, next);
      }
    });
  };

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#cart-content">
        跳到购物车内容
      </a>

      <CommercePageHeader cartCount={count} currentArea="cart" />

      <main id="cart-content" className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="面包屑">
          <Link href="/">
            <Home aria-hidden="true" size={15} />
            商城首页
          </Link>
          <ChevronRight aria-hidden="true" size={14} />
          <span aria-current="page">购物车</span>
        </nav>

        <div className={styles.cartHeader}>
          <div className={styles.cartTitleIcon} aria-hidden="true">
            <ShoppingCart size={26} />
          </div>
          <div>
            <h1>购物车</h1>
            <p>确认材料清单，开启你的创作之旅</p>
          </div>
        </div>

        {error && (
          <div className={styles.errorBox} role="alert">
            <p>{error}</p>
            <button type="button" onClick={refresh}>
              <RefreshCw aria-hidden="true" size={17} />
              重试
            </button>
          </div>
        )}

        {isLoading ? (
          <div className={styles.loadingState} role="status" aria-live="polite">
            <ShoppingCart aria-hidden="true" size={28} />
            <span>正在读取购物车</span>
          </div>
        ) : hasItems ? (
          <div className={styles.cartWorkspace}>
            <div className={styles.lineColumn}>
              <section className={styles.lineCard} aria-label="购物车商品">
                <div className={styles.tableHead}>
                  <label className={styles.selectAll}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                    />
                    <span className={styles.checkMark} aria-hidden="true">
                      {allSelected ? <Check size={12} strokeWidth={3} /> : null}
                    </span>
                    全选 ({count})
                  </label>
                  <span className={styles.colInfo}>商品信息</span>
                  <span className={styles.colPrice}>单价</span>
                  <span className={styles.colQty}>数量</span>
                  <span className={styles.colTotal}>小计</span>
                  <span className={styles.colAction}>操作</span>
                </div>

                <div className={styles.lineList}>
                  {cart.items.map((item) => (
                    <ShoppingCartLine
                      key={item.id}
                      item={item}
                      pending={pendingItemId === item.id}
                      onRemoveItem={removeItem}
                      onUpdateQuantity={updateQuantity}
                      onUpdateSelected={updateSelected}
                    />
                  ))}
                </div>
              </section>

            </div>

            <aside className={styles.summaryPanel} aria-labelledby="summary-title">
              <div className={styles.summaryHeading}>
                <h2 id="summary-title">购物车汇总</h2>
              </div>
              <dl>
                <div>
                  <dt>已选数量</dt>
                  <dd>{selectedCount} 件</dd>
                </div>
                <div>
                  <dt>商品总计</dt>
                  <dd>{formatPrice(selectedTotal)}</dd>
                </div>
              </dl>
              <div className={styles.summaryActions}>
                {canCheckout && (
                  <Link href="/checkout" className={styles.checkoutAction}>
                    去结算
                    <ArrowRight aria-hidden="true" size={18} />
                  </Link>
                )}
                <Link href="/category/all" className={styles.continueAction}>
                  继续选材
                </Link>
              </div>
            </aside>
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} aria-hidden="true">
              <ShoppingCart size={28} />
            </div>
            <h2>购物车还是空的</h2>
            <p>从材料包、图纸或体验里选一个规格，加入后会显示在这里。</p>
            <Link href="/category/all" className={styles.primaryAction}>
              浏览全部商品
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
          </div>
        )}

        {suggestions.length > 0 && (
          <section className={styles.suggest} aria-labelledby="suggest-title">
            <h2 id="suggest-title">你可能还需要</h2>
            <div className={styles.suggestGrid}>
              {suggestions.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.id}`}
                  className={styles.suggestProduct}
                >
                  <span className={styles.suggestMedia}>
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.imageAlt || product.name}
                        fill
                        sizes="(max-width: 767px) 50vw, 25vw"
                      />
                    ) : (
                      <span className={styles.suggestPlaceholder} aria-hidden="true" />
                    )}
                  </span>
                  <span className={styles.suggestBody}>
                    <strong>{product.name}</strong>
                    {product.priceFen !== null ? (
                      <em>{formatPrice(product.priceFen)}</em>
                    ) : (
                      <small>{product.categoryName}</small>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
