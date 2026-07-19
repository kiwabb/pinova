import { Tag } from "antd";

import { getOrderStatus } from "../lib/order-format";

export function OrderStatusTag({ status }: { status: number }) {
  const value = getOrderStatus(status);
  return <Tag color={value.color}>{value.label}</Tag>;
}

