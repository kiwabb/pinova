import type { Metadata } from "next";
import { CheckoutPage } from "@/features/checkout";

export const metadata: Metadata = {
  title: "确认订单 | PINOVA 色谱工作台",
  description: "核对购物车商品和收货地址并提交 Pinova 订单。",
};

export default function CheckoutRoute() {
  return <CheckoutPage />;
}
