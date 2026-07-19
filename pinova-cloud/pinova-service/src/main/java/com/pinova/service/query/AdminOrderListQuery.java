package com.pinova.service.query;

import java.time.Instant;

public record AdminOrderListQuery(
        String orderNo,
        Short status,
        Instant submittedFrom,
        Instant submittedTo,
        int page,
        int pageSize) {
}

