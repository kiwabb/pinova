import { proxyMemberAddressRequest } from "@/lib/member-address-proxy";

export function GET(request: Request) {
  return proxyMemberAddressRequest(request, "/member-shipping-addresses");
}

export function POST(request: Request) {
  return proxyMemberAddressRequest(request, "/member-shipping-addresses");
}
