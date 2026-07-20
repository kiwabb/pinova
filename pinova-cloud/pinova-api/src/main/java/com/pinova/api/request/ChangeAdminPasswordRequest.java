package com.pinova.api.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public record ChangeAdminPasswordRequest(
        @NotEmpty @Size(max = 72) String currentPassword,
        @NotEmpty @Size(max = 72) String newPassword,
        @NotEmpty @Size(max = 72) String confirmPassword) {
}
