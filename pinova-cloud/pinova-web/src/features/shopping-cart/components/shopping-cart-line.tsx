import Image from "next/image";
import Link from "next/link";
import { Check, Minus, Plus, Trash2 } from "lucide-react";
import type { ShoppingCartItem } from "@/data/shopping-cart";
import { formatPrice } from "@/lib/format-price";
import styles from "../shopping-cart.module.css";

interface ShoppingCartLineProps {
  item: ShoppingCartItem;
  pending: boolean;
  onRemoveItem: (item: ShoppingCartItem) => void;
  onUpdateQuantity: (item: ShoppingCartItem, quantity: number) => void;
  onUpdateSelected: (item: ShoppingCartItem, selected: boolean) => void;
}

export function ShoppingCartLine({
  item,
  pending,
  onRemoveItem,
  onUpdateQuantity,
  onUpdateSelected,
}: ShoppingCartLineProps) {
  const productName = item.productName ?? "未命名商品";
  const itemTotal =
    item.priceFen === null ? null : item.priceFen * item.quantity;
  return (
    <article className={styles.cartLine} aria-busy={pending}>
      <label className={styles.selectControl}>
        <input
          type="checkbox"
          checked={item.selected}
          disabled={pending}
          onChange={(event) =>
            onUpdateSelected(item, event.currentTarget.checked)
          }
        />
        <span className={styles.checkMark} aria-hidden="true">
          {item.selected ? <Check size={12} strokeWidth={3} /> : null}
        </span>
        <span className={styles.srOnly}>选择 {productName}</span>
      </label>

      <Link href={`/products/${item.spuId}`} className={styles.itemMedia}>
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt=""
            fill
            sizes="(max-width: 719px) 88px, 96px"
          />
        ) : (
          <span aria-hidden="true" />
        )}
      </Link>

      <div className={styles.itemInfo}>
        <Link href={`/products/${item.spuId}`} className={styles.itemName}>
          {productName}
        </Link>
        {item.skuSpecSummary && (
          <p className={styles.itemSpec}>{item.skuSpecSummary}</p>
        )}
      </div>

      <div className={styles.unitPrice}>
        {item.priceFen !== null ? (
          <strong>{formatPrice(item.priceFen)}</strong>
        ) : (
          <span>-</span>
        )}
      </div>

      <div className={styles.quantityControl}>
        <button
          type="button"
          disabled={pending || item.quantity <= 1}
          onClick={() => onUpdateQuantity(item, item.quantity - 1)}
          aria-label={`减少 ${productName} 数量`}
        >
          <Minus aria-hidden="true" size={15} />
        </button>
        <output aria-live="polite" aria-label={`${productName} 数量`}>
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

      <div className={styles.lineTotal}>
        {itemTotal !== null ? (
          <strong>{formatPrice(itemTotal)}</strong>
        ) : (
          <span>-</span>
        )}
      </div>

      <button
        type="button"
        className={styles.removeButton}
        disabled={pending}
        onClick={() => onRemoveItem(item)}
        aria-label={`移除 ${productName}`}
      >
        <Trash2 aria-hidden="true" size={18} />
      </button>
    </article>
  );
}
