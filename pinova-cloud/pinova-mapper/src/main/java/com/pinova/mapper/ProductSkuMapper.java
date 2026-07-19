package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.mapper.model.ProductSaleSnapshot;
import com.pinova.mapper.model.ProductSkuSaleSnapshot;
import com.pinova.pojo.entity.ProductSku;
import org.apache.ibatis.annotations.Param;

import java.util.Collection;
import java.util.List;

/**
 * <p>
 * 商品销售单元 SKU Mapper 接口
 * </p>
 *
 * @author Pinova
 * @since 2026-07-15
 */
public interface ProductSkuMapper extends BaseMapper<ProductSku> {

    List<ProductSaleSnapshot> selectSaleSnapshots(
            @Param("spuIds") Collection<Long> spuIds,
            @Param("lowStockThreshold") long lowStockThreshold);

    List<ProductSkuSaleSnapshot> selectSkuSaleSnapshots(
            @Param("spuId") long spuId,
            @Param("lowStockThreshold") long lowStockThreshold);
}
