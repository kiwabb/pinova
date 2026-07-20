# 交易状态机与审计基础

Parent: `07-20-commerce-operation-lifecycle`

## Goal

建立后续闭环依赖的数据库迁移、订单状态扩展、履约/售后/退款/审计实体以及 SUPER_ADMIN 写权限校验。

## Acceptance Criteria

* [ ] 前向迁移包含约束、索引、注释和幂等执行保护。
* [ ] 状态枚举、实体、Mapper 与数据库一致。
* [ ] 后台写权限只能由 SUPER_ADMIN 通过。
* [ ] 统一审计服务可在业务事务中记录非敏感操作事实。
