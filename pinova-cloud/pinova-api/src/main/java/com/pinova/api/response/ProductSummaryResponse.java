package com.pinova.api.response;

import java.util.List;

public record ProductSummaryResponse(
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

    public ProductSummaryResponse {
        categoryPathCodes = List.copyOf(categoryPathCodes);
    }
}
