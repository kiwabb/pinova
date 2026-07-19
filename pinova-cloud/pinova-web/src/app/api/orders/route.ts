import { proxyOrderRequest } from "@/lib/order-proxy";

export function GET(request: Request) {
  return proxyOrderRequest(request, `/orders${new URL(request.url).search}`);
}

export function POST(request: Request) {
  return proxyOrderRequest(request, "/orders");
}
