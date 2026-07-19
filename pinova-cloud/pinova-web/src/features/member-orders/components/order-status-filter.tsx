import { MEMBER_ORDER_FILTERS } from "../lib/member-order-status";
import type { MemberOrderStatusFilter } from "../types";
import styles from "../member-orders.module.css";

interface OrderStatusFilterProps {
  value: MemberOrderStatusFilter;
  onSelect: (value: MemberOrderStatusFilter) => void;
}

export function OrderStatusFilter({ value, onSelect }: OrderStatusFilterProps) {
  return (
    <div className={styles.statusFilters} aria-label="按订单状态筛选">
      {MEMBER_ORDER_FILTERS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
