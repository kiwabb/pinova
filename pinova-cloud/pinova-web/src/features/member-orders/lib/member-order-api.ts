import JSONBigFactory from "json-bigint";
import type {
  MemberOrder,
  MemberOrderItem,
  MemberOrderPageData,
  MemberOrderStatusFilter,
  MemberAfterSale,
} from "../types";
import {
  isMemberOrderStatus,
  memberOrderStatusQuery,
} from "./member-order-status";

const JSONBig = JSONBigFactory({ storeAsString: true });
const ORDER_API_PATH = "/api/orders";

interface ApiResponseDto<T> {
  code: string;
  message: string;
  data: T;
}

interface MemberOrderItemDto {
  productName: string;
  skuSpec: string | null;
  imageUrl: string | null;
  unitPriceFen: number | string;
  quantity: number | string;
  payableAmountFen: number | string;
}

interface MemberOrderDto {
  orderNo: string;
  checkoutNo: string;
  status: string;
  fulfillmentType: number | string;
  currencyCode: string;
  payableAmountFen: number | string;
  paidAmountFen: number | string;
  submittedAt: string;
  carrierName: string | null;
  trackingNo: string | null;
  shippedAt: string | null;
  autoCompleteAt: string | null;
  completedAt: string | null;
  afterSaleDeadlineAt: string | null;
  refundedAt: string | null;
  items: MemberOrderItemDto[];
}

interface MemberOrderPageDto {
  items: MemberOrderDto[];
  page: number;
  pageSize: number;
  total: number | string;
}

interface ProblemDetailDto {
  detail?: string;
  title?: string;
}

export class MemberOrderApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MemberOrderApiError";
  }
}

function toNumber(value: number | string, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new MemberOrderApiError(`订单数据中的${field}无效`, 502);
  }
  return parsed;
}

function mapOrderItem(item: MemberOrderItemDto): MemberOrderItem {
  return {
    productName: item.productName,
    skuSpec: item.skuSpec,
    imageUrl: item.imageUrl,
    unitPriceFen: toNumber(item.unitPriceFen, "商品单价"),
    quantity: toNumber(item.quantity, "商品数量"),
    payableAmountFen: toNumber(item.payableAmountFen, "商品金额"),
  };
}

function mapOrder(order: MemberOrderDto): MemberOrder {
  if (!isMemberOrderStatus(order.status)) {
    throw new MemberOrderApiError("订单状态暂时无法识别", 502);
  }
  return {
    orderNo: order.orderNo,
    checkoutNo: order.checkoutNo,
    status: order.status,
    fulfillmentType: toNumber(order.fulfillmentType, "履约类型"),
    currencyCode: order.currencyCode,
    payableAmountFen: toNumber(order.payableAmountFen, "订单金额"),
    paidAmountFen: toNumber(order.paidAmountFen, "支付金额"),
    submittedAt: order.submittedAt,
    carrierName: order.carrierName,
    trackingNo: order.trackingNo,
    shippedAt: order.shippedAt,
    autoCompleteAt: order.autoCompleteAt,
    completedAt: order.completedAt,
    afterSaleDeadlineAt: order.afterSaleDeadlineAt,
    refundedAt: order.refundedAt,
    items: Array.isArray(order.items) ? order.items.map(mapOrderItem) : [],
  };
}

async function mutation<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new MemberOrderApiError(await errorMessage(response), response.status);
  const payload = JSONBig.parse(await response.text()) as ApiResponseDto<T>;
  if (payload.code !== "SUCCESS") throw new MemberOrderApiError(payload.message || "订单操作失败", response.status);
  return payload.data;
}

export function cancelCheckout(checkoutNo: string) {
  return mutation(`/api/orders/checkout/${encodeURIComponent(checkoutNo)}/cancel`);
}

export function confirmOrderReceipt(orderNo: string) {
  return mutation(`/api/orders/${encodeURIComponent(orderNo)}/confirm-receipt`);
}

export function applyOrderRefund(orderNo: string, reasonCode: number, reason: string) {
  return mutation<MemberAfterSale>(`/api/after-sales/orders/${encodeURIComponent(orderNo)}`, { reasonCode, reason });
}

export async function listMemberAfterSales(signal?: AbortSignal): Promise<MemberAfterSale[]> {
  const response = await fetch("/api/after-sales", { credentials: "same-origin", cache: "no-store", signal });
  if (!response.ok) throw new MemberOrderApiError(await errorMessage(response), response.status);
  const payload = JSONBig.parse(await response.text()) as ApiResponseDto<MemberAfterSale[]>;
  return Array.isArray(payload.data) ? payload.data : [];
}

async function errorMessage(response: Response) {
  try {
    const body = JSON.parse(await response.text()) as ProblemDetailDto;
    if (response.status === 401) return "登录状态已失效，请重新登录";
    if (response.status === 404) return "订单服务当前不可用，请稍后重试";
    return body.detail ?? body.title ?? `订单请求失败（${response.status}）`;
  } catch {
    return `订单请求失败（${response.status}）`;
  }
}

interface ListMemberOrdersInput {
  filter: MemberOrderStatusFilter;
  page: number;
  pageSize: number;
}

export async function listMemberOrders(
  input: ListMemberOrdersInput,
  signal?: AbortSignal,
): Promise<MemberOrderPageData> {
  const parameters = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  const status = memberOrderStatusQuery(input.filter);
  if (status !== null) parameters.set("status", String(status));

  const response = await fetch(`${ORDER_API_PATH}?${parameters}`, {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new MemberOrderApiError(await errorMessage(response), response.status);
  }
  const body = JSONBig.parse(await response.text()) as ApiResponseDto<MemberOrderPageDto>;
  if (body.code !== "SUCCESS" || !body.data || !Array.isArray(body.data.items)) {
    throw new MemberOrderApiError(body.message || "订单列表加载失败", response.status);
  }
  return {
    items: body.data.items.map(mapOrder),
    page: Number(body.data.page),
    pageSize: Number(body.data.pageSize),
    total: toNumber(body.data.total, "订单总数"),
  };
}
