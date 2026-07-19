const API_BASE_URL = (
  process.env.PINOVA_API_BASE_URL ?? "http://127.0.0.1:8080"
).replace(/\/$/, "");

export async function proxyShoppingCartRequest(
  request: Request,
  upstreamPath: string,
) {
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
    const responseHeaders = new Headers();
    responseHeaders.set(
      "Content-Type",
      upstream.headers.get("content-type") ?? "application/json",
    );
    responseHeaders.set("Cache-Control", "no-store");
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) responseHeaders.set("Set-Cookie", setCookie);

    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("购物车上游请求失败", error);
    return Response.json(
      { title: "购物车服务不可用", detail: "购物车暂时无法连接，请稍后重试" },
      { status: 502 },
    );
  }
}
