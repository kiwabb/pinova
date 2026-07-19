package com.pinova.service.command;

public record AddShoppingCartItemCommand(
        String guestToken,
        Long skuId,
        Long quantity) {
}
