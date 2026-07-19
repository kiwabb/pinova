import Image from "next/image";
import Link from "next/link";
import type { ShoppingCartItem } from "@/data/shopping-cart";
import { formatPrice } from "@/lib/format-price";
import styles from "../checkout.module.css";

interface CheckoutItemListProps {
  items: ShoppingCartItem[];
}

export function CheckoutItemList({ items }: CheckoutItemListProps) {
  return (
    <section className={styles.section} aria-labelledby="checkout-items-title">
      <div className={styles.sectionHeading}>
        <div>
          <span>02</span>
          <h2 id="checkout-items-title">商品清单</h2>
        </div>
        <Link href="/cart">返回修改</Link>
      </div>

      <div className={styles.itemList}>
        {items.map((item) => {
          const name = item.productName ?? "未命名商品";
          const lineTotal = item.priceFen === null ? null : item.priceFen * item.quantity;
          return (
            <article key={item.id} className={styles.itemLine}>
              <Link href={`/products/${item.spuId}`} className={styles.itemMedia}>
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt=""
                    fill
                    sizes="(max-width: 719px) 72px, 80px"
                  />
                ) : (
                  <span aria-hidden="true" />
                )}
              </Link>
              <div className={styles.itemInfo}>
                <Link href={`/products/${item.spuId}`}>{name}</Link>
                {item.skuSpecSummary && <span>{item.skuSpecSummary}</span>}
              </div>
              <div className={styles.itemPrice}>
                <span>{item.priceFen === null ? "-" : formatPrice(item.priceFen)}</span>
                <small>× {item.quantity}</small>
              </div>
              <strong className={styles.itemTotal}>
                {lineTotal === null ? "-" : formatPrice(lineTotal)}
              </strong>
            </article>
          );
        })}
      </div>
    </section>
  );
}
