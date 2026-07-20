package com.pinova.api.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record UpdateShoppingCartItemRequest(
        @Min(1) @Max(999) Long quantity,
        Boolean selected,
        @NotNull @PositiveOrZero Integer version) {
}
