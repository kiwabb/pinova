package com.pinova.api.response;

public record SubmittedOrderResponse(
        Long id,
        String orderNo,
        String status) {
}
