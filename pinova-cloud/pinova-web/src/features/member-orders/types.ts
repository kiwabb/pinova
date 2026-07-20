export type MemberOrderStatus =
  | "PENDING_PAYMENT"
  | "PENDING_FULFILLMENT"
  | "FULFILLING"
  | "COMPLETED"
  | "CLOSED"
  | "REFUNDED";

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
  checkoutNo: string;
  status: MemberOrderStatus;
  fulfillmentType: number;
  currencyCode: string;
  payableAmountFen: number;
  paidAmountFen: number;
  submittedAt: string;
  carrierName: string | null;
  trackingNo: string | null;
  shippedAt: string | null;
  autoCompleteAt: string | null;
  completedAt: string | null;
  afterSaleDeadlineAt: string | null;
  refundedAt: string | null;
  items: MemberOrderItem[];
}

export interface MemberAfterSale {
  afterSaleNo: string;
  orderNo: string;
  status: string;
  amountFen: number;
  currencyCode: string;
  reasonCode: number;
  reason: string | null;
  reviewReason: string | null;
  refundNo: string | null;
  refundStatus: string | null;
  appliedAt: string;
  completedAt: string | null;
}

export interface MemberOrderPageData {
  items: MemberOrder[];
  page: number;
  pageSize: number;
  total: number;
}
