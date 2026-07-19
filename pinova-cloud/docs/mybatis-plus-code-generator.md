# MyBatis-Plus 代码生成器

Pinova 的代码生成器位于 `pinova-mapper/src/test`，只参与开发期测试类路径，不会进入生产 JAR。

## 生成范围

| 内容 | 输出模块 | 包或目录 |
| --- | --- | --- |
| Entity | `pinova-pojo` | `com.pinova.pojo.entity` |
| Mapper | `pinova-mapper` | `com.pinova.mapper` |
| Mapper XML | `pinova-mapper` | `src/main/resources/mapper` |
| Service | `pinova-service` | `com.pinova.service` |
| Service 实现 | `pinova-service` | `com.pinova.service.impl` |
| Controller | `pinova-api` | `com.pinova.api.controller` |

## 使用方式

先确认 PostgreSQL 容器健康：

```bash
docker compose up -d postgres
```

首次使用或其他模块发生变更后，先安装项目模块：

```bash
mvn install -DskipTests
```

从项目根目录执行，表名之间使用英文逗号分隔：

```bash
mvn -pl pinova-mapper \
  -DskipTests \
  test-compile exec:java \
  -Dexec.args=member_account,product_spu
```

生成器按以下顺序读取数据库配置：

1. Java 系统属性；
2. 环境变量；
3. 项目根目录下未提交 Git 的 `.env`；
4. 本地默认值。

`PINOVA_DB_PASSWORD` 没有默认值，必须通过上述任一方式提供。

## 安全约束

- 必须显式指定表名，不能无参数生成整个 schema。
- 默认不覆盖已经存在的 Java 或 XML 文件。
- 生成代码后必须检查字段类型、主键、逻辑删除、乐观锁和索引对应的查询。
- 业务逻辑和复杂 SQL 不由生成器维护。

## PostgreSQL 类型映射

- `timestamptz` 生成为 `Instant`，表达数据库保存的绝对时间点。
- `inet` 生成为 `InetAddress`，由 `PostgreSqlInetTypeHandler` 负责 JDBC 读写。
- `json`、`jsonb` 生成为 `String`；实体字段需配置 `PostgreSqlJsonbStringTypeHandler` 后再用于写入。
- `version` 自动添加 `@Version`，`deleted` 自动添加 `@TableLogic`。
- 实体不生成 `toString()`，避免密码摘要、手机号等敏感字段被写入日志。
