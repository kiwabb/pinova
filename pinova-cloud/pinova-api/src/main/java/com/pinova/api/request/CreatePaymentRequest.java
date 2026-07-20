package com.pinova.api.request;

import jakarta.validation.constraints.NotBlank;

public record CreatePaymentRequest(@NotBlank String checkoutNo) {
}
