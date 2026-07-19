import { proxyMemberAuthenticationRequest } from "@/lib/member-authentication-proxy";

export function POST(request: Request) {
  return proxyMemberAuthenticationRequest(request, "/auth/logout");
}
