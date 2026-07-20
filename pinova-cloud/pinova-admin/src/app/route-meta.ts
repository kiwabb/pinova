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

  if (pathname === "/products") {
    return { menuKey: "/products", title: "商品管理", breadcrumbs: ["商品", "商品与 SKU"] };
  }

  if (pathname === "/inventory") {
    return { menuKey: "/inventory", title: "库存管理", breadcrumbs: ["商品", "仓库与库存"] };
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

  if (pathname === "/after-sales") {
    return { menuKey: "/after-sales", title: "售后退款", breadcrumbs: ["订单", "售后退款"] };
  }

  if (pathname === "/audits") {
    return { menuKey: "/audits", title: "操作审计", breadcrumbs: ["系统", "操作审计"] };
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
