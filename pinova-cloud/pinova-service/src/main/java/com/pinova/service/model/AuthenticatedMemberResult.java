package com.pinova.service.model;

public record AuthenticatedMemberResult(
        Long id,
        String memberNo,
        String nickname,
        String avatarUrl) {
}
