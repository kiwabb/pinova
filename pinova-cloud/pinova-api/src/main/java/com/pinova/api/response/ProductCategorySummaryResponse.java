package com.pinova.api.response;

public record ProductCategorySummaryResponse(
        Long id,
        String categoryCode,
        String name,
        Short level,
        String iconUrl,
        boolean hasChildren) {
}
