import {
  isAvailableStock,
  type ProductStock,
} from "@/lib/product-availability";

export type CategoryCode = string;

export type { ProductStock };

export interface StoreCategory {
  id: string;
  code: CategoryCode;
  name: string;
  level: number;
  iconUrl: string | null;
  hasChildren: boolean;
  childrenLoaded: boolean;
  children: StoreCategory[];
}

export interface StoreProduct {
  id: string;
  name: string;
  productType: number;
  mainImageKey: string | null;
  categoryCode: CategoryCode;
  categoryName: string;
  categoryPathCodes: CategoryCode[];
  description: string | null;
  image: string | null;
  imageAlt: string;
  priceFen: number | null;
  stock: ProductStock | null;
}

export function isProductPurchasable(product: StoreProduct) {
  return product.priceFen !== null && isAvailableStock(product.stock);
}

const categoryPresentation: Record<
  string,
  { caption: string; color: string }
> = {
  "starter-kits": { caption: "从第一盒开始", color: "#c72c59" },
  "bead-refills": { caption: "按色号快速补货", color: "#0c715f" },
  "pattern-kits": { caption: "图纸与用量配齐", color: "#efbc35" },
  tools: { caption: "拼板、镊子与收纳", color: "#2f63b7" },
  "finished-goods": { caption: "把灵感带回家", color: "#7a59a5" },
  "store-experience": { caption: "武汉门店预约", color: "#df654a" },
};

export function getCategoryPresentation(code: CategoryCode) {
  return categoryPresentation[code];
}

export function findCategoryByCode(
  code: CategoryCode,
  nodes: StoreCategory[],
): StoreCategory | undefined {
  for (const node of nodes) {
    if (node.code === code) return node;
    const child = findCategoryByCode(code, node.children);
    if (child) return child;
  }
  return undefined;
}

export function getCategoryPath(
  code: CategoryCode,
  nodes: StoreCategory[],
): StoreCategory[] {
  for (const node of nodes) {
    if (node.code === code) return [node];
    const childPath = getCategoryPath(code, node.children);
    if (childPath.length) return [node, ...childPath];
  }
  return [];
}

export function getCategoryHref(code: CategoryCode, nodes: StoreCategory[]) {
  if (code === "all") return "/category/all";
  const path = getCategoryPath(code, nodes);
  return path.length
    ? `/category/${path.map((category) => category.code).join("/")}`
    : "/category/all";
}
