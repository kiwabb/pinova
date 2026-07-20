package com.pinova.api.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SubmitOrderRequest(
        @NotNull @Positive Long cartId,
        @NotNull @Positive Long shippingAddressId,
        @NotNull @PositiveOrZero Integer shippingAddressVersion,
        @NotNull @Size(min = 1, max = 100) List<@NotNull @Valid SubmitOrderLineRequest> items,
        @Size(max = 500) String buyerRemark) {
}
