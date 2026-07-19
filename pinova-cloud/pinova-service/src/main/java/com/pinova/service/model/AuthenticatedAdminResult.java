package com.pinova.service.model;

import java.util.Set;

public record AuthenticatedAdminResult(
        Long id,
        String username,
        String displayName,
        boolean mustChangePassword,
        Set<String> permissions) {

    public AuthenticatedAdminResult {
        permissions = Set.copyOf(permissions);
    }
}

