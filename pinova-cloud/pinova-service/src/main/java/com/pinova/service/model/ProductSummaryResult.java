package com.pinova.service.model;

import java.util.List;

public record ProductSummaryResult(
        Long id,
        String name,
        String summary,
        Short productType,
        String mainImageKey,
        String categoryCode,
        String categoryName,
        List<String> categoryPathCodes,
        Long priceFen,
        String stock) {

    public ProductSummaryResult {
        categoryPathCodes = List.copyOf(categoryPathCodes);
    }
}
