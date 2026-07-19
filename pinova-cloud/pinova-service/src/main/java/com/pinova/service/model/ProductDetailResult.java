package com.pinova.service.model;

import java.util.List;

public record ProductDetailResult(
        Long id,
        String name,
        String summary,
        Short productType,
        String mainImageKey,
        String categoryCode,
        String categoryName,
        List<String> categoryPathCodes,
        ProductDetailContentResult detail,
        List<ProductMediaResult> commonMedia,
        List<ProductSkuDetailResult> skus) {

    public ProductDetailResult {
        categoryPathCodes = List.copyOf(categoryPathCodes);
        commonMedia = List.copyOf(commonMedia);
        skus = List.copyOf(skus);
    }
}
