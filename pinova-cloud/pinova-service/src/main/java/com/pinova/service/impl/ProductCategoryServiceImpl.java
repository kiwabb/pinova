package com.pinova.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import com.pinova.common.error.BusinessException;
import com.pinova.common.error.CommonErrorCode;
import com.pinova.mapper.ProductCategoryMapper;
import com.pinova.pojo.entity.ProductCategory;
import com.pinova.service.ProductCategoryService;
import com.pinova.service.assembler.ProductCategoryResultAssembler;
import com.pinova.service.error.ProductErrorCode;
import com.pinova.service.model.ProductCategorySummaryResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * <p>
 * 平台商品类目 服务实现类
 * </p>
 *
 * @author Pinova
 * @since 2026-07-14
 */
@Service
public class ProductCategoryServiceImpl extends ServiceImpl<ProductCategoryMapper, ProductCategory> implements ProductCategoryService {

    private static final short ENABLED = 1;
    private static final short ROOT_LEVEL = 1;

    @Override
    @Transactional(readOnly = true)
    public List<ProductCategorySummaryResult> listMainCategories() {
        List<ProductCategory> categories = baseMapper.selectList(Wrappers.lambdaQuery(ProductCategory.class)
                        .isNull(ProductCategory::getParentId)
                        .eq(ProductCategory::getLevel, ROOT_LEVEL)
                        .eq(ProductCategory::getStatus, ENABLED)
                        .orderByAsc(ProductCategory::getSortOrder)
                        .orderByAsc(ProductCategory::getId));
        return ProductCategoryResultAssembler.toSummaryResults(
                categories,
                findParentIdsWithChildren(categories));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductCategorySummaryResult> listChildren(long parentCategoryId) {
        if (parentCategoryId <= 0) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "父分类 ID 必须大于 0");
        }

        boolean parentExists = baseMapper.exists(Wrappers.lambdaQuery(ProductCategory.class)
                .eq(ProductCategory::getId, parentCategoryId)
                .eq(ProductCategory::getStatus, ENABLED));
        if (!parentExists) {
            throw new BusinessException(ProductErrorCode.CATEGORY_NOT_FOUND);
        }

        List<ProductCategory> children = baseMapper.selectList(Wrappers.lambdaQuery(ProductCategory.class)
                .eq(ProductCategory::getParentId, parentCategoryId)
                .eq(ProductCategory::getStatus, ENABLED)
                .orderByAsc(ProductCategory::getSortOrder)
                .orderByAsc(ProductCategory::getId));
        return ProductCategoryResultAssembler.toSummaryResults(
                children,
                findParentIdsWithChildren(children));
    }

    private Set<Long> findParentIdsWithChildren(List<ProductCategory> categories) {
        if (categories.isEmpty()) {
            return Set.of();
        }

        List<Long> categoryIds = categories.stream()
                .map(ProductCategory::getId)
                .toList();
        return Set.copyOf(baseMapper.selectParentIdsWithChildren(categoryIds, ENABLED));
    }
}
