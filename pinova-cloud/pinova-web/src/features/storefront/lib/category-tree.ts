import type { StoreCategory } from "@/data/storefront";

export function findCategoryById(
  categoryId: string,
  categories: StoreCategory[],
): StoreCategory | undefined {
  for (const category of categories) {
    if (category.id === categoryId) return category;
    const child = findCategoryById(categoryId, category.children);
    if (child) return child;
  }
  return undefined;
}

export function attachCategoryChildren(
  categories: StoreCategory[],
  categoryId: string,
  children: StoreCategory[],
): StoreCategory[] {
  return categories.map((category) => {
    if (category.id === categoryId) {
      return { ...category, children, childrenLoaded: true };
    }
    if (!category.children.length) return category;
    return {
      ...category,
      children: attachCategoryChildren(category.children, categoryId, children),
    };
  });
}

export async function fetchCategoryChildren(categoryId: string) {
  const response = await fetch(
    `/api/product-categories/${encodeURIComponent(categoryId)}/children`,
  );
  if (!response.ok) throw new Error("子分类加载失败");
  const children = (await response.json()) as unknown;
  if (!Array.isArray(children)) throw new Error("子分类响应格式错误");
  return children as StoreCategory[];
}
