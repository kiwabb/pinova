import JSONBigFactory from "json-bigint";
import type {
  CurrentMember,
  LoginMemberInput,
  RegisterMemberInput,
} from "../types";

const JSONBig = JSONBigFactory({ storeAsString: true });
const AUTH_API_PATH = "/api/auth";

interface ApiResponseDto<T> {
  code: string;
  message: string;
  data: T;
}

interface CurrentMemberDto {
  id: string | number;
  memberNo: string;
  nickname: string;
  avatarUrl: string | null;
}

interface ProblemDetailDto {
  code?: string;
  detail?: string;
  title?: string;
}

export class MemberAuthenticationApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "MemberAuthenticationApiError";
  }
}

function mapCurrentMember(member: CurrentMemberDto): CurrentMember {
  return {
    id: String(member.id),
    memberNo: member.memberNo,
    nickname: member.nickname,
    avatarUrl: member.avatarUrl,
  };
}

function parseProblem(rawBody: string, status: number) {
  try {
    const body = JSON.parse(rawBody) as ProblemDetailDto;
    return new MemberAuthenticationApiError(
      body.detail ?? body.title ?? `会员请求失败（${status}）`,
      status,
      body.code,
    );
  } catch {
    return new MemberAuthenticationApiError(`会员请求失败（${status}）`, status);
  }
}

async function requestMember(
  path: string,
  init?: RequestInit,
  allowAnonymous = false,
): Promise<CurrentMember | null> {
  const response = await fetch(`${AUTH_API_PATH}${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const rawBody = await response.text();
  if (!response.ok) {
    throw parseProblem(rawBody, response.status);
  }
  const body = JSONBig.parse(rawBody) as ApiResponseDto<CurrentMemberDto | null>;
  if (body.code !== "SUCCESS") {
    throw new MemberAuthenticationApiError(
      body.message || "会员信息暂时不可用",
      response.status,
    );
  }
  if (!body.data) {
    if (allowAnonymous) return null;
    throw new MemberAuthenticationApiError("会员信息暂时不可用", response.status);
  }
  return mapCurrentMember(body.data);
}

export async function getCurrentMember(signal?: AbortSignal) {
  return requestMember("/me", { signal }, true);
}

export async function loginMember(input: LoginMemberInput) {
  const member = await requestMember("/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!member) throw new MemberAuthenticationApiError("登录失败", 500);
  return member;
}

export async function registerMember(input: RegisterMemberInput) {
  const member = await requestMember("/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  if (!member) throw new MemberAuthenticationApiError("注册失败", 500);
  return member;
}

export async function logoutMember() {
  const response = await fetch(`${AUTH_API_PATH}/logout`, {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw parseProblem(await response.text(), response.status);
  }
}
