package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.ProductCategory;
import org.apache.ibatis.annotations.Param;

import java.util.Collection;
import java.util.List;

/**
 * <p>
 * 平台商品类目 Mapper 接口
 * </p>
 *
 * @author Pinova
 * @since 2026-07-14
 */
public interface ProductCategoryMapper extends BaseMapper<ProductCategory> {

    List<Long> selectParentIdsWithChildren(
            @Param("parentIds") Collection<Long> parentIds,
            @Param("status") short status);
}
