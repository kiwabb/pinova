export interface OrderSummary {
  orderNo: string;
  status: number;
  fulfillmentType: number;
  currencyCode: string;
  payableAmountFen: number;
  paidAmountFen: number;
  submittedAt: string;
}

export interface OrderItem {
  productName: string;
  skuCode: string;
  skuSpec: string | null;
  unitPriceFen: number;
  quantity: number;
  lineAmountFen: number;
  discountAmountFen: number;
  payableAmountFen: number;
}

export interface OrderShippingAddress {
  receiverName: string | null;
  receiverMobile: string | null;
  countryCode: string;
  provinceName: string;
  cityName: string;
  districtName: string;
  detailAddress: string | null;
}

export interface OrderDetail extends OrderSummary {
  checkoutNo: string;
  goodsAmountFen: number;
  discountAmountFen: number;
  shippingAmountFen: number;
  buyerRemark: string | null;
  paymentExpiresAt: string | null;
  paidAt: string | null;
  fulfillmentStartedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  closeReasonCode: number | null;
  closeReason: string | null;
  items: OrderItem[];
  shippingAddress: OrderShippingAddress | null;
}

export interface OrderPage {
  items: OrderSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface OrderFilters {
  orderNo?: string;
  status?: string;
  submittedFrom?: string;
  submittedTo?: string;
  page: number;
  pageSize: number;
}

