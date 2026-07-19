const API_BASE_URL = (
  process.env.PINOVA_API_BASE_URL ?? "http://127.0.0.1:8080"
).replace(/\/$/, "");

export async function proxyMemberAuthenticationRequest(
  request: Request,
  upstreamPath: string,
) {
  try {
    const headers = new Headers({ Accept: "application/json" });
    const cookie = request.headers.get("cookie");
    const userAgent = request.headers.get("user-agent");
    if (cookie) headers.set("Cookie", cookie);
    if (userAgent) headers.set("User-Agent", userAgent);

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
    const responseHeaders = new Headers({
      "Cache-Control": "no-store",
      "Content-Type":
        upstream.headers.get("content-type") ?? "application/json",
    });
    const setCookie = upstream.headers.get("set-cookie");
    if (setCookie) {
      const browserUsesHttps = new URL(request.url).protocol === "https:";
      responseHeaders.set(
        "Set-Cookie",
        browserUsesHttps && !/;\s*Secure(?:;|$)/i.test(setCookie)
          ? `${setCookie}; Secure`
          : setCookie,
      );
    }

    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("会员认证上游请求失败", error);
    return Response.json(
      { title: "会员服务不可用", detail: "暂时无法连接会员服务，请稍后重试" },
      { status: 502 },
    );
  }
}
