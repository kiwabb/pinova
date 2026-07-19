import type { Metadata } from "next";
import {
  MemberAuthenticationPage,
  type MemberAuthenticationMode,
} from "@/features/member-authentication";

export const metadata: Metadata = {
  title: "会员账户 | PINOVA 色谱工作台",
  description: "登录或注册 Pinova 会员账户。",
};

interface AccountPageProps {
  searchParams: Promise<{ mode?: string | string[] }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const { mode } = await searchParams;
  const initialMode: MemberAuthenticationMode =
    mode === "register" ? "register" : "login";
  return <MemberAuthenticationPage initialMode={initialMode} />;
}
