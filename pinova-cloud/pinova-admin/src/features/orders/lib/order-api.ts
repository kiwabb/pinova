import { adminApiRequest } from "../../../lib/admin-api-client";
import type { OrderDetail, OrderFilters, OrderPage } from "../types";

export function listAdminOrders(filters: OrderFilters) {
  const params = new URLSearchParams();
  if (filters.orderNo) params.set("orderNo", filters.orderNo);
  if (filters.status) params.set("status", filters.status);
  if (filters.submittedFrom) params.set("submittedFrom", filters.submittedFrom);
  if (filters.submittedTo) params.set("submittedTo", filters.submittedTo);
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  return adminApiRequest<OrderPage>(`/admin/orders?${params.toString()}`);
}

export function getAdminOrder(orderNo: string) {
  return adminApiRequest<OrderDetail>(`/admin/orders/${encodeURIComponent(orderNo)}`);
}

function lifecycleRequest(orderNo: string, path: string, method: "POST" | "PUT", body: object) {
  return adminApiRequest(`/admin/orders/${encodeURIComponent(orderNo)}/${path}`, {
    method,
    headers: { "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(body),
  });
}

export function shipAdminOrder(orderNo: string, body: { carrierCode: string; carrierName: string; trackingNo: string }) {
  return lifecycleRequest(orderNo, "shipment", "POST", body);
}

export function correctAdminOrderShipment(orderNo: string, body: { carrierCode: string; carrierName: string; trackingNo: string; reason: string }) {
  return lifecycleRequest(orderNo, "shipment", "PUT", body);
}

export function completeAdminOrder(orderNo: string, reason: string) {
  return lifecycleRequest(orderNo, "complete", "POST", { reason });
}
