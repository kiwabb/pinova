# 商城支付渠道与接入方案调研

## 结论

首期推荐接入支付宝电脑网站支付沙箱，并在业务层定义统一的 `PaymentProvider` 接口。这样可以在本地开发阶段完成创建支付、跳转收银台、异步通知验签、主动查单和支付结果落库的完整闭环，同时不阻塞后续增加微信 Native 支付。

## 当前仓库约束

- 商城前端是桌面 Web 商城，支付宝电脑网站支付和微信 Native 二维码支付都符合当前交互形态。
- 一次结算可以按店铺拆成多个 `trade_order`，这些订单通过同一个 `checkout_no` 关联。
- `trade_order` 已有应付金额、已付金额、支付过期时间和支付时间，但没有独立支付单。
- 当前库存流程只完成预占；支付成功后还需要把预占转为扣减，并写入库存流水。
- 当前本地环境无法直接接收公网异步通知，因此联调时需要内网穿透或部署一个公开 HTTPS 回调地址，并保留主动查单作为补偿。

## 方案 A：支付宝电脑网站支付沙箱（推荐）

调用 `alipay.trade.page.pay` 创建支付，浏览器跳转支付宝沙箱收银台。服务端通过异步通知验签确认支付，也可以通过交易查询补偿通知丢失。

优点：

- 官方提供沙箱，当前阶段可以完成真实协议联调。
- 适合桌面 Web 商城，用户体验是标准的跳转收银台。
- RSA2 验签、异步通知和主动查单的协议边界清晰。

限制：

- 需要沙箱应用 ID、应用私钥和支付宝公钥。
- 浏览器 `return_url` 只能用于展示结果，不能作为支付成功依据。
- 异步通知需要公网可访问地址；本地开发需通过隧道或测试环境接收。

## 方案 B：微信 Native 支付

服务端调用微信支付 v3 Native 下单接口获取 `code_url`，前端生成二维码，用户使用微信扫码付款。

优点：

- 适合 PC 商城，用户无需离开当前页面。
- 后续可以复用微信支付生态。

限制：

- 需要已开通 Native 支付的真实微信支付商户号，开发门槛高于支付宝沙箱。
- 回调必须校验 `Wechatpay-*` 请求头签名并使用 API v3 Key 解密 AES-256-GCM 报文。
- 仍需要公网 HTTPS 回调、主动查单、幂等处理和支付超时关闭。

## 方案 C：支付抽象加本地模拟渠道

先建立完整支付状态机和本地模拟渠道，再替换或新增支付宝、微信实现。

优点：

- 不依赖商户资质，可以先把订单、库存和支付单的数据一致性做完整。
- 自动化测试稳定，适合覆盖重复通知、金额不一致和状态冲突等场景。

限制：

- 模拟支付不能证明第三方签名、网关参数和异步通知配置正确。
- 后续仍需完成真实渠道联调，不应被当作生产支付方式。

## 推荐架构

```text
Storefront API
  -> PaymentApplicationService
       -> PaymentProvider
            -> AlipayPagePayProvider
            -> WechatNativeProvider (later)
            -> MockPaymentProvider (test/local only)

Provider notification/query
  -> verify provider result
  -> lock payment record and order
  -> mark payment successful
  -> move order 0 (待支付) -> 1 (待履约)
  -> set paid amount and paid time
  -> convert inventory reservation 0 (已预占) -> 1 (已扣减)
  -> update stock and append immutable inventory ledger
```

建议新增独立支付单表，至少保存业务支付单号、付款粒度、会员、金额、币种、渠道、渠道交易号、状态、过期时间、成功时间及原始通知摘要。异步通知处理必须以业务支付单号和渠道交易号为幂等边界，并在一个数据库事务内完成支付单、订单和库存状态变更。

不应把商户私钥、微信 API v3 Key、通知密钥或其他凭证提交到仓库。凭证由环境变量或部署密钥管理注入。

## 官方资料

- 支付宝电脑网站支付：<https://opendocs.alipay.com/open/270/105899/>
- 支付宝异步通知验签：<https://opendocs.alipay.com/support/01rfvs>
- 支付宝电脑网站支付接口：<https://opendocs.alipay.com/open/59da99d0_alipay.trade.page.pay>
- 微信 Native 下单：<https://pay.wechatpay.cn/doc/v3/merchant/4012791891>
- 微信支付通知：<https://pay.wechatpay.cn/doc/v3/merchant/4012791882>
