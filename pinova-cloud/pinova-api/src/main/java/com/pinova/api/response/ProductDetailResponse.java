package com.pinova.api.response;

import java.util.List;

public record ProductDetailResponse(
        Long id,
        String name,
        String summary,
        Short productType,
        String mainImageUrl,
        String categoryCode,
        String categoryName,
        List<String> categoryPathCodes,
        ProductDetailContentResponse detail,
        List<ProductMediaResponse> commonMedia,
        List<ProductSkuDetailResponse> skus) {

    public ProductDetailResponse {
        categoryPathCodes = List.copyOf(categoryPathCodes);
        commonMedia = List.copyOf(commonMedia);
        skus = List.copyOf(skus);
    }
}
