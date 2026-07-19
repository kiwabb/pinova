import { Navigate, Route, Routes } from "react-router-dom";

import { CategoryManagementPage } from "../features/categories";
import { MemberDetailPage, MemberListPage } from "../features/members";
import { NotFoundPage } from "../features/not-found";
import { OverviewPage } from "../features/overview";
import { AdminSessionGate, ChangePasswordPage, LoginPage } from "../features/admin-authentication";
import { OrderDetailPage, OrderListPage } from "../features/orders";
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
          <Route path="orders" element={<OrderListPage />} />
          <Route path="orders/:orderNo" element={<OrderDetailPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
