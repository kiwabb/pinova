import JSONBigFactory from "json-bigint";
import { cache } from "react";
import type { StoreCategory } from "@/data/storefront";

const JSONBig = JSONBigFactory({ storeAsString: true });
const API_BASE_URL = (
  process.env.PINOVA_API_BASE_URL ?? "http://127.0.0.1:8080"
).replace(/\/$/, "");

interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
}

interface ProductCategorySummaryDto {
  id: string | number;
  categoryCode: string;
  name: string;
  level: number;
  iconUrl: string | null;
  hasChildren: boolean;
}

async function getApiData<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60, tags: ["product-categories"] },
  });

  if (!response.ok) {
    throw new Error(`分类接口请求失败：${response.status} ${response.statusText}`);
  }

  let body: ApiResponse<T>;
  try {
    body = JSONBig.parse(await response.text()) as ApiResponse<T>;
  } catch {
    throw new Error("分类接口返回了无效的 JSON");
  }

  if (body.code !== "SUCCESS") {
    throw new Error(`分类接口返回失败：${body.code} ${body.message}`);
  }
  return body.data;
}

function mapCategory(category: ProductCategorySummaryDto): StoreCategory {
  return {
    id: String(category.id),
    code: category.categoryCode,
    name: category.name,
    level: Number(category.level),
    iconUrl: category.iconUrl,
    hasChildren: category.hasChildren,
    childrenLoaded: !category.hasChildren,
    children: [],
  };
}

function replaceCategory(
  categories: StoreCategory[],
  replacement: StoreCategory,
): StoreCategory[] {
  return categories.map((category) => {
    if (category.id === replacement.id) return replacement;
    if (!category.children.length) return category;
    return {
      ...category,
      children: replaceCategory(category.children, replacement),
    };
  });
}

export const getMainCategories = cache(async (): Promise<StoreCategory[]> => {
  const mainCategories = await getApiData<ProductCategorySummaryDto[]>(
    "/product-categories/main",
  );

  if (!Array.isArray(mainCategories)) {
    throw new Error("主分类接口的 data 不是数组");
  }

  return mainCategories.map(mapCategory);
});

export const getCategoryChildren = cache(
  async (parentCategoryId: string): Promise<StoreCategory[]> => {
    const children = await getApiData<ProductCategorySummaryDto[]>(
      `/product-categories/${encodeURIComponent(parentCategoryId)}/children`,
    );
    if (!Array.isArray(children)) {
      throw new Error("子分类接口的 data 不是数组");
    }
    return children.map(mapCategory);
  },
);

export const getCategoryNavigation = cache(async (categoryPath: string) => {
  let categories = await getMainCategories();
  if (categoryPath === "all") {
    return { categories, currentCategory: null };
  }

  const segments = categoryPath.split("/").filter(Boolean);
  let siblings = categories;
  let currentCategory: StoreCategory | null = null;

  for (const segment of segments) {
    const category = siblings.find((item) => item.code === segment);
    if (!category) return null;

    if (!category.hasChildren) {
      currentCategory = category;
      siblings = [];
      continue;
    }

    const children = await getCategoryChildren(category.id);
    const loadedCategory = {
      ...category,
      children,
      childrenLoaded: true,
    };
    categories = replaceCategory(categories, loadedCategory);
    currentCategory = loadedCategory;
    siblings = children;
  }

  return { categories, currentCategory };
});
