package com.pinova.api.request;

public record UpdateShoppingCartItemRequest(Long quantity, Boolean selected, Integer version) {
}
