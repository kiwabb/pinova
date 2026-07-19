package com.pinova.api.request;

public record LoginMemberRequest(
        String identifier,
        String password) {
}
