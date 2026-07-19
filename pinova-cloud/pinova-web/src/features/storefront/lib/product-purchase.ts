import {
  isProductPurchasable,
  type StoreProduct,
} from "@/data/storefront";
import { getStockLabel, getStockTone } from "@/lib/product-availability";

export function getProductPurchaseState(product: StoreProduct) {
  const purchasable = isProductPurchasable(product);
  return {
    actionLabel: purchasable
      ? "选择规格"
      : product.stock === "sold_out"
        ? "已售罄"
        : "暂不可购买",
    purchasable,
    stockLabel: getStockLabel(product.stock),
    stockTone: getStockTone(product.stock),
  };
}
