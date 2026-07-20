package com.pinova.api.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public record RegisterMemberRequest(
        @NotBlank @Size(max = 32) String username,
        @Size(max = 64) String nickname,
        @NotEmpty @Size(max = 72) String password,
        @NotEmpty @Size(max = 72) String confirmPassword) {
}
