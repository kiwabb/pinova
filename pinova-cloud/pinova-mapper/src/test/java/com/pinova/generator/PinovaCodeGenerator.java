package com.pinova.generator;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.generator.FastAutoGenerator;
import com.baomidou.mybatisplus.generator.config.DataSourceConfig;
import com.baomidou.mybatisplus.generator.config.OutputFile;
import com.baomidou.mybatisplus.generator.config.rules.DbColumnType;
import com.baomidou.mybatisplus.generator.config.rules.IColumnType;
import com.baomidou.mybatisplus.generator.engine.FreemarkerTemplateEngine;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Properties;

public final class PinovaCodeGenerator {

    private static final IColumnType INET_ADDRESS = new IColumnType() {
        @Override
        public String getType() {
            return "InetAddress";
        }

        @Override
        public String getPkg() {
            return "java.net.InetAddress";
        }
    };

    private PinovaCodeGenerator() {
    }

    public static void main(String[] args) {
        Path projectRoot = findProjectRoot();
        Properties localEnvironment = loadLocalEnvironment(projectRoot);
        List<String> tables = parseTables(args);

        String databaseName = setting("PINOVA_DB_NAME", localEnvironment, "pinova");
        String databasePort = setting("PINOVA_DB_PORT", localEnvironment, "15432");
        String username = setting("PINOVA_DB_USERNAME", localEnvironment, "pinova");
        String password = requiredSetting("PINOVA_DB_PASSWORD", localEnvironment);
        String defaultUrl = "jdbc:postgresql://127.0.0.1:" + databasePort + "/"
                + databaseName + "?currentSchema=pinova";
        String url = setting("PINOVA_DB_URL", localEnvironment, defaultUrl);

        Map<OutputFile, String> outputPaths = outputPaths(projectRoot);

        DataSourceConfig.Builder dataSource = new DataSourceConfig.Builder(url, username, password)
                .typeConvertHandler((globalConfig, typeRegistry, metaInfo) -> switch (
                        metaInfo.getTypeName().toLowerCase(Locale.ROOT)) {
                    case "timestamptz" -> DbColumnType.INSTANT;
                    case "inet" -> INET_ADDRESS;
                    case "json", "jsonb" -> DbColumnType.STRING;
                    default -> typeRegistry.getColumnType(metaInfo);
                });

        FastAutoGenerator.create(dataSource)
                .globalConfig(builder -> builder
                        .author("Pinova")
                        .disableOpenDir()
                        .commentDate("yyyy-MM-dd")
                        .outputDir(projectRoot.resolve("generated").toString()))
                .packageConfig(builder -> builder
                        .parent("com.pinova")
                        .entity("pojo.entity")
                        .mapper("mapper")
                        .service("service")
                        .serviceImpl("service.impl")
                        .controller("api.controller")
                        .pathInfo(outputPaths))
                .strategyConfig(builder -> {
                    builder.addInclude(tables);
                    builder.entityBuilder()
                            .idType(IdType.ASSIGN_ID)
                            .versionColumnName("version")
                            .logicDeleteColumnName("deleted")
                            .toString(false)
                            .enableTableFieldAnnotation();
                    builder.mapperBuilder()
                            .enableBaseResultMap()
                            .enableBaseColumnList();
                    builder.serviceBuilder()
                            .formatServiceFileName("%sService")
                            .formatServiceImplFileName("%sServiceImpl");
                    builder.controllerBuilder()
                            .enableRestStyle();
                })
                .templateEngine(new FreemarkerTemplateEngine())
                .execute();
    }

    private static Map<OutputFile, String> outputPaths(Path projectRoot) {
        Map<OutputFile, String> paths = new EnumMap<>(OutputFile.class);
        paths.put(OutputFile.entity, javaPackage(projectRoot, "pinova-pojo", "pojo/entity"));
        paths.put(OutputFile.mapper, javaPackage(projectRoot, "pinova-mapper", "mapper"));
        paths.put(OutputFile.xml, projectRoot.resolve("pinova-mapper/src/main/resources/mapper").toString());
        paths.put(OutputFile.service, javaPackage(projectRoot, "pinova-service", "service"));
        paths.put(OutputFile.serviceImpl, javaPackage(projectRoot, "pinova-service", "service/impl"));
        paths.put(OutputFile.controller, javaPackage(projectRoot, "pinova-api", "api/controller"));
        return paths;
    }

    private static String javaPackage(Path projectRoot, String module, String packagePath) {
        return projectRoot.resolve(module + "/src/main/java/com/pinova/" + packagePath).toString();
    }

    private static List<String> parseTables(String[] args) {
        if (args.length == 0 || args[0].isBlank()) {
            throw new IllegalArgumentException(
                    "必须指定表名，例如：-Dexec.args=member_account,product_spu");
        }
        List<String> tables = Arrays.stream(args[0].split(","))
                .map(String::trim)
                .filter(table -> !table.isEmpty())
                .distinct()
                .toList();
        if (tables.isEmpty()) {
            throw new IllegalArgumentException("没有可生成的表名");
        }
        return tables;
    }

    private static Path findProjectRoot() {
        Path current = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize();
        while (current != null) {
            if (Files.isDirectory(current.resolve("pinova-api"))
                    && Files.isDirectory(current.resolve("pinova-mapper"))) {
                return current;
            }
            current = current.getParent();
        }
        throw new IllegalStateException("无法定位 Pinova 项目根目录");
    }

    private static Properties loadLocalEnvironment(Path projectRoot) {
        Path environmentFile = projectRoot.resolve(".env");
        Properties properties = new Properties();
        if (!Files.exists(environmentFile)) {
            return properties;
        }
        try (InputStream input = Files.newInputStream(environmentFile)) {
            properties.load(input);
            return properties;
        } catch (IOException exception) {
            throw new IllegalStateException("读取本地 .env 失败", exception);
        }
    }

    private static String requiredSetting(String name, Properties localEnvironment) {
        String value = setting(name, localEnvironment, null);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("缺少配置：" + name);
        }
        return value;
    }

    private static String setting(String name, Properties localEnvironment, String defaultValue) {
        String systemProperty = System.getProperty(name);
        if (systemProperty != null && !systemProperty.isBlank()) {
            return systemProperty;
        }
        String environmentVariable = System.getenv(name);
        if (environmentVariable != null && !environmentVariable.isBlank()) {
            return environmentVariable;
        }
        String localValue = localEnvironment.getProperty(name);
        if (localValue != null && !localValue.isBlank()) {
            return localValue;
        }
        return defaultValue;
    }
}
