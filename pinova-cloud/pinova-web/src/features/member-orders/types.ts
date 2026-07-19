export type MemberOrderStatus =
  | "PENDING_PAYMENT"
  | "PENDING_FULFILLMENT"
  | "FULFILLING"
  | "COMPLETED"
  | "CLOSED";

export type MemberOrderStatusFilter = "ALL" | MemberOrderStatus;

export interface MemberOrderItem {
  productName: string;
  skuSpec: string | null;
  imageUrl: string | null;
  unitPriceFen: number;
  quantity: number;
  payableAmountFen: number;
}

export interface MemberOrder {
  orderNo: string;
  status: MemberOrderStatus;
  fulfillmentType: number;
  currencyCode: string;
  payableAmountFen: number;
  paidAmountFen: number;
  submittedAt: string;
  items: MemberOrderItem[];
}

export interface MemberOrderPageData {
  items: MemberOrder[];
  page: number;
  pageSize: number;
  total: number;
}
