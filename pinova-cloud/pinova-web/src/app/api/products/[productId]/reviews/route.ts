const API_BASE_URL = (
  process.env.PINOVA_API_BASE_URL ?? "http://127.0.0.1:8080"
).replace(/\/$/, "");

interface ProductReviewRouteProps {
  params: Promise<{ productId: string }>;
}

function validId(value: string) {
  return /^[1-9]\d*$/.test(value);
}

function normalizePageValue(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: Request, { params }: ProductReviewRouteProps) {
  const { productId } = await params;
  if (!validId(productId)) {
    return Response.json({ detail: "商品 ID 格式错误" }, { status: 400 });
  }

  const url = new URL(request.url);
  const page = normalizePageValue(url.searchParams.get("page"), 1);
  const pageSize = Math.min(
    normalizePageValue(url.searchParams.get("pageSize"), 20),
    50,
  );
  const upstreamParameters = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  try {
    const upstream = await fetch(
      `${API_BASE_URL}/products/${productId}/reviews?${upstreamParameters}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      },
    );
    const headers = new Headers();
    headers.set(
      "Content-Type",
      upstream.headers.get("content-type") ?? "application/json",
    );
    headers.set("Cache-Control", "no-store");
    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error("商品评价上游请求失败", error);
    return Response.json(
      { title: "商品评价服务不可用", detail: "评价暂时无法连接，请稍后重试" },
      { status: 502 },
    );
  }
}
