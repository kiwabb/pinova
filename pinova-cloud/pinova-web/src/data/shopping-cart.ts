export interface ShoppingCartItem {
  id: string;
  shopId: string;
  spuId: string;
  skuId: string;
  productName: string | null;
  skuSpecSummary: string | null;
  imageUrl: string | null;
  priceFen: number | null;
  quantity: number;
  selected: boolean;
  version: number;
}

export interface ShoppingCartData {
  id: string;
  items: ShoppingCartItem[];
}
