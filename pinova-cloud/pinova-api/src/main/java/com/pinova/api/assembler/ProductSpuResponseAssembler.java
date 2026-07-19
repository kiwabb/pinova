package com.pinova.api.assembler;

import com.pinova.api.response.PageResponse;
import com.pinova.api.response.ProductSummaryResponse;
import com.pinova.service.model.PageResult;
import com.pinova.service.model.ProductSummaryResult;

public final class ProductSpuResponseAssembler {

    private ProductSpuResponseAssembler() {
    }

    public static PageResponse<ProductSummaryResponse> toPageResponse(
            PageResult<ProductSummaryResult> result) {
        return new PageResponse<>(
                result.items().stream()
                        .map(ProductSpuResponseAssembler::toSummaryResponse)
                        .toList(),
                result.page(),
                result.pageSize(),
                result.total());
    }

    public static ProductSummaryResponse toSummaryResponse(ProductSummaryResult result) {
        return new ProductSummaryResponse(
                result.id(),
                result.name(),
                result.summary(),
                result.productType(),
                result.mainImageKey(),
                result.categoryCode(),
                result.categoryName(),
                result.categoryPathCodes(),
                result.priceFen(),
                result.stock());
    }
}
