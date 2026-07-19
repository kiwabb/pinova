import { Button, Result, Spin } from "antd";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { AdminApiError } from "../../lib/admin-api-client";
import { ADMIN_SESSION_QUERY_KEY, getCurrentAdmin } from "./lib/admin-auth-api";

export function AdminSessionGate() {
  const location = useLocation();
  const session = useQuery({
    queryKey: ADMIN_SESSION_QUERY_KEY,
    queryFn: getCurrentAdmin,
    retry: false,
    staleTime: 60_000,
  });

  if (session.isPending) {
    return (
      <div className="routeLoading" role="status" aria-label="正在检查后台登录状态">
        <Spin size="large" />
      </div>
    );
  }

  if (session.error instanceof AdminApiError && session.error.status === 401) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  if (session.isError || !session.data) {
    const traceId = session.error instanceof AdminApiError ? session.error.traceId : null;
    return (
      <Result
        status="error"
        title="无法加载后台会话"
        subTitle={traceId ? `${session.error.message}（追踪编号：${traceId}）` : session.error?.message}
        extra={<Button type="primary" onClick={() => void session.refetch()}>重试</Button>}
      />
    );
  }

  if (session.data.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }
  if (!session.data.mustChangePassword && location.pathname === "/change-password") {
    return <Navigate to="/orders" replace />;
  }

  return <Outlet context={session.data} />;
}
