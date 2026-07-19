import { ArrowLeftOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Descriptions, Empty, Result, Skeleton, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { Link, useParams } from "react-router-dom";

import { AdminApiError } from "../../lib/admin-api-client";
import { getAdminOrder } from "./lib/order-api";
import { formatOrderDate, formatOrderMoney, fulfillmentLabel } from "./lib/order-format";
import { OrderStatusTag } from "./components/order-status-tag";
import styles from "./orders.module.css";
import type { OrderItem } from "./types";

export function OrderDetailPage() {
  const { orderNo = "" } = useParams();
  const order = useQuery({
    queryKey: ["admin-order", orderNo],
    queryFn: () => getAdminOrder(orderNo),
    enabled: Boolean(orderNo),
    retry: false,
  });

  if (order.isPending) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }
  if (order.error instanceof AdminApiError && order.error.status === 404) {
    return <Result status="404" title="订单不存在" extra={<Link to="/orders">返回订单列表</Link>} />;
  }
  if (order.error || !order.data) {
    return (
      <Alert
        action={<Button onClick={() => void order.refetch()}>重试</Button>}
        message={order.error?.message ?? "订单加载失败"}
        showIcon
        type="error"
      />
    );
  }

  const data = order.data;
  const itemColumns: ColumnsType<OrderItem> = [
    { title: "商品", dataIndex: "productName", minWidth: 180 },
    { title: "SKU", dataIndex: "skuCode", width: 160, responsive: ["md"] },
    { title: "规格", dataIndex: "skuSpec", width: 160, responsive: ["lg"], render: (value) => value || "-" },
    { title: "单价", dataIndex: "unitPriceFen", width: 120, className: styles.numericCell,
      render: (value) => formatOrderMoney(value, data.currencyCode) },
    { title: "数量", dataIndex: "quantity", width: 80, className: styles.numericCell },
    { title: "应付", dataIndex: "payableAmountFen", width: 120, className: styles.numericCell,
      render: (value) => formatOrderMoney(value, data.currencyCode) },
  ];

  return (
    <div className={styles.orderDetail}>
      <Link className={styles.backLink} to="/orders"><ArrowLeftOutlined />返回订单列表</Link>

      <section aria-labelledby="order-summary-heading">
        <Typography.Title id="order-summary-heading" level={2}>订单信息</Typography.Title>
        <Descriptions bordered column={{ xs: 1, sm: 2, lg: 3 }} size="small">
          <Descriptions.Item label="订单号">{data.orderNo}</Descriptions.Item>
          <Descriptions.Item label="订单状态"><OrderStatusTag status={data.status} /></Descriptions.Item>
          <Descriptions.Item label="履约类型">{fulfillmentLabel(data.fulfillmentType)}</Descriptions.Item>
          <Descriptions.Item label="商品金额">{formatOrderMoney(data.goodsAmountFen, data.currencyCode)}</Descriptions.Item>
          <Descriptions.Item label="优惠金额">{formatOrderMoney(data.discountAmountFen, data.currencyCode)}</Descriptions.Item>
          <Descriptions.Item label="运费">{formatOrderMoney(data.shippingAmountFen, data.currencyCode)}</Descriptions.Item>
          <Descriptions.Item label="应付金额">{formatOrderMoney(data.payableAmountFen, data.currencyCode)}</Descriptions.Item>
          <Descriptions.Item label="已支付">{formatOrderMoney(data.paidAmountFen, data.currencyCode)}</Descriptions.Item>
          <Descriptions.Item label="提交时间">{formatOrderDate(data.submittedAt)}</Descriptions.Item>
          <Descriptions.Item label="支付截止">{formatOrderDate(data.paymentExpiresAt)}</Descriptions.Item>
          <Descriptions.Item label="支付时间">{formatOrderDate(data.paidAt)}</Descriptions.Item>
          <Descriptions.Item label="履约开始">{formatOrderDate(data.fulfillmentStartedAt)}</Descriptions.Item>
          <Descriptions.Item label="完成时间">{formatOrderDate(data.completedAt)}</Descriptions.Item>
          <Descriptions.Item label="关闭时间">{formatOrderDate(data.closedAt)}</Descriptions.Item>
          <Descriptions.Item label="买家备注" span={3}>{data.buyerRemark || "-"}</Descriptions.Item>
        </Descriptions>
      </section>

      <section aria-labelledby="order-items-heading">
        <Typography.Title id="order-items-heading" level={2}>成交商品</Typography.Title>
        <Table<OrderItem>
          columns={itemColumns}
          dataSource={data.items}
          locale={{ emptyText: <Empty description="订单没有商品快照" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          pagination={false}
          rowKey={(item) => `${item.skuCode}-${item.productName}`}
          scroll={{ x: 720 }}
          size="middle"
        />
      </section>

      <section aria-labelledby="shipping-address-heading">
        <Typography.Title id="shipping-address-heading" level={2}>收货快照</Typography.Title>
        {data.shippingAddress ? (
          <Descriptions bordered column={{ xs: 1, md: 2 }} size="small">
            <Descriptions.Item label="收货人">{data.shippingAddress.receiverName || "-"}</Descriptions.Item>
            <Descriptions.Item label="手机号">{data.shippingAddress.receiverMobile || "-"}</Descriptions.Item>
            <Descriptions.Item label="所在地区" span={2}>
              {[data.shippingAddress.provinceName, data.shippingAddress.cityName, data.shippingAddress.districtName]
                .filter(Boolean).join(" ") || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="详细地址" span={2}>{data.shippingAddress.detailAddress || "-"}</Descriptions.Item>
          </Descriptions>
        ) : <Empty description="该订单没有收货地址快照" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
      </section>
    </div>
  );
}
