import type {
  MemberOrderStatus,
  MemberOrderStatusFilter,
} from "../types";

interface MemberOrderFilterOption {
  label: string;
  queryValue: number | null;
  value: MemberOrderStatusFilter;
}

export const MEMBER_ORDER_FILTERS: readonly MemberOrderFilterOption[] = [
  { value: "ALL", label: "全部", queryValue: null },
  { value: "PENDING_PAYMENT", label: "待支付", queryValue: 0 },
  { value: "PENDING_FULFILLMENT", label: "待履约", queryValue: 1 },
  { value: "FULFILLING", label: "履约中", queryValue: 2 },
  { value: "COMPLETED", label: "已完成", queryValue: 3 },
  { value: "CLOSED", label: "已关闭", queryValue: 4 },
  { value: "REFUNDED", label: "已退款", queryValue: 5 },
];

const STATUS_LABELS: Record<MemberOrderStatus, string> = {
  PENDING_PAYMENT: "待支付",
  PENDING_FULFILLMENT: "待履约",
  FULFILLING: "履约中",
  COMPLETED: "已完成",
  CLOSED: "已关闭",
  REFUNDED: "已退款",
};

const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function isMemberOrderStatus(value: string): value is MemberOrderStatus {
  return Object.hasOwn(STATUS_LABELS, value);
}

export function memberOrderStatusLabel(status: MemberOrderStatus) {
  return STATUS_LABELS[status];
}

export function memberOrderStatusQuery(filter: MemberOrderStatusFilter) {
  return MEMBER_ORDER_FILTERS.find((option) => option.value === filter)?.queryValue ?? null;
}

export function formatMemberOrderTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
}
