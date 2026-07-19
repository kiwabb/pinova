package com.pinova.service.model;

import java.time.Instant;

public record MemberLoginResult(
        String sessionToken,
        Instant expiresAt,
        AuthenticatedMemberResult member) {
}
