package com.pinova.api.response;

import java.util.List;

public record ShoppingCartResponse(Long id, List<ShoppingCartItemResponse> items) {
    public ShoppingCartResponse {
        items = List.copyOf(items);
    }
}
