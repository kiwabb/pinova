package com.pinova.service.model;

public record SubmittedOrderResult(
        Long id,
        String orderNo,
        String status) {
}
