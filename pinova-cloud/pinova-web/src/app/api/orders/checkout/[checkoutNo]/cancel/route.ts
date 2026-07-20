import { proxyOrderRequest } from "@/lib/order-proxy";

export async function POST(request: Request, context: { params: Promise<{ checkoutNo: string }> }) {
  const { checkoutNo } = await context.params;
  return proxyOrderRequest(request, `/orders/checkout/${encodeURIComponent(checkoutNo)}/cancel`);
}
