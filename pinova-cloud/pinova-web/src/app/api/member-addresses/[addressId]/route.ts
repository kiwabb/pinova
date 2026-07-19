import { proxyMemberAddressRequest } from "@/lib/member-address-proxy";

interface MemberAddressRouteProps {
  params: Promise<{ addressId: string }>;
}

function validAddressId(addressId: string) {
  return /^[1-9]\d*$/.test(addressId);
}

export async function PUT(
  request: Request,
  { params }: MemberAddressRouteProps,
) {
  const { addressId } = await params;
  if (!validAddressId(addressId)) {
    return Response.json({ detail: "收货地址 ID 格式错误" }, { status: 400 });
  }
  return proxyMemberAddressRequest(
    request,
    `/member-shipping-addresses/${addressId}`,
  );
}

export async function DELETE(
  request: Request,
  { params }: MemberAddressRouteProps,
) {
  const { addressId } = await params;
  if (!validAddressId(addressId)) {
    return Response.json({ detail: "收货地址 ID 格式错误" }, { status: 400 });
  }
  const version = new URL(request.url).searchParams.get("version");
  if (!/^\d+$/.test(version ?? "")) {
    return Response.json({ detail: "收货地址版本格式错误" }, { status: 400 });
  }
  return proxyMemberAddressRequest(
    request,
    `/member-shipping-addresses/${addressId}?version=${version}`,
  );
}
