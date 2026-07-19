import { Empty, Typography } from "antd";
import { Link } from "react-router-dom";

const sections = [
  { href: "/orders", name: "订单管理" },
  { href: "/members", name: "会员管理" },
  { href: "/categories", name: "类目管理" },
];

export function OverviewPage() {
  return (
    <div className="overviewLayout">
      <section className="workSection" aria-labelledby="workspace-heading">
        <Typography.Title id="workspace-heading" level={2}>
          管理入口
        </Typography.Title>
        <ul className="sectionLinkList">
          {sections.map((section) => (
            <li key={section.href}>
              <Link className="sectionLink" to={section.href}>
                {section.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <Empty description="暂无运营数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
    </div>
  );
}
