package com.pinova.service.assembler;

import com.pinova.pojo.entity.ProductCategory;
import com.pinova.service.model.ProductCategorySummaryResult;

import java.util.List;
import java.util.Set;

public final class ProductCategoryResultAssembler {

    private ProductCategoryResultAssembler() {
    }

    public static List<ProductCategorySummaryResult> toSummaryResults(
            List<ProductCategory> categories,
            Set<Long> parentIdsWithChildren) {
        return categories.stream()
                .map(category -> toSummaryResult(
                        category,
                        parentIdsWithChildren.contains(category.getId())))
                .toList();
    }

    public static ProductCategorySummaryResult toSummaryResult(
            ProductCategory category,
            boolean hasChildren) {
        return new ProductCategorySummaryResult(
                category.getId(),
                category.getCategoryCode(),
                category.getName(),
                category.getLevel(),
                category.getIconUrl(),
                hasChildren);
    }
}
