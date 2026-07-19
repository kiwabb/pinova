package com.pinova.api.request;

public record RegisterMemberRequest(
        String username,
        String nickname,
        String password,
        String confirmPassword) {
}
