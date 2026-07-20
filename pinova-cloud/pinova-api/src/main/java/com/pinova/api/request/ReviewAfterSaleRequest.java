package com.pinova.api.request;
import jakarta.validation.constraints.*;
public record ReviewAfterSaleRequest(@NotNull @PositiveOrZero Integer version,@NotNull Boolean approved,
                                     @NotBlank @Size(max=500) String reason) {}
