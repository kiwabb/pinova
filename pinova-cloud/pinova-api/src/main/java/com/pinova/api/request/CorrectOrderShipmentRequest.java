package com.pinova.api.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record CorrectOrderShipmentRequest(
        @NotBlank @Size(max=32) String carrierCode,
        @NotBlank @Size(max=64) String carrierName,
        @NotBlank @Size(max=128) String trackingNo,
        @NotBlank @Size(max=500) String reason) {}
