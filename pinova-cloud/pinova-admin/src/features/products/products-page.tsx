import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Form, Input, InputNumber, Modal, Select, Space, Table, Upload } from "antd";
import { useState } from "react";

import { operationsApi, type Product, type ProductMedia, type ProductSku } from "../operations/api";
import { promptReason } from "../operations/prompt-reason";

type Dialog =
  | { type: "product"; product?: Product }
  | { type: "sku"; product: Product; sku?: ProductSku }
  | { type: "detail" | "media"; product: Product }
  | undefined;

export function ProductsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>();
  const [form] = Form.useForm();
  const products = useQuery({ queryKey: ["admin-products"], queryFn: operationsApi.products });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-products"] });
  const save = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (dialog?.type === "product") {
        return operationsApi.saveProduct(dialog.product?.id ?? null, {
          ...values,
          spuCode: dialog.product?.spuCode ?? values.spuCode,
          version: dialog.product?.version,
        });
      }
      if (dialog?.type === "sku") {
        return operationsApi.saveSku(dialog.product, dialog.sku?.id ?? null, {
          ...values,
          skuCode: dialog.sku?.skuCode ?? values.skuCode,
          version: dialog.sku?.version,
        });
      }
      if (dialog?.type === "detail") {
        return operationsApi.saveDetail(dialog.product, {
          document: JSON.parse(String(values.document)),
          packingList: values.packingList,
          usageInstructions: values.usageInstructions,
          afterSalesNote: values.afterSalesNote,
          version: dialog.product.detail?.version,
        });
      }
      if (!dialog || dialog.type !== "media") throw new Error("操作上下文已失效");
      const file = (values.file as { file: { originFileObj: File } }).file.originFileObj;
      const data = new FormData();
      data.append("file", file);
      data.append("mediaRole", String(values.mediaRole));
      data.append("sortOrder", String(values.sortOrder ?? 0));
      if (values.skuId) data.append("skuId", String(values.skuId));
      if (values.altText) data.append("altText", String(values.altText));
      return operationsApi.uploadMedia(dialog.product, data);
    },
    onSuccess: async () => {
      setDialog(undefined);
      form.resetFields();
      await refresh();
      void message.success("商品资料已保存");
    },
    onError: (error) => void message.error(error.message),
  });
  const remove = useMutation({
    mutationFn: (input: { product: Product; sku?: ProductSku; media?: ProductMedia; reason: string }) => {
      if (input.sku) return operationsApi.deleteSku(input.product, input.sku, input.reason);
      if (input.media) return operationsApi.deleteMedia(input.product, input.media, input.reason);
      return operationsApi.deleteProduct(input.product, input.reason);
    },
    onSuccess: async () => { await refresh(); void message.success("已删除"); },
    onError: (error) => void message.error(error.message),
  });
  const open = (next: Dialog) => {
    setDialog(next);
    form.resetFields();
    if (next?.type === "product") form.setFieldsValue(next.product ?? { status: 0, sortOrder: 0 });
    if (next?.type === "sku") form.setFieldsValue(next.sku ?? { inventoryMode: 1, status: 1, sortOrder: 0 });
    if (next?.type === "detail") form.setFieldsValue({
      document: JSON.stringify(next.product.detail?.document ?? { blocks: [] }, null, 2),
      packingList: next.product.detail?.packingList,
      usageInstructions: next.product.detail?.usageInstructions,
      afterSalesNote: next.product.detail?.afterSalesNote,
    });
    if (next?.type === "media") form.setFieldsValue({ mediaRole: 2, sortOrder: 0 });
  };

  return <>
    <Space direction="vertical" style={{ width: "100%" }}>
      <Button type="primary" onClick={() => open({ type: "product" })}>新增商品</Button>
      <Table<Product>
        loading={products.isPending}
        dataSource={products.data}
        rowKey="id"
        pagination={{ pageSize: 20 }}
        columns={[
          { title: "商品编码", dataIndex: "spuCode" }, { title: "名称", dataIndex: "name" },
          { title: "店铺", dataIndex: "shopId" }, { title: "状态", dataIndex: "status" },
          { title: "SKU 数", render: (_, product) => product.skus.length },
          { title: "操作", render: (_, product) => <Space><Button onClick={() => open({ type: "product", product })}>编辑</Button><Button danger onClick={() => promptReason("删除商品", (reason) => remove.mutateAsync({ product, reason }))}>删除</Button></Space> },
        ]}
        expandable={{ expandedRowRender: (product) => <Space direction="vertical" style={{ width: "100%" }}>
          <Space><Button onClick={() => open({ type: "sku", product })}>新增 SKU</Button><Button onClick={() => open({ type: "detail", product })}>编辑详情</Button><Button onClick={() => open({ type: "media", product })}>上传图片</Button></Space>
          <Table<ProductSku> dataSource={product.skus} rowKey="id" pagination={false} size="small" columns={[
            { title: "SKU", dataIndex: "skuCode" }, { title: "规格", dataIndex: "specSummary" }, { title: "价格（分）", dataIndex: "salePriceFen" }, { title: "状态", dataIndex: "status" },
            { title: "操作", render: (_, sku) => <Space><Button onClick={() => open({ type: "sku", product, sku })}>编辑</Button><Button danger onClick={() => promptReason("删除 SKU", (reason) => remove.mutateAsync({ product, sku, reason }))}>删除</Button></Space> },
          ]} />
          <Table<ProductMedia> dataSource={product.media} rowKey="id" pagination={false} size="small" columns={[
            { title: "对象 Key", dataIndex: "objectKey" }, { title: "关联 SKU", dataIndex: "skuId", render: (value) => value || "SPU" }, { title: "用途", dataIndex: "mediaRole" },
            { title: "操作", render: (_, media) => <Button danger onClick={() => promptReason("删除图片", (reason) => remove.mutateAsync({ product, media, reason }))}>删除</Button> },
          ]} />
        </Space> }}
      />
    </Space>
    <Modal width={680} title={{ product: "商品资料", sku: "SKU 资料", detail: "商品详情", media: "上传图片" }[dialog?.type ?? "product"]} open={Boolean(dialog)} onCancel={() => setDialog(undefined)} onOk={() => form.submit()} confirmLoading={save.isPending}>
      <Form form={form} layout="vertical" onFinish={(values) => save.mutate(values)}>
        {dialog?.type === "product" && <><Form.Item name="shopId" label="店铺 ID" rules={[{ required: true }]}><Input disabled={Boolean(dialog.product)} /></Form.Item><Form.Item name="categoryId" label="叶子类目 ID" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="spuCode" label="商品编码" rules={[{ required: true }]}><Input disabled={Boolean(dialog.product)} /></Form.Item><Form.Item name="name" label="名称" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="summary" label="摘要"><Input.TextArea /></Form.Item><Form.Item name="mainImageKey" label="主图对象 Key"><Input /></Form.Item><Form.Item name="status" label="状态"><Select options={[{ value: 0, label: "草稿" }, { value: 2, label: "上架" }, { value: 3, label: "下架" }]} /></Form.Item><Form.Item name="sortOrder" label="排序"><InputNumber min={0} /></Form.Item></>}
        {dialog?.type === "sku" && <><Form.Item name="skuCode" label="SKU 编码" rules={[{ required: true }]}><Input disabled={Boolean(dialog.sku)} /></Form.Item><Form.Item name="specSummary" label="规格"><Input /></Form.Item><Form.Item name="salePriceFen" label="价格（分）" rules={[{ required: true }]}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item><Form.Item name="inventoryMode" label="库存模式"><Select options={[{ value: 1, label: "跟踪库存" }, { value: 2, label: "无限库存" }]} /></Form.Item><Form.Item name="mainImageKey" label="SKU 主图 Key"><Input /></Form.Item><Form.Item name="barcode" label="条码"><Input /></Form.Item><Form.Item name="status" label="状态"><Select options={[{ value: 1, label: "启用" }, { value: 0, label: "停用" }]} /></Form.Item><Form.Item name="sortOrder" label="排序"><InputNumber min={0} /></Form.Item></>}
        {dialog?.type === "detail" && <><Form.Item name="document" label="结构化详情 JSON" rules={[{ required: true }]}><Input.TextArea rows={12} /></Form.Item><Form.Item name="packingList" label="包装清单"><Input.TextArea /></Form.Item><Form.Item name="usageInstructions" label="使用说明"><Input.TextArea /></Form.Item><Form.Item name="afterSalesNote" label="售后说明"><Input.TextArea /></Form.Item></>}
        {dialog?.type === "media" && <><Form.Item name="file" label="图片" rules={[{ required: true }]}><Upload beforeUpload={() => false} maxCount={1} accept="image/jpeg,image/png,image/webp"><Button>选择图片</Button></Upload></Form.Item><Form.Item name="skuId" label="关联 SKU"><Select allowClear options={dialog.product.skus.map((sku) => ({ value: sku.id, label: sku.skuCode }))} /></Form.Item><Form.Item name="mediaRole" label="用途"><Select options={[{ value: 1, label: "主图" }, { value: 2, label: "图集" }, { value: 3, label: "详情素材" }, { value: 4, label: "规格缩略图" }]} /></Form.Item><Form.Item name="altText" label="替代文本"><Input /></Form.Item><Form.Item name="sortOrder" label="排序"><InputNumber min={0} /></Form.Item></>}
      </Form>
    </Modal>
  </>;
}
