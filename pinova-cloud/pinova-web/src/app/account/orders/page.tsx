import type { Metadata } from "next";
import { MemberOrdersPage } from "@/features/member-orders";

export const metadata: Metadata = {
  title: "我的订单 | PINOVA 色谱工作台",
  description: "查看 Pinova 会员账户的订单记录与当前状态。",
};

export default function MemberOrdersRoute() {
  return <MemberOrdersPage />;
}
