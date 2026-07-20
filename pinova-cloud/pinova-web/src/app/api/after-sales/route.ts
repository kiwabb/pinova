import { proxyOrderRequest } from "@/lib/order-proxy";

export function GET(request: Request) {
  return proxyOrderRequest(request, "/after-sales");
}
