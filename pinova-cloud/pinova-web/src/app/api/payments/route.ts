import { proxyPaymentRequest } from "@/lib/payment-proxy";

export function POST(request: Request) {
  return proxyPaymentRequest(request, "/payments");
}
