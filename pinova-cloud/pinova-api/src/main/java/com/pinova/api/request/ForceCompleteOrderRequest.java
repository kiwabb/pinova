package com.pinova.api.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record ForceCompleteOrderRequest(@NotBlank @Size(max=500) String reason) {}
