package com.pinova.service.query;

public record MemberOrderListQuery(
        Short status,
        int page,
        int pageSize) {
}
