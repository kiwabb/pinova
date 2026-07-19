import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Storefront } from "@/features/storefront";
import { getCategoryNavigation } from "@/lib/product-category-api";
import { getProducts } from "@/lib/product-api";

interface CategoryPageProps {
  params: Promise<{ segments: string[] }>;
}

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { segments } = await params;
  const navigation = await getCategoryNavigation(segments.join("/"));
  if (!navigation) return {};
  const category = navigation.currentCategory ?? {
    code: "all",
    name: "全部商品",
  };
  return {
    title: `${category.name} | PINOVA 色谱工作台`,
    description: `浏览 Pinova ${category.name}分类中的拼豆材料、工具与创作好物。`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { segments } = await params;
  const navigation = await getCategoryNavigation(segments.join("/"));
  if (!navigation) notFound();
  const category = navigation.currentCategory ?? {
    code: "all",
    name: "全部商品",
  };
  const products = await getProducts(category.code);

  return (
    <Storefront
      key={category.code}
      categories={navigation.categories}
      products={products}
      categoryPageCode={category.code}
    />
  );
}
