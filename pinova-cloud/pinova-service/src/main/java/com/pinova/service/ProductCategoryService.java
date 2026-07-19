package com.pinova.service;

import com.baomidou.mybatisplus.spring.service.IService;
import com.pinova.pojo.entity.ProductCategory;
import com.pinova.service.model.ProductCategorySummaryResult;

import java.util.List;

/**
 * <p>
 * 平台商品类目 服务类
 * </p>
 *
 * @author Pinova
 * @since 2026-07-14
 */
public interface ProductCategoryService extends IService<ProductCategory> {

    List<ProductCategorySummaryResult> listMainCategories();

    List<ProductCategorySummaryResult> listChildren(long parentCategoryId);
}
