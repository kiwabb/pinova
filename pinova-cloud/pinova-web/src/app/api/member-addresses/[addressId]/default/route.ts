import { proxyMemberAddressRequest } from "@/lib/member-address-proxy";

interface DefaultMemberAddressRouteProps {
  params: Promise<{ addressId: string }>;
}

export async function PATCH(
  request: Request,
  { params }: DefaultMemberAddressRouteProps,
) {
  const { addressId } = await params;
  if (!/^[1-9]\d*$/.test(addressId)) {
    return Response.json({ detail: "收货地址 ID 格式错误" }, { status: 400 });
  }
  return proxyMemberAddressRequest(
    request,
    `/member-shipping-addresses/${addressId}/default`,
  );
}
