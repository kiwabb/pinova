package com.pinova.service.model;

import java.util.List;

public record ShoppingCartResult(Long id, List<ShoppingCartItemResult> items) {
    public ShoppingCartResult {
        items = List.copyOf(items);
    }
}
