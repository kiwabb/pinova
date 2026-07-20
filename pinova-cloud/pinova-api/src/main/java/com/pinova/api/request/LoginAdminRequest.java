package com.pinova.api.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public record LoginAdminRequest(
        @NotBlank @Size(max = 32) String username,
        @NotEmpty @Size(max = 72) String password) {
}
