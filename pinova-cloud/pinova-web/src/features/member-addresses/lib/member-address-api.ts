import JSONBigFactory from "json-bigint";
import type { MemberAddress, MemberAddressFormValues } from "../types";

const JSONBig = JSONBigFactory({ storeAsString: true });
const ADDRESS_API_PATH = "/api/member-addresses";

interface ApiResponseDto<T> {
  code: string;
  message: string;
  data: T;
}

interface ProblemDetailDto {
  detail?: string;
  title?: string;
}

export class MemberAddressApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MemberAddressApiError";
  }
}

function normalizeMobile(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^1\d{10}$/.test(compact)) return `+86${compact}`;
  return compact;
}

function requestBody(values: MemberAddressFormValues, version?: number) {
  return {
    ...values,
    receiverMobile: normalizeMobile(values.receiverMobile),
    countryCode: "CN",
    postalCode: values.postalCode.trim() || null,
    label: values.label.trim() || null,
    version,
  };
}

async function errorMessage(response: Response) {
  try {
    const body = JSON.parse(await response.text()) as ProblemDetailDto;
    const detail = body.detail ?? body.title;
    if (response.status === 401) return "登录状态已失效，请重新登录";
    if (response.status === 404 && detail?.includes("No static resource")) {
      return "地址服务尚未准备好，请刷新后重试";
    }
    return detail ?? `地址请求失败（${response.status}）`;
  } catch {
    return `地址请求失败（${response.status}）`;
  }
}

async function parseApiResponse<T>(response: Response) {
  if (!response.ok) {
    throw new MemberAddressApiError(await errorMessage(response), response.status);
  }
  const body = JSONBig.parse(await response.text()) as ApiResponseDto<T>;
  if (body.code !== "SUCCESS" || body.data == null) {
    throw new MemberAddressApiError(body.message || "地址操作失败", response.status);
  }
  return body.data;
}

export async function listMemberAddresses(signal?: AbortSignal) {
  const response = await fetch(ADDRESS_API_PATH, {
    credentials: "same-origin",
    cache: "no-store",
    signal,
  });
  return parseApiResponse<MemberAddress[]>(response);
}

export async function createMemberAddress(values: MemberAddressFormValues) {
  const response = await fetch(ADDRESS_API_PATH, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody(values)),
  });
  return parseApiResponse<MemberAddress>(response);
}

export async function updateMemberAddress(
  address: MemberAddress,
  values: MemberAddressFormValues,
) {
  const response = await fetch(`${ADDRESS_API_PATH}/${encodeURIComponent(address.id)}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody(values, address.version)),
  });
  return parseApiResponse<MemberAddress>(response);
}

export async function setDefaultMemberAddress(address: MemberAddress) {
  const response = await fetch(
    `${ADDRESS_API_PATH}/${encodeURIComponent(address.id)}/default`,
    {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: address.version }),
    },
  );
  return parseApiResponse<MemberAddress>(response);
}

export async function deleteMemberAddress(address: MemberAddress) {
  const response = await fetch(
    `${ADDRESS_API_PATH}/${encodeURIComponent(address.id)}?version=${address.version}`,
    { method: "DELETE", credentials: "same-origin" },
  );
  if (!response.ok) {
    throw new MemberAddressApiError(await errorMessage(response), response.status);
  }
}
