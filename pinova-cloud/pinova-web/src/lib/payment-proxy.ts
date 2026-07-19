const API_BASE_URL = (
  process.env.PINOVA_API_BASE_URL ?? "http://127.0.0.1:8080"
).replace(/\/$/, "");

export function validPaymentNo(paymentNo: string) {
  return /^PY\d{8}\d{10,20}$/.test(paymentNo);
}

export async function proxyPaymentRequest(request: Request, upstreamPath: string) {
  try {
    const headers = new Headers({ Accept: "application/json" });
    const cookie = request.headers.get("cookie");
    if (cookie) headers.set("Cookie", cookie);

    let body: string | undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      body = await request.text();
      if (body) headers.set("Content-Type", "application/json");
    }

    const upstream = await fetch(`${API_BASE_URL}${upstreamPath}`, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });
    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    console.error("支付上游请求失败", error);
    return Response.json(
      { title: "支付服务不可用", detail: "支付服务暂时无法连接，请稍后重试" },
      { status: 502 },
    );
  }
}
