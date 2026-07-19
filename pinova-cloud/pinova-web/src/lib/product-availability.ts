export type ProductStock = "in_stock" | "low_stock" | "sold_out";

export type ProductStockTone = "available" | "warning" | "unavailable";

export function isAvailableStock(stock: ProductStock | null) {
  return stock === "in_stock" || stock === "low_stock";
}

export function getStockLabel(stock: ProductStock | null) {
  if (stock === "in_stock") return "现货";
  if (stock === "low_stock") return "库存紧张";
  if (stock === "sold_out") return "已售罄";
  return null;
}

export function getStockTone(stock: ProductStock | null): ProductStockTone {
  if (stock === "in_stock") return "available";
  if (stock === "low_stock") return "warning";
  return "unavailable";
}
