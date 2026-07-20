package com.pinova.api.request;

import jakarta.validation.constraints.NotBlank;

public record SimulatePaymentResultRequest(@NotBlank String outcome) {
}
