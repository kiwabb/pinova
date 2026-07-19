package com.pinova.api.config;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;

class MybatisPlusConfigurationTest {
    @Test
    void configuresPostgreSqlPagination() {
        MybatisPlusInterceptor interceptor = new MybatisPlusConfiguration().mybatisPlusInterceptor();

        PaginationInnerInterceptor pagination = assertInstanceOf(
                PaginationInnerInterceptor.class,
                interceptor.getInterceptors().getFirst());
        assertEquals(DbType.POSTGRE_SQL, pagination.getDbType());
    }
}
