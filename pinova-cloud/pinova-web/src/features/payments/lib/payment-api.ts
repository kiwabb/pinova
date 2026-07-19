import JSONBigFactory from "json-bigint";
import type { MockPaymentOutcome, PaymentOrder, PaymentStatus } from "../types";

const JSONBig = JSONBigFactory({ storeAsString: true });
const PAYMENT_API_PATH = "/api/payments";

interface ApiResponseDto<T> {
  code: string;
  message: string;
  data: T;
}

interface PaymentOrderDto {
  paymentNo: string;
  checkoutNo: string;
  providerCode: string;
  status: string;
  currencyCode: string;
  amountFen: number | string;
  orderCount: number | string;
  expiresAt: string;
  paidAt: string | null;
  failureMessage: string | null;
  mockMode: boolean;
}

interface ProblemDetailDto {
  detail?: string;
  title?: string;
}

const PAYMENT_STATUSES: readonly PaymentStatus[] = [
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "CLOSED",
  "REVIEW_REQUIRED",
];

export class PaymentApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PaymentApiError";
  }
}

function toNumber(value: number | string, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new PaymentApiError(`支付数据中的${field}无效`, 502);
  }
  return parsed;
}

function mapPayment(dto: PaymentOrderDto): PaymentOrder {
  if (!PAYMENT_STATUSES.includes(dto.status as PaymentStatus)) {
    throw new PaymentApiError("支付状态暂时无法识别", 502);
  }
  return {
    paymentNo: dto.paymentNo,
    checkoutNo: dto.checkoutNo,
    providerCode: dto.providerCode,
    status: dto.status as PaymentStatus,
    currencyCode: dto.currencyCode,
    amountFen: toNumber(dto.amountFen, "支付金额"),
    orderCount: toNumber(dto.orderCount, "订单数量"),
    expiresAt: dto.expiresAt,
    paidAt: dto.paidAt,
    failureMessage: dto.failureMessage,
    mockMode: dto.mockMode,
  };
}

async function parseError(response: Response) {
  try {
    const body = JSON.parse(await response.text()) as ProblemDetailDto;
    if (response.status === 401) return "登录状态已失效，请重新登录";
    if (response.status === 404) return "支付单不存在，请刷新订单";
    if (response.status === 409) {
      return body.detail ?? "支付状态已更新，请刷新后重试";
    }
    if (response.status === 503) return "当前环境未开启本地模拟支付";
    return body.detail ?? body.title ?? `支付请求失败（${response.status}）`;
  } catch {
    return `支付请求失败（${response.status}）`;
  }
}

async function requestPayment(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<PaymentOrder> {
  const response = await fetch(input, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
  });
  if (!response.ok) {
    throw new PaymentApiError(await parseError(response), response.status);
  }
  const body = JSONBig.parse(await response.text()) as ApiResponseDto<PaymentOrderDto>;
  if (body.code !== "SUCCESS" || !body.data) {
    throw new PaymentApiError(body.message || "支付请求失败", response.status);
  }
  return mapPayment(body.data);
}

export function createPayment(checkoutNo: string) {
  return requestPayment(PAYMENT_API_PATH, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ checkoutNo }),
  });
}

export function refreshPayment(paymentNo: string) {
  return requestPayment(`${PAYMENT_API_PATH}/${encodeURIComponent(paymentNo)}/refresh`, {
    method: "POST",
    headers: { Accept: "application/json" },
  });
}

export function simulatePayment(
  paymentNo: string,
  outcome: MockPaymentOutcome,
) {
  return requestPayment(`${PAYMENT_API_PATH}/${encodeURIComponent(paymentNo)}/mock-result`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ outcome }),
  });
}
