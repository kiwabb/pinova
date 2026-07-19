package com.pinova.service.model;

public record ProductCategorySummaryResult(
        Long id,
        String categoryCode,
        String name,
        Short level,
        String iconUrl,
        boolean hasChildren) {
}
