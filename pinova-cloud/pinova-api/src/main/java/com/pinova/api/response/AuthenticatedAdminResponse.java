package com.pinova.api.response;

import java.util.Set;

public record AuthenticatedAdminResponse(
        String id,
        String username,
        String displayName,
        boolean mustChangePassword,
        Set<String> permissions) {
    public AuthenticatedAdminResponse {
        permissions = Set.copyOf(permissions);
    }
}

