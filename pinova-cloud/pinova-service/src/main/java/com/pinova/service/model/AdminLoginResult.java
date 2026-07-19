package com.pinova.service.model;

import java.time.Instant;

public record AdminLoginResult(String sessionToken, Instant expiresAt, AuthenticatedAdminResult admin) {
}

