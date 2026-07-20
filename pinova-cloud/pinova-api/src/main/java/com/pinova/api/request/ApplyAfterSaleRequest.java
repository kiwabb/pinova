package com.pinova.api.request;
import jakarta.validation.constraints.*;
public record ApplyAfterSaleRequest(@NotNull @Min(1) @Max(5) Short reasonCode,@Size(max=500) String reason) {}
