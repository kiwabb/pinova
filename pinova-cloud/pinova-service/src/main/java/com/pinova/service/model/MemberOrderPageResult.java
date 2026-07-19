package com.pinova.service.model;

import java.util.List;

public record MemberOrderPageResult(
        List<MemberOrderSummaryResult> items,
        int page,
        int pageSize,
        long total) {
    public MemberOrderPageResult {
        items = List.copyOf(items);
    }
}
