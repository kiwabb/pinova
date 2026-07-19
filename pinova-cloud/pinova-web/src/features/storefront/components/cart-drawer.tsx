"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Minus,
  Plus,
  RefreshCw,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import type { ShoppingCartItem } from "@/data/shopping-cart";
import { useOverlayDialog } from "../hooks/use-overlay-dialog";
import { formatPrice } from "../lib/format";
import { OverlayShell } from "./overlay-shell";
import styles from "./overlay.module.css";

interface CartDrawerProps {
  count: number;
  error: string | null;
  isLoading: boolean;
  items: ShoppingCartItem[];
  open: boolean;
  pendingItemId: string | null;
  total: number;
  onBrowseStarterKits: () => void;
  onClose: () => void;
  onRefresh: () => void;
  onRemoveItem: (item: ShoppingCartItem) => void;
  onUpdateQuantity: (item: ShoppingCartItem, quantity: number) => void;
}

export function CartDrawer({
  count,
  error,
  isLoading,
  items,
  open,
  pendingItemId,
  total,
  onBrowseStarterKits,
  onClose,
  onRefresh,
  onRemoveItem,
  onUpdateQuantity,
}: CartDrawerProps) {
  const dialogRef = useOverlayDialog<HTMLElement>({ isOpen: open, onClose });
  if (!open) return null;

  return (
    <OverlayShell closeLabel="关闭购物车" onClose={onClose}>
      <aside
        ref={dialogRef}
        className={styles.cartDrawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-title"
        tabIndex={-1}
      >
        <div className={styles.drawerHeader}>
          <div>
            <p className={styles.eyebrow}>已选商品</p>
            <h2 id="cart-title">购物车 · {count} 件</h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="关闭购物车"
          >
            <X aria-hidden="true" size={21} />
          </button>
        </div>

        {error && (
          <div className={styles.cartError} role="alert">
            <p>{error}</p>
            <button type="button" onClick={onRefresh}>
              <RefreshCw aria-hidden="true" size={16} />
              重试
            </button>
          </div>
        )}

        {isLoading ? (
          <div className={styles.cartLoading} role="status" aria-live="polite">
            <ShoppingBag aria-hidden="true" size={28} />
            <span>正在读取购物车</span>
          </div>
        ) : items.length ? (
          <div className={styles.cartContent}>
            <div className={styles.cartList}>
              {items.map((item) => {
                const productName = item.productName ?? "未命名商品";
                const pending = pendingItemId === item.id;
                return (
                <div key={item.id} className={styles.cartItem} aria-busy={pending}>
                  <div className={styles.cartThumb}>
                    {item.imageUrl && (
                      <Image src={item.imageUrl} alt="" fill sizes="72px" />
                    )}
                  </div>
                  <div className={styles.cartItemInfo}>
                    <strong>{productName}</strong>
                    {item.skuSpecSummary && <small>{item.skuSpecSummary}</small>}
                    {item.priceFen !== null && (
                      <span>{formatPrice(item.priceFen)}</span>
                    )}
                    <div className={styles.quantityControl}>
                      <button
                        type="button"
                        disabled={pending || item.quantity <= 1}
                        onClick={() => onUpdateQuantity(item, item.quantity - 1)}
                        aria-label={`减少 ${productName} 数量`}
                      >
                        <Minus aria-hidden="true" size={15} />
                      </button>
                      <output
                        aria-live="polite"
                        aria-label={`${productName} 数量`}
                      >
                        {item.quantity}
                      </output>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onUpdateQuantity(item, item.quantity + 1)}
                        aria-label={`增加 ${productName} 数量`}
                      >
                        <Plus aria-hidden="true" size={15} />
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.removeButton}
                    disabled={pending}
                    onClick={() => onRemoveItem(item)}
                    aria-label={`移除 ${productName}`}
                  >
                    <Trash2 aria-hidden="true" size={17} />
                  </button>
                </div>
              );
              })}
            </div>
            <div className={styles.cartSummary}>
              <div>
                <span>已选合计</span>
                <strong>{formatPrice(total)}</strong>
              </div>
              <Link
                className={styles.primaryButton}
                href="/cart"
                onClick={onClose}
              >
                查看购物车
                <ArrowRight aria-hidden="true" size={18} />
              </Link>
            </div>
          </div>
        ) : (
          <div className={styles.cartEmpty}>
            <ShoppingBag aria-hidden="true" size={30} />
            <h3>购物车还是空的</h3>
            <p>从一份材料包开始，把今天的灵感带回家。</p>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={onBrowseStarterKits}
            >
              去逛新手套装
            </button>
          </div>
        )}
      </aside>
    </OverlayShell>
  );
}
