package com.pinova.api.request;

import java.util.List;

public record SubmitOrderRequest(
        Long cartId,
        Long shippingAddressId,
        Integer shippingAddressVersion,
        List<SubmitOrderLineRequest> items,
        String buyerRemark) {
}
