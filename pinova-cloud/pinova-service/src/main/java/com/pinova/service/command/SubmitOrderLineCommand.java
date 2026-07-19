package com.pinova.service.command;

public record SubmitOrderLineCommand(
        Long cartItemId,
        Integer cartItemVersion,
        Long skuId,
        Long quantity) {
}
