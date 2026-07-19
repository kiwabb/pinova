import { proxyShoppingCartRequest } from "@/lib/shopping-cart-proxy";

interface ShoppingCartItemRouteProps {
  params: Promise<{ itemId: string }>;
}

function validItemId(itemId: string) {
  return /^[1-9]\d*$/.test(itemId);
}

export async function PATCH(
  request: Request,
  { params }: ShoppingCartItemRouteProps,
) {
  const { itemId } = await params;
  if (!validItemId(itemId)) {
    return Response.json({ detail: "购物车项 ID 格式错误" }, { status: 400 });
  }
  return proxyShoppingCartRequest(
    request,
    `/shopping-carts/current/items/${itemId}`,
  );
}

export async function DELETE(
  request: Request,
  { params }: ShoppingCartItemRouteProps,
) {
  const { itemId } = await params;
  if (!validItemId(itemId)) {
    return Response.json({ detail: "购物车项 ID 格式错误" }, { status: 400 });
  }
  return proxyShoppingCartRequest(
    request,
    `/shopping-carts/current/items/${itemId}`,
  );
}
