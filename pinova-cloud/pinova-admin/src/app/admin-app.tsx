import { Navigate, Route, Routes } from "react-router-dom";

import { CategoryManagementPage } from "../features/categories";
import { AfterSalesPage } from "../features/after-sales/after-sales-page";
import { AuditPage } from "../features/audits/audit-page";
import { InventoryPage } from "../features/inventory/inventory-page";
import { MemberDetailPage, MemberListPage } from "../features/members";
import { NotFoundPage } from "../features/not-found";
import { OverviewPage } from "../features/overview";
import { AdminSessionGate, ChangePasswordPage, LoginPage } from "../features/admin-authentication";
import { OrderDetailPage, OrderListPage } from "../features/orders";
import { ProductsPage } from "../features/products/products-page";
import { AdminShell } from "./admin-shell";

export function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<AdminSessionGate />}>
        <Route path="change-password" element={<ChangePasswordPage />} />
        <Route element={<AdminShell />}>
          <Route index element={<Navigate to="/orders" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="members" element={<MemberListPage />} />
          <Route path="members/:memberId" element={<MemberDetailPage />} />
          <Route path="categories" element={<CategoryManagementPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="inventory" element={<InventoryPage />} />
          <Route path="orders" element={<OrderListPage />} />
          <Route path="orders/:orderNo" element={<OrderDetailPage />} />
          <Route path="after-sales" element={<AfterSalesPage />} />
          <Route path="audits" element={<AuditPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
