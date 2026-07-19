package com.pinova.api.response;

import java.util.List;

public record PageResponse<T>(
        List<T> items,
        int page,
        int pageSize,
        long total) {

    public PageResponse {
        items = List.copyOf(items);
    }
}
