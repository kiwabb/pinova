import { proxyMemberAuthenticationRequest } from "@/lib/member-authentication-proxy";

export async function GET(request: Request) {
  const response = await proxyMemberAuthenticationRequest(request, "/auth/me");
  if (response.status !== 401) return response;
  return Response.json(
    { code: "SUCCESS", message: "success", data: null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
