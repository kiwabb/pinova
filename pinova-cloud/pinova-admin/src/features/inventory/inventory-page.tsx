import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tabs } from "antd";
import { useState } from "react";

import { operationsApi, type Stock, type Warehouse } from "../operations/api";

export function InventoryPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [stock, setStock] = useState<Stock>();
  const [warehouse, setWarehouse] = useState<Warehouse | null>();
  const [warehouseForm] = Form.useForm();
  const [adjustForm] = Form.useForm();
  const warehouses = useQuery({ queryKey: ["admin-warehouses"], queryFn: operationsApi.warehouses });
  const stocks = useQuery({ queryKey: ["admin-stocks"], queryFn: operationsApi.stocks });
  const saveWarehouse = useMutation({
    mutationFn: (values: Record<string, unknown>) => operationsApi.saveWarehouse(warehouse?.id ?? null, { ...values, version: warehouse?.version }),
    onSuccess: async () => { setWarehouse(undefined); warehouseForm.resetFields(); await queryClient.invalidateQueries({ queryKey: ["admin-warehouses"] }); void message.success("仓库已保存"); },
    onError: (error) => void message.error(error.message),
  });
  const adjust = useMutation({
    mutationFn: (values: Record<string, unknown>) => operationsApi.adjustStock(stock!, values),
    onSuccess: async () => { setStock(undefined); adjustForm.resetFields(); await queryClient.invalidateQueries({ queryKey: ["admin-stocks"] }); void message.success("库存已调整"); },
    onError: (error) => void message.error(error.message),
  });
  const openWarehouse = (current: Warehouse | null) => {
    setWarehouse(current);
    warehouseForm.setFieldsValue(current ?? { warehouseType: 1, status: 1 });
  };
  return <>
    <Tabs items={[
      { key: "stocks", label: "库存余额", children: <Table<Stock> loading={stocks.isPending} dataSource={stocks.data} rowKey="id" columns={[{ title: "仓库 ID", dataIndex: "warehouseId" }, { title: "SKU ID", dataIndex: "skuId" }, { title: "现货", dataIndex: "onHandQuantity" }, { title: "预占", dataIndex: "reservedQuantity" }, { title: "可售", dataIndex: "availableQuantity" }, { title: "操作", render: (_, row) => <Button onClick={() => setStock(row)}>调整</Button> }]} pagination={{ pageSize: 20 }} /> },
      { key: "warehouses", label: "仓库", children: <Space direction="vertical" style={{ width: "100%" }}><Button type="primary" onClick={() => openWarehouse(null)}>新增仓库</Button><Table<Warehouse> loading={warehouses.isPending} dataSource={warehouses.data} rowKey="id" columns={[{ title: "编码", dataIndex: "warehouseCode" }, { title: "名称", dataIndex: "name" }, { title: "店铺", dataIndex: "shopId" }, { title: "状态", dataIndex: "status", render: (value) => value === 1 ? "启用" : "停用" }, { title: "操作", render: (_, row) => <Button onClick={() => openWarehouse(row)}>编辑</Button> }]} pagination={false} /></Space> },
    ]} />
    <Modal title={warehouse ? "编辑仓库" : "新增仓库"} open={warehouse !== undefined} onCancel={() => setWarehouse(undefined)} onOk={() => warehouseForm.submit()} confirmLoading={saveWarehouse.isPending}>
      <Form form={warehouseForm} layout="vertical" onFinish={(values) => saveWarehouse.mutate(values)}>
        <Form.Item name="shopId" label="店铺 ID" rules={[{ required: true }]}><Input disabled={Boolean(warehouse)} /></Form.Item>
        <Form.Item name="warehouseCode" label="编码" rules={[{ required: true }]}><Input disabled={Boolean(warehouse)} /></Form.Item>
        <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="warehouseType" label="类型"><Select options={[{ value: 1, label: "仓库" }, { value: 2, label: "门店" }]} /></Form.Item>
        <Form.Item name="status" label="状态"><Select options={[{ value: 1, label: "启用" }, { value: 0, label: "停用" }]} /></Form.Item>
      </Form>
    </Modal>
    <Modal title="调整库存" open={Boolean(stock)} onCancel={() => setStock(undefined)} onOk={() => adjustForm.submit()} confirmLoading={adjust.isPending}>
      <Form form={adjustForm} layout="vertical" onFinish={(values) => adjust.mutate(values)} initialValues={{ mode: "DELTA" }}>
        <Form.Item name="transactionNo" label="业务幂等键" initialValue={crypto.randomUUID()} rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="mode" label="方式"><Select options={[{ value: "DELTA", label: "增量调整" }, { value: "COUNT", label: "盘点实数" }]} /></Form.Item>
        <Form.Item name="quantity" label="数量" rules={[{ required: true }]}><InputNumber style={{ width: "100%" }} /></Form.Item>
        <Form.Item name="reason" label="原因" rules={[{ required: true }]}><Input.TextArea /></Form.Item>
      </Form>
    </Modal>
  </>;
}
