# Spring Boot 自动配置原理

本文基于 Pinova 当前使用的 Spring Boot 3.5.16，说明 Spring Boot 为什么能用很少的显式配置启动一个 Web 应用，以及自动配置、组件扫描和内嵌 Tomcat 是如何协作的。

## 1. “零配置”并不是真的没有配置

传统 Spring MVC 项目通常需要手动完成这些工作：

- 创建和刷新 Spring 容器；
- 注册 `DispatcherServlet`；
- 配置组件扫描、JSON 转换器和静态资源处理；
- 安装并配置外部 Servlet 容器；
- 管理大量框架依赖及其版本。

Spring Boot 没有取消这些配置，而是根据类路径、已有 Bean、配置项和应用类型提供默认配置。应用只需要声明依赖和少量差异化配置。

这套机制由四部分组成：

1. Starter 组织依赖；
2. 自动配置类提供默认 Bean；
3. 条件注解决定配置是否生效；
4. 用户自定义 Bean 和外部配置覆盖默认行为。

## 2. 启动入口

Pinova 的启动类位于 `com.pinova` 根包：

```java
package com.pinova;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class PinovaApplication {

    public static void main(String[] args) {
        SpringApplication.run(PinovaApplication.class, args);
    }
}
```

`SpringApplication.run(PinovaApplication.class, args)` 主要完成以下工作：

1. 以 `PinovaApplication` 作为主配置源创建 `SpringApplication`；
2. 推断应用类型，例如 Servlet Web、Reactive Web 或普通应用；
3. 准备 `Environment`，加载命令行参数和外部配置；
4. 创建并刷新合适的 `ApplicationContext`；
5. 发布启动过程中的事件；
6. 执行 `ApplicationRunner` 和 `CommandLineRunner`；
7. 返回已经启动的 `ConfigurableApplicationContext`。

`args` 是程序启动时传入的命令行参数，不是占位参数。例如：

```bash
java -jar pinova-api.jar --server.port=9090
```

这里的 `--server.port=9090` 会进入 Spring `Environment`，并覆盖 Web 服务器的默认端口。

## 3. `@SpringBootApplication` 包含什么

`@SpringBootApplication` 是组合注解，主要包含：

```java
@SpringBootConfiguration
@EnableAutoConfiguration
@ComponentScan
```

### 3.1 `@SpringBootConfiguration`

`@SpringBootConfiguration` 是一个注解，并通过 `@Configuration` 标记当前类为配置类。它不是接口，也不等同于整个 IoC 容器。

配置类可以声明 `@Bean` 方法，Spring 会把这些方法创建的对象注册到容器中。Spring Boot 通常还会把这个主配置类用于测试和配置源定位。

### 3.2 `@ComponentScan`

`@ComponentScan` 从启动类所在包开始扫描组件。Pinova 的启动类位于 `com.pinova`，因此默认可以扫描：

```text
com.pinova.api
com.pinova.service
com.pinova.mapper
com.pinova.pojo
com.pinova.common
```

带有下列注解的类可以被注册为 Bean：

- `@Component`
- `@Service`
- `@Repository`
- `@Controller`
- `@RestController`
- `@Configuration`

如果某个组件放在 `org.example` 下，它不属于 `com.pinova` 的子包，默认不会被扫描。最稳妥的做法是把启动类放在项目根包，不要随意扩大 `scanBasePackages`。

### 3.3 `@EnableAutoConfiguration`

`@EnableAutoConfiguration` 通过 `@Import(AutoConfigurationImportSelector.class)` 接入自动配置选择器。

它的核心任务是：找出当前依赖环境下可以使用的自动配置类，过滤不满足条件的配置，再把剩余配置导入 Spring 容器。

## 4. 自动配置类如何被加载

Spring Boot 3.5 的主要调用关系可以概括为：

```text
@SpringBootApplication
  -> @EnableAutoConfiguration
    -> @Import(AutoConfigurationImportSelector.class)
      -> 读取自动配置候选类
      -> 排除用户明确禁用的配置
      -> 根据条件注解过滤
      -> 导入符合条件的自动配置类
```

Spring Boot 3 的自动配置候选类清单位于：

```text
META-INF/spring/
org.springframework.boot.autoconfigure.AutoConfiguration.imports
```

在 `spring-boot-autoconfigure-3.5.16.jar` 中可以找到这个文件。文件内每一行都是一个自动配置类，例如 Web MVC、事务、数据源和模板引擎相关配置。

旧版本教程常说自动配置类来自：

```text
META-INF/spring.factories
```

这对 Spring Boot 2.6 及更早版本成立。Spring Boot 2.7 开始迁移到 `AutoConfiguration.imports`，Spring Boot 3 应按新机制理解。`spring.factories` 文件仍然存在，并用于其他 Spring Boot SPI，但它不再是自动配置类清单的主要来源。

`AutoConfigurationImportSelector` 属于 `DeferredImportSelector`。它会在普通配置类处理完成后再选择自动配置，使用户配置有机会优先生效。

## 5. 条件装配和“退让”机制

自动配置类不会无条件创建全部 Bean。常见条件包括：

| 注解 | 作用 |
| --- | --- |
| `@ConditionalOnClass` | 类路径中存在指定类时生效 |
| `@ConditionalOnMissingClass` | 类路径中不存在指定类时生效 |
| `@ConditionalOnBean` | 容器中存在指定 Bean 时生效 |
| `@ConditionalOnMissingBean` | 容器中不存在指定 Bean 时生效 |
| `@ConditionalOnProperty` | 配置项满足条件时生效 |
| `@ConditionalOnWebApplication` | 当前应用是 Web 应用时生效 |
| `@ConditionalOnResource` | 指定资源存在时生效 |

例如，一个自动配置方法使用 `@ConditionalOnMissingBean` 时，Spring Boot 只会在用户没有声明同类型 Bean 的情况下提供默认实现。用户一旦定义自己的 Bean，默认配置就会退让。这通常被称为 back-off 机制。

因此，自动配置的行为不是“把所有配置批量执行一遍”，而是“导入候选配置，再根据条件选择当前应用真正需要的部分”。

## 6. Spring MVC 为什么能直接使用

Pinova 引入了：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

`spring-boot-starter-web` 会引入 Spring MVC、JSON 处理以及默认的内嵌 Tomcat 依赖。类路径满足条件后，多组自动配置共同完成 Web 层初始化：

- `DispatcherServletAutoConfiguration` 创建并注册 `DispatcherServlet`；
- `WebMvcAutoConfiguration` 配置消息转换器、静态资源、参数绑定和格式化等 MVC 默认行为；
- `HttpMessageConvertersAutoConfiguration` 组织 HTTP 消息转换器；
- `JacksonAutoConfiguration` 提供 Jackson 相关默认配置；
- `ErrorMvcAutoConfiguration` 配置默认错误处理。

应用仍然可以通过 `WebMvcConfigurer` 增加拦截器、转换器或跨域配置。

不要为了“开启 Spring MVC”直接添加 `@EnableWebMvc`。在 Spring Boot 应用中，`@EnableWebMvc` 表示由应用全面接管 MVC 配置，会使 `WebMvcAutoConfiguration` 的一部分默认行为退让。只有确实需要完全控制 MVC 时才使用它。

## 7. 内嵌 Tomcat 如何启动

Tomcat 能随应用启动，包含依赖装配和容器启动两个阶段。

### 7.1 依赖阶段

默认依赖关系大致为：

```text
spring-boot-starter-web
  -> spring-boot-starter-tomcat
    -> Tomcat Embed 相关依赖
```

Tomcat 不是凭空由某个自动配置类下载的。Maven 在构建项目时已经把内嵌 Tomcat 放入运行时类路径。

### 7.2 启动阶段

启动过程可以概括为：

```text
SpringApplication 判断为 Servlet Web 应用
  -> 创建 ServletWebServerApplicationContext
  -> 刷新 ApplicationContext
  -> ServletWebServerFactoryAutoConfiguration 生效
  -> 创建 TomcatServletWebServerFactory
  -> ApplicationContext 请求工厂创建 WebServer
  -> Tomcat 启动并监听端口
```

默认端口是 `8080`，可通过 `server.port` 修改。默认监听地址不能简单描述为固定的 `localhost`；未配置 `server.address` 时，实际绑定行为由服务器和操作系统网络配置决定。

如果排除 Tomcat 并引入 Jetty 或 Undertow，对应的服务器工厂会根据类路径条件生效。

## 8. 如何查看哪些自动配置生效

启动应用时增加 `--debug`：

```bash
java -jar pinova-api.jar --debug
```

日志会输出 Condition Evaluation Report，其中包括：

- 已匹配的自动配置；
- 未匹配的自动配置；
- 每个条件成功或失败的原因；
- 被显式排除的自动配置。

开发环境也可以在配置中开启：

```yaml
debug: true
```

如果项目引入 Spring Boot Actuator，还可以通过 `conditions` 端点查看条件评估结果。该端点不应在生产环境直接公开。

查看依赖关系时可以使用：

```bash
mvn dependency:tree
```

这个命令可以确认 `spring-boot-starter-web` 最终引入了哪一种 Web 服务器和哪些 Spring MVC 组件。

## 9. 常见误区

### 自动配置等于组件扫描

不是。组件扫描负责发现应用自己编写的组件，自动配置负责导入依赖库提供的配置类。两者由 `@SpringBootApplication` 同时开启，但职责不同。

### Starter 就是自动配置

不是。Starter 主要负责组织依赖；自动配置代码通常位于具体库或 `spring-boot-autoconfigure` 中。Starter 让触发自动配置所需的类进入类路径。

### 自动配置会覆盖用户配置

大部分自动配置通过 `@ConditionalOnMissingBean` 等条件主动退让。少数同名 Bean 或特定配置仍可能冲突，需要结合条件评估报告定位。

### 所有自动配置都在 `spring.factories`

这是旧版结论。Spring Boot 3 的自动配置类清单主要使用 `AutoConfiguration.imports`。

### `@SpringBootConfiguration` 就是 IoC 容器

不是。它标记一个 Spring Boot 配置类，真正的容器是 `ApplicationContext`。

### 默认主机名是 `localhost`

默认端口是 `8080`，但不能把监听地址直接等同于 `localhost`。需要限制监听地址时应显式配置 `server.address`。

## 10. 面试中的简洁回答

Spring Boot 的自动配置由 `@EnableAutoConfiguration` 开启。它通过 `AutoConfigurationImportSelector` 读取 `AutoConfiguration.imports` 中声明的候选配置类，再结合类路径、Bean、配置项和应用类型等条件进行过滤。符合条件的配置类会向容器提供默认 Bean；用户声明自己的 Bean 后，默认配置通常会退让。

`spring-boot-starter-web` 把 Spring MVC 和内嵌 Tomcat 放到类路径中，`WebMvcAutoConfiguration` 和 `ServletWebServerFactoryAutoConfiguration` 因条件满足而生效。`SpringApplication` 创建并刷新 Servlet Web 类型的 `ApplicationContext` 时，容器通过 `TomcatServletWebServerFactory` 创建并启动 Tomcat。

这就是 Spring Boot 能减少显式配置的原因：依赖由 Starter 组织，默认 Bean 由自动配置提供，是否生效由条件注解决定，差异通过外部配置和用户 Bean 覆盖。
