package com.pinova.service.command;

import java.util.List;

public record SubmitOrderCommand(
        Long memberId,
        String guestCartToken,
        String idempotencyKey,
        Long cartId,
        Long shippingAddressId,
        Integer shippingAddressVersion,
        List<SubmitOrderLineCommand> items,
        String buyerRemark) {
}
