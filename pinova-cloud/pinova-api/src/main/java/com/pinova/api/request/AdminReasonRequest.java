package com.pinova.api.request;import jakarta.validation.constraints.*;public record AdminReasonRequest(@NotBlank @Size(max=500) String reason){}
