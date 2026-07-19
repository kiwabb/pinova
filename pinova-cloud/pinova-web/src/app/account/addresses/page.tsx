import type { Metadata } from "next";
import { MemberAddressesPage } from "@/features/member-addresses";

export const metadata: Metadata = {
  title: "收货地址 | PINOVA 色谱工作台",
  description: "管理 Pinova 会员账户的常用收货地址。",
};

export default function MemberAddressesRoute() {
  return <MemberAddressesPage />;
}
