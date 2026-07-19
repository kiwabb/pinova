export interface RouteMeta {
  menuKey: string;
  title: string;
  breadcrumbs: string[];
}

const overviewMeta: RouteMeta = {
  menuKey: "/overview",
  title: "概览",
  breadcrumbs: ["概览"],
};

export function getRouteMeta(pathname: string): RouteMeta {
  if (pathname === "/members") {
    return {
      menuKey: "/members",
      title: "会员管理",
      breadcrumbs: ["会员", "会员列表"],
    };
  }

  if (pathname.startsWith("/members/")) {
    return {
      menuKey: "/members",
      title: "会员详情",
      breadcrumbs: ["会员", "会员详情"],
    };
  }

  if (pathname === "/categories") {
    return {
      menuKey: "/categories",
      title: "类目管理",
      breadcrumbs: ["商品", "平台类目"],
    };
  }

  if (pathname === "/orders") {
    return {
      menuKey: "/orders",
      title: "订单管理",
      breadcrumbs: ["订单", "订单列表"],
    };
  }

  if (pathname.startsWith("/orders/")) {
    return {
      menuKey: "/orders",
      title: "订单详情",
      breadcrumbs: ["订单", "订单详情"],
    };
  }

  if (pathname === "/overview" || pathname === "/") {
    return overviewMeta;
  }

  return {
    menuKey: "",
    title: "页面未找到",
    breadcrumbs: ["页面未找到"],
  };
}
