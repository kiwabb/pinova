package com.pinova.api.response;

public record AuthenticatedMemberResponse(
        Long id,
        String memberNo,
        String nickname,
        String avatarUrl) {
}
