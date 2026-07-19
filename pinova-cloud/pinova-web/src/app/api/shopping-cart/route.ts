import { proxyShoppingCartRequest } from "@/lib/shopping-cart-proxy";

export function GET(request: Request) {
  return proxyShoppingCartRequest(request, "/shopping-carts/current");
}
