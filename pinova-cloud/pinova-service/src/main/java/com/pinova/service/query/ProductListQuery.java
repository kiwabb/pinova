package com.pinova.service.query;

public record ProductListQuery(
        String categoryCode,
        int page,
        int pageSize) {
}
