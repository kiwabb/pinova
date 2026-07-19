import type { Metadata } from "next";
import { ShoppingCartPage } from "@/features/shopping-cart";
import { getProducts } from "@/lib/product-api";

export const metadata: Metadata = {
  title: "购物车 | PINOVA 色谱工作台",
  description: "查看、勾选并调整 Pinova 购物车中的商品规格与数量。",
};

export default async function CartPage() {
  const products = await getProducts().catch(() => []);
  return <ShoppingCartPage suggestProducts={products} />;
}
