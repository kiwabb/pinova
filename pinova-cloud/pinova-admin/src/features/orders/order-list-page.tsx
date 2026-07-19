import { SearchOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Empty, Form, Input, Select, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { AdminApiError } from "../../lib/admin-api-client";
import { listAdminOrders } from "./lib/order-api";
import {
  formatOrderDate,
  formatOrderMoney,
  fulfillmentLabel,
  orderStatusOptions,
} from "./lib/order-format";
import { OrderStatusTag } from "./components/order-status-tag";
import styles from "./orders.module.css";
import type { OrderFilters, OrderSummary } from "./types";

export function OrderListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = readFilters(searchParams);
  const [orderNo, setOrderNo] = useState(filters.orderNo ?? "");
  const [status, setStatus] = useState(filters.status);
  const [submittedFrom, setSubmittedFrom] = useState(toLocalDateTime(filters.submittedFrom));
  const [submittedTo, setSubmittedTo] = useState(toLocalDateTime(filters.submittedTo));
  const orders = useQuery({
    queryKey: ["admin-orders", filters],
    queryFn: () => listAdminOrders(filters),
    placeholderData: (previous) => previous,
  });

  const columns: ColumnsType<OrderSummary> = [
    {
      title: "订单号",
      dataIndex: "orderNo",
      width: 220,
      render: (value: string) => <Link to={`/orders/${encodeURIComponent(value)}`}>{value}</Link>,
    },
    { title: "状态", dataIndex: "status", width: 110, render: (value: number) => <OrderStatusTag status={value} /> },
    {
      title: "应付金额",
      dataIndex: "payableAmountFen",
      width: 130,
      className: styles.numericCell,
      render: (value: number, row) => formatOrderMoney(value, row.currencyCode),
    },
    {
      title: "已支付",
      dataIndex: "paidAmountFen",
      width: 130,
      className: styles.numericCell,
      responsive: ["md"],
      render: (value: number, row) => formatOrderMoney(value, row.currencyCode),
    },
    {
      title: "履约类型",
      dataIndex: "fulfillmentType",
      width: 120,
      responsive: ["lg"],
      render: fulfillmentLabel,
    },
    {
      title: "提交时间",
      dataIndex: "submittedAt",
      width: 180,
      responsive: ["md"],
      render: formatOrderDate,
    },
  ];

  function submitFilters() {
    const next = new URLSearchParams();
    if (orderNo.trim()) next.set("orderNo", orderNo.trim());
    if (status) next.set("status", status);
    if (submittedFrom) next.set("submittedFrom", new Date(submittedFrom).toISOString());
    if (submittedTo) next.set("submittedTo", new Date(submittedTo).toISOString());
    next.set("page", "1");
    next.set("pageSize", String(filters.pageSize));
    setSearchParams(next);
  }

  function resetFilters() {
    setOrderNo("");
    setStatus(undefined);
    setSubmittedFrom("");
    setSubmittedTo("");
    setSearchParams({ page: "1", pageSize: "20" });
  }

  return (
    <div className={styles.orderWorkspace}>
      <Form className={styles.filterBar} layout="vertical" onFinish={submitFilters}>
        <Form.Item label="订单号">
          <Input aria-label="订单号" value={orderNo} allowClear onChange={(event) => setOrderNo(event.target.value)} />
        </Form.Item>
        <Form.Item label="订单状态">
          <Select aria-label="订单状态" value={status} allowClear options={orderStatusOptions} onChange={setStatus} />
        </Form.Item>
        <Form.Item label="提交开始时间">
          <Input
            aria-label="提交开始时间"
            type="datetime-local"
            value={submittedFrom}
            onChange={(event) => setSubmittedFrom(event.target.value)}
          />
        </Form.Item>
        <Form.Item label="提交结束时间">
          <Input
            aria-label="提交结束时间"
            type="datetime-local"
            value={submittedTo}
            onChange={(event) => setSubmittedTo(event.target.value)}
          />
        </Form.Item>
        <Form.Item className={styles.filterActions} label=" ">
          <Space>
            <Button htmlType="submit" icon={<SearchOutlined />} type="primary">查询</Button>
            <Button onClick={resetFilters}>重置</Button>
          </Space>
        </Form.Item>
      </Form>

      {orders.error ? <OrderQueryError error={orders.error} onRetry={() => void orders.refetch()} /> : null}
      <Table<OrderSummary>
        columns={columns}
        dataSource={orders.data?.items ?? []}
        loading={orders.isPending || orders.isFetching}
        locale={{ emptyText: <Empty description="暂无符合条件的订单" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        pagination={{
          current: filters.page,
          pageSize: filters.pageSize,
          total: orders.data?.total ?? 0,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 笔订单`,
          onChange: (page, pageSize) => {
            const next = new URLSearchParams(searchParams);
            next.set("page", String(pageSize === filters.pageSize ? page : 1));
            next.set("pageSize", String(pageSize));
            setSearchParams(next);
          },
        }}
        rowKey="orderNo"
        scroll={{ x: 760 }}
        size="middle"
      />
    </div>
  );
}

function OrderQueryError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const traceId = error instanceof AdminApiError ? error.traceId : null;
  return (
    <Alert
      action={<Button onClick={onRetry}>重试</Button>}
      className={styles.queryError}
      description={traceId ? `追踪编号：${traceId}` : undefined}
      message={error.message}
      showIcon
      type="error"
    />
  );
}

function readFilters(params: URLSearchParams): OrderFilters {
  return {
    orderNo: params.get("orderNo") || undefined,
    status: params.get("status") || undefined,
    submittedFrom: params.get("submittedFrom") || undefined,
    submittedTo: params.get("submittedTo") || undefined,
    page: positiveInteger(params.get("page"), 1),
    pageSize: Math.min(100, positiveInteger(params.get("pageSize"), 20)),
  };
}

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toLocalDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
