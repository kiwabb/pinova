import { ArrowLeftOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, App, Button, Descriptions, Empty, Form, Input, Modal, Result, Skeleton, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { AdminApiError } from "../../lib/admin-api-client";
import { completeAdminOrder, correctAdminOrderShipment, getAdminOrder, shipAdminOrder } from "./lib/order-api";
import { formatOrderDate, formatOrderMoney, fulfillmentLabel } from "./lib/order-format";
import { OrderStatusTag } from "./components/order-status-tag";
import styles from "./orders.module.css";
import type { OrderItem } from "./types";

export function OrderDetailPage() {
  const { orderNo = "" } = useParams();
  const { message } = App.useApp();
  const [shipmentOpen, setShipmentOpen] = useState(false);
  const [shipmentCorrection, setShipmentCorrection] = useState(false);
  const [shipmentForm] = Form.useForm();
  const order = useQuery({
    queryKey: ["admin-order", orderNo],
    queryFn: () => getAdminOrder(orderNo),
    enabled: Boolean(orderNo),
    retry: false,
  });
  const lifecycle = useMutation({
    mutationFn: async (input: { type: "ship" | "correct" | "complete"; values: Record<string, string> }) => {
      if (input.type === "ship") return shipAdminOrder(orderNo, input.values as { carrierCode: string; carrierName: string; trackingNo: string });
      if (input.type === "correct") return correctAdminOrderShipment(orderNo, input.values as { carrierCode: string; carrierName: string; trackingNo: string; reason: string });
      return completeAdminOrder(orderNo, input.values.reason);
    },
    onSuccess: async () => {
      setShipmentOpen(false);
      shipmentForm.resetFields();
      await order.refetch();
      void message.success("订单履约状态已更新");
    },
    onError: (error) => void message.error(error.message),
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

      <Space wrap>
        {data.status === 1 && <Button type="primary" onClick={() => { setShipmentCorrection(false); setShipmentOpen(true); }}>发货</Button>}
        {data.status === 2 && <Button onClick={() => {
          setShipmentCorrection(true);
          shipmentForm.setFieldsValue({ carrierCode: data.carrierCode, carrierName: data.carrierName, trackingNo: data.trackingNo });
          setShipmentOpen(true);
        }}>修改物流</Button>}
        {data.status === 2 && <Button onClick={() => Modal.confirm({
          title: "强制完成订单",
          content: <Input.TextArea id="force-complete-reason" placeholder="填写强制完成原因" rows={3} />,
          okText: "确认完成",
          onOk: () => {
            const reason = (document.getElementById("force-complete-reason") as HTMLTextAreaElement | null)?.value.trim();
            if (!reason) return Promise.reject(new Error("请填写强制完成原因"));
            return lifecycle.mutateAsync({ type: "complete", values: { reason } });
          },
        })}>强制完成</Button>}
      </Space>

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
          <Descriptions.Item label="承运商">{data.carrierName || "-"}</Descriptions.Item>
          <Descriptions.Item label="运单号">{data.trackingNo || "-"}</Descriptions.Item>
          <Descriptions.Item label="发货时间">{formatOrderDate(data.shippedAt)}</Descriptions.Item>
          <Descriptions.Item label="自动完成时间">{formatOrderDate(data.autoCompleteAt)}</Descriptions.Item>
          <Descriptions.Item label="完成时间">{formatOrderDate(data.completedAt)}</Descriptions.Item>
          <Descriptions.Item label="售后截止">{formatOrderDate(data.afterSaleDeadlineAt)}</Descriptions.Item>
          <Descriptions.Item label="退款时间">{formatOrderDate(data.refundedAt)}</Descriptions.Item>
          <Descriptions.Item label="关闭时间">{formatOrderDate(data.closedAt)}</Descriptions.Item>
          <Descriptions.Item label="买家备注" span={3}>{data.buyerRemark || "-"}</Descriptions.Item>
        </Descriptions>
      </section>

      <Modal
        title={shipmentCorrection ? "修改物流信息" : "订单发货"}
        open={shipmentOpen}
        okText={shipmentCorrection ? "保存修改" : "确认发货"}
        confirmLoading={lifecycle.isPending}
        onCancel={() => setShipmentOpen(false)}
        onOk={() => shipmentForm.validateFields().then((values) => lifecycle.mutateAsync({ type: shipmentCorrection ? "correct" : "ship", values }))}
      >
        <Form form={shipmentForm} layout="vertical">
          <Form.Item name="carrierCode" label="承运商编码" rules={[{ required: true, message: "请输入承运商编码" }]}><Input maxLength={32} /></Form.Item>
          <Form.Item name="carrierName" label="承运商名称" rules={[{ required: true, message: "请输入承运商名称" }]}><Input maxLength={64} /></Form.Item>
          <Form.Item name="trackingNo" label="运单号" rules={[{ required: true, message: "请输入运单号" }]}><Input maxLength={128} /></Form.Item>
          {shipmentCorrection && <Form.Item name="reason" label="修改原因" rules={[{ required: true, message: "请输入修改原因" }]}><Input.TextArea maxLength={500} rows={3} /></Form.Item>}
        </Form>
      </Modal>

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
