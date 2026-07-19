import { getCategoryChildren } from "@/lib/product-category-api";

interface CategoryChildrenRouteProps {
  params: Promise<{ parentId: string }>;
}

export async function GET(
  _request: Request,
  { params }: CategoryChildrenRouteProps,
) {
  const { parentId } = await params;
  if (!/^[1-9]\d*$/.test(parentId)) {
    return Response.json(
      { code: "INVALID_PARENT_ID", message: "父分类 ID 格式错误" },
      { status: 400 },
    );
  }

  try {
    const children = await getCategoryChildren(parentId);
    return Response.json(children, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("加载子分类失败", error);
    return Response.json(
      { code: "CATEGORY_UPSTREAM_ERROR", message: "子分类暂时无法加载" },
      { status: 502 },
    );
  }
}
