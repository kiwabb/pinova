package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.ProductSpu;
import org.apache.ibatis.annotations.Param;

import java.util.Collection;
import java.util.List;

/**
 * <p>
 * 商品 SPU Mapper 接口
 * </p>
 *
 * @author Pinova
 * @since 2026-07-15
 */
public interface ProductSpuMapper extends BaseMapper<ProductSpu> {

    List<ProductSpu> selectPublishedProducts(
            @Param("categoryIds") Collection<Long> categoryIds,
            @Param("offset") long offset,
            @Param("limit") int limit);

    long countPublishedProducts(@Param("categoryIds") Collection<Long> categoryIds);
}
