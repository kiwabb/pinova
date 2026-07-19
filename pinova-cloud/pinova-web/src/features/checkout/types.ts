import type { ShoppingCartData, ShoppingCartItem } from "@/data/shopping-cart";
import type { MemberAddress } from "@/features/member-addresses";

export interface SubmitOrderLineInput {
  cartItemId: string;
  cartItemVersion: number;
  skuId: string;
  quantity: number;
}

export interface SubmitOrderInput {
  cartId: string;
  shippingAddressId: string;
  shippingAddressVersion: number;
  items: SubmitOrderLineInput[];
  buyerRemark: string | null;
}

export interface SubmittedOrder {
  id: string;
  orderNo: string;
  status: string;
}

export interface SubmittedCheckout {
  checkoutNo: string;
  orders: SubmittedOrder[];
}

export interface CheckoutData {
  cart: ShoppingCartData;
  addresses: MemberAddress[];
}

export interface CheckoutSummary {
  items: ShoppingCartItem[];
  itemCount: number;
  productTotalFen: number;
  hasUnavailablePrice: boolean;
}
