package com.pinova.api.response;

import java.util.List;

public record SubmittedCheckoutResponse(
        String checkoutNo,
        List<SubmittedOrderResponse> orders) {

    public SubmittedCheckoutResponse {
        orders = List.copyOf(orders);
    }
}
