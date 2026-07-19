package com.pinova.api.web;

import com.pinova.service.AdminAuthenticationService;
import com.pinova.service.model.AuthenticatedAdminResult;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

@Component
public class CurrentAdminResolver {
    public static final String SESSION_COOKIE_NAME = "PINOVA_ADMIN_SESSION";
    private final AdminAuthenticationService authenticationService;

    public CurrentAdminResolver(AdminAuthenticationService authenticationService) {
        this.authenticationService = authenticationService;
    }

    public AuthenticatedAdminResult requireCurrentAdmin(HttpServletRequest request) {
        return authenticationService.authenticate(resolveSessionToken(request));
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

