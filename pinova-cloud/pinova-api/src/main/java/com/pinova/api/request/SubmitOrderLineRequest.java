package com.pinova.api.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

public record SubmitOrderLineRequest(
        @NotNull @Positive Long cartItemId,
        @NotNull @PositiveOrZero Integer cartItemVersion,
        @NotNull @Positive Long skuId,
        @NotNull @Min(1) @Max(999) Long quantity) {
}
