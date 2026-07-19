import { ArrowRight, LoaderCircle, ShieldAlert } from "lucide-react";
import { formatPrice } from "@/lib/format-price";
import styles from "../checkout.module.css";

interface CheckoutSummaryProps {
  disabled: boolean;
  error: string | null;
  isSubmitting: boolean;
  itemCount: number;
  productTotalFen: number;
  onSubmit: () => void;
}

export function CheckoutSummary({
  disabled,
  error,
  isSubmitting,
  itemCount,
  productTotalFen,
  onSubmit,
}: CheckoutSummaryProps) {
  return (
    <aside className={styles.summary} aria-labelledby="checkout-summary-title">
      <h2 id="checkout-summary-title">订单汇总</h2>
      <dl>
        <div>
          <dt>商品数量</dt>
          <dd>{itemCount} 件</dd>
        </div>
        <div className={styles.summaryTotal}>
          <dt>商品总计</dt>
          <dd>{formatPrice(productTotalFen)}</dd>
        </div>
      </dl>

      {error && (
        <div className={styles.submitError} role="alert">
          <ShieldAlert aria-hidden="true" size={18} />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        className={styles.submitButton}
        disabled={disabled || isSubmitting}
        onClick={onSubmit}
      >
        {isSubmitting ? (
          <LoaderCircle className={styles.spinner} aria-hidden="true" size={19} />
        ) : (
          <ArrowRight aria-hidden="true" size={19} />
        )}
        {isSubmitting ? "正在提交" : "提交订单"}
      </button>
    </aside>
  );
}
