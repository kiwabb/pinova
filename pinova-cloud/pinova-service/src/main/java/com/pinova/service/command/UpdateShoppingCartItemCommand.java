package com.pinova.service.command;

public record UpdateShoppingCartItemCommand(
        String guestToken,
        Long itemId,
        Long quantity,
        Boolean selected,
        Integer version) {
}
