package com.pinova.service.model;

import java.util.List;

public record SubmittedCheckoutResult(
        String checkoutNo,
        List<SubmittedOrderResult> orders) {

    public SubmittedCheckoutResult {
        orders = List.copyOf(orders);
    }
}
