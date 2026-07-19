package com.pinova.api.assembler;

import com.pinova.api.response.ProductCategorySummaryResponse;
import com.pinova.service.model.ProductCategorySummaryResult;

import java.util.List;

public final class ProductCategoryResponseAssembler {

    private ProductCategoryResponseAssembler() {
    }

    public static List<ProductCategorySummaryResponse> toSummaryResponses(
            List<ProductCategorySummaryResult> results) {
        return results.stream()
                .map(ProductCategoryResponseAssembler::toSummaryResponse)
                .toList();
    }

    public static ProductCategorySummaryResponse toSummaryResponse(ProductCategorySummaryResult result) {
        return new ProductCategorySummaryResponse(
                result.id(),
                result.categoryCode(),
                result.name(),
                result.level(),
                result.iconUrl(),
                result.hasChildren());
    }
}
