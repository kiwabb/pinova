# Pinova 订单下单链路

本文只讲一次订单提交如何在 Pinova 中完成，不包含本地环境搭建、支付流程和后台管理。

## 1. 先看完整链路

```text
购物车
  -> /checkout
  -> 点击“提交订单”
  -> POST /api/orders
  -> Next.js 转发到 POST /orders
  -> TradeOrderController
  -> TradeOrderServiceImpl
  -> 锁定并校验购物车、地址、商品和库存
  -> 按店铺拆分订单
  -> 写入订单、商品快照、地址快照和库存预占
  -> 返回 checkoutNo + orders[]
```

一次结算可能包含多个店铺，因此一次提交对应一个 `checkoutNo`，最终可能创建多张订单。不能把一次结算简单理解为一张订单。

## 2. 用户从哪里开始

购物车汇总区域在 [`shopping-cart-page.tsx`](../../../pinova-web/src/features/shopping-cart/shopping-cart-page.tsx) 中渲染“去结算”。只有存在已选商品，且选中商品都有有效价格时，链接才会进入 `/checkout`。

结算页面入口是 [`app/checkout/page.tsx`](../../../pinova-web/src/app/checkout/page.tsx)，实际页面组件是 [`checkout-page.tsx`](../../../pinova-web/src/features/checkout/checkout-page.tsx)。页面负责展示：

- 收货地址
- 已选商品
- 订单备注
- 订单汇总
- 提交成功后的订单号

真正的提交状态和请求调用由 `useCheckout` 处理，页面只把备注传给 `placeOrder`。

## 3. 前端提交什么

点击“提交订单”后，`useCheckout` 从当前结算数据组装请求。前端只提交来源数据和版本号，不提交订单号、店铺、库存、价格或金额：

```json
{
  "cartId": "980000000000000001",
  "shippingAddressId": "970000000000000001",
  "shippingAddressVersion": 3,
  "items": [
    {
      "cartItemId": "990000000000000001",
      "cartItemVersion": 1,
      "skuId": "920000000000000001",
      "quantity": 1
    }
  ],
  "buyerRemark": "周末收货"
}
```

组装逻辑位于 [`use-checkout.ts`](../../../pinova-web/src/features/checkout/hooks/use-checkout.ts)。提交前还会检查选中地址、商品数量和价格可用性。

同一个结算会话只生成一次 `Idempotency-Key`，并在重试时复用。这样网络超时后再次点击不会因为客户端重试而创建重复订单。

## 4. 前端请求如何到达 Java API

前端请求函数位于 [`order-api.ts`](../../../pinova-web/src/features/checkout/lib/order-api.ts)，请求地址是：

```text
POST /api/orders
Content-Type: application/json
Idempotency-Key: <UUID>
```

Next.js 路由 [`app/api/orders/route.ts`](../../../pinova-web/src/app/api/orders/route.ts) 不创建订单，只调用 `proxyOrderRequest` 转发请求。代理会透传：

- 请求体
- Cookie 中的会员会话和购物车令牌
- `Idempotency-Key`

Java 服务的上游地址由 `PINOVA_API_BASE_URL` 配置，默认是 `http://127.0.0.1:8080`。因此 `/api/orders` 是 Web 层代理入口，领域 API 的真实路径是 `/orders`。

## 5. Controller 做什么

Java 入口是 [`TradeOrderController.java`](../../../pinova-api/src/main/java/com/pinova/api/controller/TradeOrderController.java) 的 `POST /orders`。

Controller 负责三件事：

1. 通过当前会员解析器取得登录会员 ID。
2. 读取 `Idempotency-Key`、购物车 Cookie 和 `SubmitOrderRequest`。
3. 将 API Request 转换成 Service 使用的 `SubmitOrderCommand`，再把 Service Result 组装成 Response。

请求模型是 [`SubmitOrderRequest.java`](../../../pinova-api/src/main/java/com/pinova/api/request/SubmitOrderRequest.java)，Service 边界模型是 [`SubmitOrderCommand.java`](../../../pinova-service/src/main/java/com/pinova/service/command/SubmitOrderCommand.java)。Service 不直接依赖 HTTP Request，这是项目的边界约定。

## 6. Service 如何创建订单

核心实现位于 [`TradeOrderServiceImpl.java`](../../../pinova-service/src/main/java/com/pinova/service/impl/TradeOrderServiceImpl.java) 的 `submitOrder`。方法带有事务边界，主要顺序如下：

### 6.1 规范化请求并计算哈希

Service 先规范化幂等键、商品行和备注，再计算请求载荷的 SHA-256 哈希。数据库的 `request_hash` 用于判断同一个幂等键是否代表同一次请求。

- 相同幂等键、相同请求哈希：返回已有订单结果。
- 相同幂等键、不同请求哈希：返回幂等冲突。

订单号由服务端生成，前端不能生成或伪造订单号。

### 6.2 锁定同一个结算

Service 先获取 checkout 级别的事务锁，再查询已经创建的订单。这一步处理并发重复提交：两个相同请求不能同时判断“订单还不存在”并各自创建一套订单。

### 6.3 锁定和重新校验来源数据

Service 不信任前端的金额和商品状态，而是重新读取并锁定：

- 当前有效购物车
- 购物车商品行及版本
- 收货地址及版本
- 商品和 SKU 的当前状态与价格

版本不一致、商品未选中、商品不可售、价格无效或库存不足时，提交失败，事务整体回滚。

### 6.4 按店铺拆单

服务端按照商品所属 `shopId` 分组，并按稳定顺序创建订单。每张订单只属于一个店铺和一种履约类型；同一次结算的订单共享同一个 `checkoutNo`。

```java
Map<Long, List<ValidatedLine>> linesByShop = validatedLines.stream()
    .collect(Collectors.groupingBy(line -> line.product().getShopId()));
```

这是为什么成功响应使用 `orders[]`，而不是只返回一个 `orderNo`。

### 6.5 写入订单聚合

每个店铺分组会依次写入：

1. `trade_order` 订单主表
2. `trade_order_shipping_address` 地址快照
3. `trade_order_item` 商品行快照
4. 库存预占和库存流水

最后消费本次已选购物车商品。任一步失败，事务回滚，不留下半张订单或只扣库存未建单的状态。

## 7. 数据库保存什么

订单由三张核心表组成，表结构脚本是 [`023-create-trade-order.sql`](../../../database/init/023-create-trade-order.sql)。

### `trade_order`

保存订单聚合状态、店铺、结算号、金额、买家备注和生命周期时间。金额单位是分，并由服务端计算：

```text
payable_amount_fen = goods_amount_fen - discount_amount_fen + shipping_amount_fen
```

首版实物订单创建时通常进入“待支付”；零元订单可直接进入“待履约”。订单事实不使用软删除，未支付订单关闭通过状态和关闭原因表达。

### `trade_order_item`

保存成交时的商品行快照，包括商品名、SKU 编码、规格、主图、单价和数量。商品后续改名、调价或下架，都不能改变历史订单展示。

### `trade_order_shipping_address`

保存下单时的收货人、手机号、地区名称和详细地址快照。订单查询和履约读取这张快照，不回查会员当前地址，避免会员修改地址后历史订单被改变。

## 8. 成功响应和后续入口

Service 返回 `SubmittedCheckoutResult`，API 返回 `SubmittedCheckoutResponse`：

```json
{
  "code": "SUCCESS",
  "data": {
    "checkoutNo": "550e8400-e29b-41d4-a716-446655440000",
    "orders": [
      {
        "id": "930000000000000001",
        "orderNo": "PO202607180001",
        "status": "PENDING_PAYMENT"
      }
    ]
  }
}
```

前端收到成功结果后展示全部订单号，并提供两个后续入口：

- `立即支付`：将 `checkoutNo` 交给支付流程。支付不属于本文范围。
- `查看我的订单`：进入 `/account/orders`，查询当前会员的订单历史。

## 9. 阅读这条链路时要抓住的原则

- 前端提交来源 ID 和版本，不提交权威金额。
- 服务端重新校验商品、价格、地址、购物车和库存。
- 一个结算可以拆成多张店铺订单，响应必须返回 `checkoutNo + orders[]`。
- 订单商品和地址都是创建时快照，不能依赖后续可变数据。
- 幂等、锁、库存、建单和购物车消费属于同一个事务边界。

## 相关规范

- [交易订单数据库设计](../../../database/trade-order.md)
- [后端交易订单契约](../../../../.trellis/spec/backend/trade-order-contract.md)
- [前端结算订单契约](../../../../.trellis/spec/frontend/checkout-order-contract.md)
