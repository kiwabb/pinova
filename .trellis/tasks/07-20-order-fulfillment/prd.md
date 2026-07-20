# 取消履约与完成闭环

Parent: `07-20-commerce-operation-lifecycle`

## Goal

实现 checkout 取消、整单发货、物流更正、会员确认、7 天自动完成和后台强制完成，并接入 C 端与后台。

## Acceptance Criteria

* [ ] 取消与支付成功/超时并发安全且库存只释放一次。
* [ ] 发货需要承运商与物流单号并保持幂等。
* [ ] 三种完成入口复用状态机且只完成一次。
