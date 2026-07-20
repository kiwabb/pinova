package com.pinova.api.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

public record LoginMemberRequest(
        @NotBlank @Size(max = 254) String identifier,
        @NotEmpty @Size(max = 72) String password) {
}
