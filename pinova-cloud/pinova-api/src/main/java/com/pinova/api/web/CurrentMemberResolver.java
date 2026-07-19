package com.pinova.api.web;

import com.pinova.service.MemberLoginSessionService;
import com.pinova.service.model.AuthenticatedMemberResult;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

@Component
public class CurrentMemberResolver {

    public static final String SESSION_COOKIE_NAME = "PINOVA_MEMBER_SESSION";

    private final MemberLoginSessionService memberLoginSessionService;

    public CurrentMemberResolver(MemberLoginSessionService memberLoginSessionService) {
        this.memberLoginSessionService = memberLoginSessionService;
    }

    public AuthenticatedMemberResult requireCurrentMember(HttpServletRequest request) {
        return memberLoginSessionService.authenticate(resolveSessionToken(request));
    }

    public Long requireCurrentMemberId(HttpServletRequest request) {
        return requireCurrentMember(request).id();
    }

    public String resolveSessionToken(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (SESSION_COOKIE_NAME.equals(cookie.getName()) && !cookie.getValue().isBlank()) {
                return cookie.getValue();
            }
        }
        return null;
    }
}
