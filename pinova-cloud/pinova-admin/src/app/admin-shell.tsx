import { useState } from "react";
import {
  AppstoreOutlined,
  AuditOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  MenuUnfoldOutlined,
  TagsOutlined,
  ShoppingOutlined,
  SyncOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { App, Breadcrumb, Button, Drawer, Grid, Layout, Menu, Typography } from "antd";
import type { MenuProps } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { ADMIN_SESSION_QUERY_KEY, logoutAdmin, useAdminSession } from "../features/admin-authentication";
import { getRouteMeta } from "./route-meta";

const { Header, Content, Sider } = Layout;

const navigationItems: MenuProps["items"] = [
  { key: "/overview", icon: <AppstoreOutlined />, label: "概览" },
  { key: "/orders", icon: <FileTextOutlined />, label: "订单管理" },
  { key: "/after-sales", icon: <SyncOutlined />, label: "售后退款" },
  { key: "/products", icon: <ShoppingOutlined />, label: "商品管理" },
  { key: "/inventory", icon: <DatabaseOutlined />, label: "库存管理" },
  { key: "/members", icon: <TeamOutlined />, label: "会员管理" },
  { key: "/categories", icon: <TagsOutlined />, label: "类目管理" },
  { key: "/audits", icon: <AuditOutlined />, label: "操作审计" },
];

interface AdminNavigationProps {
  selectedKey: string;
  onNavigate: (path: string) => void;
}

function AdminNavigation({ selectedKey, onNavigate }: AdminNavigationProps) {
  return (
    <Menu
      aria-label="后台主导航"
      items={navigationItems}
      mode="inline"
      theme="dark"
      selectedKeys={selectedKey ? [selectedKey] : []}
      onClick={({ key }) => onNavigate(key)}
    />
  );
}

export function AdminShell() {
  const admin = useAdminSession();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const screens = Grid.useBreakpoint();
  const location = useLocation();
  const navigate = useNavigate();
  const routeMeta = getRouteMeta(location.pathname);
  const isDesktop = screens.lg !== false;
  const logout = useMutation({
    mutationFn: logoutAdmin,
    onSuccess: async () => {
      await queryClient.removeQueries({ queryKey: ADMIN_SESSION_QUERY_KEY });
      navigate("/login", { replace: true });
    },
    onError: (error) => void message.error(error.message),
  });

  function navigateTo(path: string) {
    navigate(path);
    setMobileNavigationOpen(false);
  }

  return (
    <Layout className="adminLayout">
      <a className="skipLink" href="#main-content">
        跳到主要内容
      </a>
      {isDesktop ? (
        <Sider
          className="adminSider"
          collapsible
          collapsed={desktopCollapsed}
          collapsedWidth={72}
          trigger={null}
          width={232}
        >
          <div className={desktopCollapsed ? "brand brandCollapsed" : "brand"}>
            <span className="brandMark" aria-hidden="true">P</span>
            {!desktopCollapsed && <span className="brandName">Pinova 管理后台</span>}
          </div>
          <AdminNavigation selectedKey={routeMeta.menuKey} onNavigate={navigateTo} />
        </Sider>
      ) : null}

      <Drawer
        className="mobileNavigationDrawer"
        open={!isDesktop && mobileNavigationOpen}
        placement="left"
        title="Pinova 管理后台"
        size={312}
        onClose={() => setMobileNavigationOpen(false)}
      >
        <AdminNavigation selectedKey={routeMeta.menuKey} onNavigate={navigateTo} />
      </Drawer>

      <Layout className="adminMainLayout">
        <Header className="adminHeader">
          <Button
            aria-label={isDesktop ? (desktopCollapsed ? "展开侧边栏" : "收起侧边栏") : "打开导航"}
            className="navigationToggle"
            icon={
              isDesktop ? (
                desktopCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
              ) : (
                <MenuOutlined />
              )
            }
            type="text"
            onClick={() => {
              if (isDesktop) {
                setDesktopCollapsed((current) => !current);
              } else {
                setMobileNavigationOpen(true);
              }
            }}
          />
          <Typography.Text className="headerContext">运营管理</Typography.Text>
          <Typography.Text className="adminIdentity">
            <UserOutlined aria-hidden="true" />
            <span className="adminIdentityName">{admin.displayName}</span>
          </Typography.Text>
          <Button
            aria-label="退出登录"
            className="logoutButton"
            icon={<LogoutOutlined />}
            loading={logout.isPending}
            title="退出登录"
            onClick={() => logout.mutate()}
          />
        </Header>

        <Content id="main-content" className="adminContent" tabIndex={-1}>
          <div className="pageHeading">
            <Breadcrumb items={routeMeta.breadcrumbs.map((title) => ({ title }))} />
            <Typography.Title level={1}>{routeMeta.title}</Typography.Title>
          </div>
          <div className="pageBody">
            <Outlet context={admin} />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
