import { Storefront } from "@/features/storefront";
import { getMainCategories } from "@/lib/product-category-api";
import { getProducts } from "@/lib/product-api";

export default async function HomePage() {
  const [categories, products] = await Promise.all([
    getMainCategories(),
    getProducts(),
  ]);
  return <Storefront categories={categories} products={products} />;
}
