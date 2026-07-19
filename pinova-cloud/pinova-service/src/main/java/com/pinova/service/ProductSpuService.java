package com.pinova.service;

import com.baomidou.mybatisplus.spring.service.IService;
import com.pinova.pojo.entity.ProductSpu;
import com.pinova.service.model.PageResult;
import com.pinova.service.model.ProductDetailResult;
import com.pinova.service.model.ProductSummaryResult;
import com.pinova.service.query.ProductListQuery;

/**
 * <p>
 * 商品 SPU 服务类
 * </p>
 *
 * @author Pinova
 * @since 2026-07-15
 */
public interface ProductSpuService extends IService<ProductSpu> {

    PageResult<ProductSummaryResult> listPublishedProducts(ProductListQuery query);

    ProductDetailResult getPublishedProductDetail(Long productId);
}
