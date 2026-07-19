import { proxyPaymentRequest, validPaymentNo } from "@/lib/payment-proxy";

interface PaymentRouteProps {
  params: Promise<{ paymentNo: string }>;
}

export async function POST(
  request: Request,
  { params }: PaymentRouteProps,
) {
  const { paymentNo } = await params;
  if (!validPaymentNo(paymentNo)) {
    return Response.json({ detail: "支付单号格式错误" }, { status: 400 });
  }
  return proxyPaymentRequest(
    request,
    `/payments/${encodeURIComponent(paymentNo)}/refresh`,
  );
}
