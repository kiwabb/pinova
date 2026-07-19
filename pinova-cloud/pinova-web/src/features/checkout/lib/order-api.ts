import JSONBigFactory from "json-bigint";
import type { SubmitOrderInput, SubmittedCheckout } from "../types";

const JSONBig = JSONBigFactory({ storeAsString: true });
const ORDER_API_PATH = "/api/orders";

interface ApiResponseDto<T> {
  code: string;
  message: string;
  data: T;
}

interface SubmittedOrderDto {
  id: string | number;
  orderNo: string;
  status: string;
}

interface SubmittedCheckoutDto {
  checkoutNo: string;
  orders: SubmittedOrderDto[];
}

interface ProblemDetailDto {
  code?: string;
  detail?: string;
  message?: string;
  title?: string;
}

export class OrderSubmissionError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "OrderSubmissionError";
  }
}

async function parseError(response: Response) {
  try {
    const body = JSON.parse(await response.text()) as ProblemDetailDto;
    if (response.status === 401) return "登录状态已失效，请重新登录后提交";
    if (response.status === 404) return "订单服务当前不可用，请稍后重试";
    if (response.status === 409) return body.detail ?? "购物车或收货地址已更新，请刷新后确认";
    return body.detail ?? body.message ?? body.title ?? `订单提交失败（${response.status}）`;
  } catch {
    return `订单提交失败（${response.status}）`;
  }
}

export async function submitOrder(
  input: SubmitOrderInput,
  idempotencyKey: string,
): Promise<SubmittedCheckout> {
  const response = await fetch(ORDER_API_PATH, {
    method: "POST",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new OrderSubmissionError(await parseError(response), response.status);
  }
  const body = JSONBig.parse(
    await response.text(),
  ) as ApiResponseDto<SubmittedCheckoutDto>;
  if (
    body.code !== "SUCCESS" ||
    !body.data?.checkoutNo ||
    !Array.isArray(body.data.orders) ||
    body.data.orders.length === 0
  ) {
    throw new OrderSubmissionError(body.message || "订单提交失败", response.status);
  }
  return {
    checkoutNo: body.data.checkoutNo,
    orders: body.data.orders.map((order) => ({
      id: String(order.id),
      orderNo: order.orderNo,
      status: order.status,
    })),
  };
}
