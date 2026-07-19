# Spring 事务传播行为

本文基于 Pinova 当前使用的 Spring Boot 3.5.16 和 Spring Framework 6.2.19，说明 `@Transactional` 的七种传播行为、代理调用边界及测试方法。

课程参考：[事务传播视频](https://b.quark.cn/apps/5AZ7aRopS/routes/mofb35Rkb?debug=0&fid=56bb7d2f4dfd4a0f8a50b90a7ea4f009)。原提纲对应的主要时间点为：源码 `00:32`、测试准备 `01:22`、JUnit `03:05`、无事务测试 `04:53`、`REQUIRED` `06:45`、`SUPPORTS` `12:18`、`MANDATORY` `14:59`。

## 1. `@Transactional` 是什么

Java 源码使用 `@interface` 声明 `@Transactional`。它是注解类型，不是业务接口。反编译工具会把注解显示为继承 `java.lang.annotation.Annotation` 的接口，这是 Java 注解在字节码中的表示方式。

`@Transactional` 可以标注在类或方法上。方法级配置优先于类级配置。

传播行为由 `propagation` 属性指定：

```java
@Transactional(propagation = Propagation.REQUIRED)
public void saveOrder() {
    // ...
}
```

不显式设置时，默认值是：

```java
Propagation.REQUIRED
```

传播行为解决的问题是：一个带事务语义的方法被调用时，应该加入当前事务、创建新事务、暂停事务，还是拒绝执行。

## 2. 事务通过代理生效

Spring 默认使用 AOP 代理拦截 `@Transactional` 方法：

```text
调用方
  -> Spring 事务代理
    -> 开启、加入、暂停或检查事务
      -> 目标方法
    -> 提交或回滚
```

只有经过代理的调用才能触发事务拦截器。同一个类中的内部调用通常绕过代理：

```java
public void saveAll() {
    this.saveChildren(); // 默认代理模式下，不会重新解析 saveChildren 的事务注解
}

@Transactional(propagation = Propagation.REQUIRES_NEW)
public void saveChildren() {
    // ...
}
```

因此，测试传播行为时应把外层协调方法和内层事务方法放在不同的 Spring Bean 中：

```text
StudentFacade
  -> ParentService
  -> ChildService
```

`StudentFacade` 调用 `ChildService` 时会经过 `ChildService` 的代理，`propagation` 才会生效。

## 3. 七种传播行为

| 传播行为 | 当前没有事务 | 当前已有事务 |
| --- | --- | --- |
| `REQUIRED` | 创建事务 | 加入当前事务 |
| `SUPPORTS` | 非事务执行 | 加入当前事务 |
| `MANDATORY` | 抛出异常 | 加入当前事务 |
| `REQUIRES_NEW` | 创建新事务 | 暂停当前事务并创建独立事务 |
| `NOT_SUPPORTED` | 非事务执行 | 暂停当前事务并非事务执行 |
| `NEVER` | 非事务执行 | 抛出异常 |
| `NESTED` | 创建事务 | 在当前物理事务中创建保存点 |

这里的“加入当前事务”通常表示多个逻辑事务范围共用同一个物理数据库事务和连接。

### 3.1 `REQUIRED`

`REQUIRED` 是默认传播行为：有事务就加入，没有事务就创建。

```java
@Transactional
public void saveAll() {
    parentService.saveParent();
    childService.saveChildren();
}
```

即使 `saveParent()` 和 `saveChildren()` 没有 `@Transactional`，它们执行的数据库操作也会使用当前线程绑定的外层事务。这里不是子方法的传播属性生效，而是数据访问代码运行在已经存在的事务上下文中。

如果 `saveChildren()` 抛出未处理的 `ArithmeticException`，异常继续向外传播，外层事务会回滚，父记录和子记录都不会提交。

如果内层方法也标注 `REQUIRED`，它会建立一个新的逻辑事务范围，但仍共用外层物理事务。内层把事务标记为 rollback-only 后，即使外层捕获异常并继续返回，最终提交时仍可能抛出 `UnexpectedRollbackException`。

适合 Pinova 的场景包括：

- 创建订单及订单明细；
- 扣减库存并写入库存流水；
- 更新支付单及支付状态记录；
- 一个用例内必须同时成功或失败的多次写操作。

### 3.2 `SUPPORTS`

`SUPPORTS` 使用已有事务，但不会主动创建事务：

```java
@Transactional(propagation = Propagation.SUPPORTS, readOnly = true)
public ProductDetail queryProduct(long productId) {
    // ...
}
```

外层没有事务时，方法按非事务方式执行；外层存在事务时，方法加入该事务。

`SUPPORTS` 可以用于允许事务可有可无的读取操作，但不能简单理解为“查询都应该使用 SUPPORTS”。一次查询用例包含多次读取并要求一致快照时，使用明确的只读事务通常更稳妥：

```java
@Transactional(readOnly = true)
```

### 3.3 `MANDATORY`

`MANDATORY` 要求调用方已经开启事务：

```java
@Transactional(propagation = Propagation.MANDATORY)
public void appendOrderItem(OrderItem item) {
    // ...
}
```

没有当前事务时，Spring 在进入目标方法前抛出 `IllegalTransactionStateException`，常见消息包含：

```text
No existing transaction found
```

已有事务时，方法加入当前事务。它适合表达明确的调用约束：该方法不能作为独立用例执行，只能作为某个事务流程的一部分。

### 3.4 `REQUIRES_NEW`

`REQUIRES_NEW` 总是创建独立的物理事务。调用方已有事务时，Spring 会先暂停外层事务：

```java
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void saveIndependentAuditLog(AuditLog log) {
    // ...
}
```

内层事务可以独立提交或回滚，不会直接参与外层事务的提交结果。例如内层已经提交后，外层随后回滚，内层数据仍然存在。

它通常需要从连接池额外取得一条连接。大量并发请求在外层持有连接时再进入 `REQUIRES_NEW`，可能耗尽连接池，因此不能把它当作普通的“事务隔离工具”。

### 3.5 `NOT_SUPPORTED`

`NOT_SUPPORTED` 要求方法以非事务方式执行。存在外层事务时，Spring 暂停它，方法结束后再恢复：

```java
@Transactional(propagation = Propagation.NOT_SUPPORTED)
public void runNonTransactionalTask() {
    // ...
}
```

方法中的每次数据库写入通常按连接的自动提交规则处理，不能依赖整体回滚。

### 3.6 `NEVER`

`NEVER` 要求当前不能存在事务：

```java
@Transactional(propagation = Propagation.NEVER)
public void executeOutsideTransaction() {
    // ...
}
```

没有事务时正常执行；存在事务时抛出 `IllegalTransactionStateException`。它用于明确禁止事务上下文的操作。

### 3.7 `NESTED`

`NESTED` 在已有物理事务中创建数据库保存点。内层失败时可以回滚到保存点，同时允许外层事务继续：

```java
@Transactional(propagation = Propagation.NESTED)
public void saveOptionalPart() {
    // ...
}
```

`NESTED` 和 `REQUIRES_NEW` 不相同：

- `NESTED` 通常共用外层连接和物理事务，依靠 savepoint；
- `REQUIRES_NEW` 使用独立物理事务，外层事务会被暂停。

Pinova 使用 PostgreSQL 和 JDBC 事务管理器，PostgreSQL 支持保存点。不过 `NESTED` 是否可用仍取决于具体的 `PlatformTransactionManager`、驱动及配置，不能只看注解名称。

## 4. 无事务和 `REQUIRED` 的差异

假设调用顺序为：

```text
插入 parent
插入 child1
抛出 ArithmeticException
插入 child2（不会执行）
```

### 4.1 没有事务

数据库连接在自动提交模式下执行时，前两条 SQL 各自提交。异常只能中断后续代码，不能撤销已经提交的 `parent` 和 `child1`。

### 4.2 外层使用 `REQUIRED`

三次写操作属于同一个事务。`ArithmeticException` 是运行时异常，默认触发回滚，因此 `parent` 和 `child1` 都不会保留。

`int value = 1 / 0` 可以制造运行时异常，但测试代码更适合直接抛出语义明确的异常：

```java
throw new IllegalStateException("模拟保存子记录失败");
```

这样不会把业务失败误写成算术错误。

## 5. 默认回滚规则

Spring 默认对以下异常回滚：

- `RuntimeException` 及其子类；
- `Error` 及其子类。

受检异常默认不会触发回滚。需要对受检异常回滚时应明确配置：

```java
@Transactional(rollbackFor = Exception.class)
public void importOrders() throws Exception {
    // ...
}
```

事务方法捕获异常后不再抛出，也可能导致事务正常提交。不要为了记录日志而吞掉异常：

```java
@Transactional
public void saveOrder() {
    try {
        doSave();
    } catch (RuntimeException exception) {
        log.error("保存订单失败", exception);
        throw exception;
    }
}
```

## 6. 使用 JUnit 5 测试

Spring Boot 3 默认使用 JUnit Jupiter。测试依赖应放在可启动的 `pinova-api` 模块：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-test</artifactId>
    <scope>test</scope>
</dependency>
```

测试类不再使用 JUnit 4 的 `@RunWith(SpringRunner.class)`：

```java
package com.pinova.transaction;

import com.pinova.PinovaApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertThrows;

@SpringBootTest(classes = PinovaApplication.class)
class TransactionPropagationTest {

    @Autowired
    private StudentFacade studentFacade;

    @Test
    void shouldRollbackRequiredTransaction() {
        assertThrows(IllegalStateException.class, studentFacade::saveAll);
    }
}
```

测试传播行为时，不要随意在测试类或测试方法上添加 `@Transactional`。Spring 测试事务默认在测试结束后回滚，它会改变“外层是否已有事务”这个前提，导致 `SUPPORTS`、`MANDATORY` 等测试得出错误结论。

建议每个用例明确准备和清理测试数据，并在方法执行后查询数据库验证：

- 是否插入 `parent`；
- 是否插入 `child1`；
- 是否插入 `child2`；
- 抛出的异常类型是否符合预期。

## 7. 常见失效原因

### 同类内部调用

`this.method()` 没有经过 Spring 代理，内层方法的传播行为通常不会生效。拆分到另一个 Bean 是最直接的处理方式。

### 对象不是 Spring Bean

通过 `new` 创建的对象不受 Spring 事务代理管理。

### 异常被捕获并吞掉

事务拦截器没有观察到需要回滚的异常，方法可能正常提交。

### 使用不匹配的异常规则

受检异常默认不回滚，需要使用 `rollbackFor` 明确声明。

### 在错误的层使用事务

事务边界通常放在 Service 的用例方法上。Controller 负责协议转换，Mapper 负责数据访问，都不适合作为主要事务边界。

### 误以为本地事务能跨微服务

Spring 的本地事务只覆盖同一应用进程和事务管理器控制的资源。未来拆成微服务后，`@Transactional` 不能让多个服务共同回滚，需要使用事务消息、Outbox、Saga 或补偿机制。

## 8. Pinova 使用建议

- 写用例默认使用 `REQUIRED`，事务边界放在 Service 层。
- 查询用例使用 `@Transactional(readOnly = true)`，不要机械地全部改成 `SUPPORTS`。
- `MANDATORY` 只用于明确禁止独立调用的内部能力。
- `REQUIRES_NEW` 需要评估连接池占用和独立提交是否符合业务一致性。
- `NESTED` 需要验证事务管理器及 PostgreSQL savepoint 行为后再使用。
- 事务内避免远程调用、文件上传和长时间计算，减少持有数据库连接和锁的时间。

## 9. 面试回答

Spring 定义了七种事务传播行为：`REQUIRED`、`SUPPORTS`、`MANDATORY`、`REQUIRES_NEW`、`NOT_SUPPORTED`、`NEVER` 和 `NESTED`。

`REQUIRED` 有事务就加入、没有就创建，是默认值；`SUPPORTS` 有事务就加入、没有就非事务执行；`MANDATORY` 强制要求已有事务。`REQUIRES_NEW` 总是创建独立事务并暂停外层事务；`NOT_SUPPORTED` 暂停事务后非事务执行；`NEVER` 在存在事务时抛异常；`NESTED` 在已有事务中使用保存点。

传播行为依赖 Spring AOP 代理。默认代理模式下，同类内部调用不会触发新的事务拦截。运行时异常和 `Error` 默认回滚，受检异常需要通过 `rollbackFor` 配置。
