package com.pinova.api.request;

public record SubmitOrderLineRequest(
        Long cartItemId,
        Integer cartItemVersion,
        Long skuId,
        Long quantity) {
}
