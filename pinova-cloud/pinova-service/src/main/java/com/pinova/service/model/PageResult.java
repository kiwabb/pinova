package com.pinova.service.model;

import java.util.List;

public record PageResult<T>(
        List<T> items,
        int page,
        int pageSize,
        long total) {

    public PageResult {
        items = List.copyOf(items);
    }
}
