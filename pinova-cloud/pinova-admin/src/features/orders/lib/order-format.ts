const statusLabels: Record<number, { label: string; color: string }> = {
  0: { label: "待支付", color: "gold" },
  1: { label: "待履约", color: "blue" },
  2: { label: "履约中", color: "cyan" },
  3: { label: "已完成", color: "green" },
  4: { label: "已关闭", color: "default" },
};

export const orderStatusOptions = Object.entries(statusLabels).map(([value, item]) => ({
  value,
  label: item.label,
}));

export function getOrderStatus(status: number) {
  return statusLabels[status] ?? { label: "未知状态", color: "red" };
}

export function formatOrderMoney(amountFen: number, currencyCode: string) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(amountFen / 100);
}

export function formatOrderDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function fulfillmentLabel(value: number) {
  return ({ 1: "实物配送", 2: "数字交付", 3: "到店服务" } as Record<number, string>)[value] ?? "未知";
}

