package com.pinova.api.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record MemberShippingAddressVersionRequest(@NotNull @PositiveOrZero Integer version) {
}
