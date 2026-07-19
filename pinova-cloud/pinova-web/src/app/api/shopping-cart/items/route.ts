import { proxyShoppingCartRequest } from "@/lib/shopping-cart-proxy";

export function POST(request: Request) {
  return proxyShoppingCartRequest(request, "/shopping-carts/current/items");
}
