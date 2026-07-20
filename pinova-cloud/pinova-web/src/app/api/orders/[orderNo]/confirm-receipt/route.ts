import { proxyOrderRequest } from "@/lib/order-proxy";

export async function POST(request: Request, context: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await context.params;
  return proxyOrderRequest(request, `/orders/${encodeURIComponent(orderNo)}/confirm-receipt`);
}
