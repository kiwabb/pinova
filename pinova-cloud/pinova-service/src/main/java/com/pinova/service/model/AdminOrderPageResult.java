package com.pinova.service.model;

import java.util.List;

public record AdminOrderPageResult(List<AdminOrderSummaryResult> items, int page, int pageSize, long total) {
    public AdminOrderPageResult {
        items = List.copyOf(items);
    }
}

