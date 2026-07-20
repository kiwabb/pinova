# 仅退款售后闭环

Parent: `07-20-commerce-operation-lifecycle`

## Goal

实现子订单整单全额仅退款的申请、审核、Mock 退款、失败重试、主动对账及两端 UI。

## Acceptance Criteria

* [ ] 售后窗口、活动售后冻结和 REFUNDED 状态正确。
* [ ] 一单最多一笔有效售后和退款，累计退款不超实付。
* [ ] 退款成功不回补库存，失败可幂等重试/对账。
