import Image from "next/image";
import { CreditCard, Package } from "lucide-react";
import { formatPrice } from "@/lib/format-price";
import {
  formatMemberOrderTime,
  memberOrderStatusLabel,
} from "../lib/member-order-status";
import type { MemberOrder } from "../types";
import styles from "../member-orders.module.css";

interface MemberOrderCardProps {
  order: MemberOrder;
  onPay: (checkoutNo: string) => void;
}

export function MemberOrderCard({ order, onPay }: MemberOrderCardProps) {
  const headingId = `order-${order.orderNo}`;
  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <article className={styles.orderCard} aria-labelledby={headingId}>
      <header className={styles.orderHeader}>
        <div className={styles.orderIdentity}>
          <span className={styles.orderStatus} data-status={order.status}>
            <i aria-hidden="true" />
            {memberOrderStatusLabel(order.status)}
          </span>
          <time dateTime={order.submittedAt}>
            {formatMemberOrderTime(order.submittedAt)}
          </time>
        </div>
        <div className={styles.orderNumber}>
          <span>订单号</span>
          <strong id={headingId}>{order.orderNo}</strong>
        </div>
      </header>

      <div className={styles.orderItems}>
        {order.items.map((item, index) => (
          <div className={styles.orderItem} key={`${item.productName}-${index}`}>
            <div className={styles.itemMedia}>
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt="" fill sizes="72px" />
              ) : (
                <Package aria-hidden="true" size={23} />
              )}
            </div>
            <div className={styles.itemInfo}>
              <strong>{item.productName}</strong>
              {item.skuSpec && <span>{item.skuSpec}</span>}
            </div>
            <div className={styles.itemQuantity}>
              <span>{formatPrice(item.unitPriceFen)}</span>
              <small>× {item.quantity}</small>
            </div>
            <strong className={styles.itemTotal}>
              {formatPrice(item.payableAmountFen)}
            </strong>
          </div>
        ))}
      </div>

      <footer className={styles.orderFooter}>
        <span>共 {itemCount} 件商品</span>
        <div>
          <span>订单金额</span>
          <strong>{formatPrice(order.payableAmountFen)}</strong>
        </div>
        {order.status === "PENDING_PAYMENT" && (
          <button
            className={styles.payButton}
            type="button"
            onClick={() => onPay(order.checkoutNo)}
          >
            <CreditCard aria-hidden="true" size={16} />
            去支付
          </button>
        )}
      </footer>
    </article>
  );
}
