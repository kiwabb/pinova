package com.pinova.api.controller;

import com.pinova.api.assembler.AdminAuthenticationResponseAssembler;
import com.pinova.api.request.ChangeAdminPasswordRequest;
import com.pinova.api.request.LoginAdminRequest;
import com.pinova.api.response.AdminCsrfTokenResponse;
import com.pinova.api.response.AuthenticatedAdminResponse;
import com.pinova.api.web.CurrentAdminResolver;
import com.pinova.common.api.ApiResponse;
import com.pinova.service.AdminAuthenticationService;
import com.pinova.service.command.ChangeAdminPasswordCommand;
import com.pinova.service.command.LoginAdminCommand;
import com.pinova.service.model.AdminLoginResult;
import com.pinova.service.model.AuthenticatedAdminResult;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.time.Duration;
import java.time.Instant;

@RestController
@RequestMapping("/admin/auth")
public class AdminAuthenticationController {
    private final AdminAuthenticationService authenticationService;
    private final AdminAuthenticationResponseAssembler responseAssembler;
    private final CurrentAdminResolver currentAdminResolver;

    public AdminAuthenticationController(
            AdminAuthenticationService authenticationService,
            AdminAuthenticationResponseAssembler responseAssembler,
            CurrentAdminResolver currentAdminResolver) {
        this.authenticationService = authenticationService;
        this.responseAssembler = responseAssembler;
        this.currentAdminResolver = currentAdminResolver;
    }

    @GetMapping("/csrf")
    public ApiResponse<AdminCsrfTokenResponse> csrf(CsrfToken token) {
        return ApiResponse.success(new AdminCsrfTokenResponse(token.getToken(), token.getHeaderName()));
    }

    @PostMapping("/login")
    public ApiResponse<AuthenticatedAdminResponse> login(
            @Valid @RequestBody LoginAdminRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        AdminLoginResult result = authenticationService.login(new LoginAdminCommand(
                request.username(), request.password(), resolveRemoteAddress(servletRequest),
                servletRequest.getHeader(HttpHeaders.USER_AGENT)));
        servletResponse.addHeader(HttpHeaders.SET_COOKIE, sessionCookie(
                result.sessionToken(), Duration.between(Instant.now(), result.expiresAt()), servletRequest.isSecure()).toString());
        return ApiResponse.success(responseAssembler.toAuthenticatedAdminResponse(result.admin()));
    }

    @GetMapping("/me")
    public ApiResponse<AuthenticatedAdminResponse> currentAdmin(HttpServletRequest request) {
        return ApiResponse.success(responseAssembler.toAuthenticatedAdminResponse(
                currentAdminResolver.requireCurrentAdmin(request)));
    }

    @PutMapping("/password")
    public ApiResponse<Void> changePassword(
            @Valid @RequestBody ChangeAdminPasswordRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        AuthenticatedAdminResult admin = currentAdminResolver.requireCurrentAdmin(servletRequest);
        authenticationService.changePassword(new ChangeAdminPasswordCommand(
                admin.id(), request.currentPassword(), request.newPassword(), request.confirmPassword()));
        servletResponse.addHeader(HttpHeaders.SET_COOKIE, sessionCookie("", Duration.ZERO, servletRequest.isSecure()).toString());
        return ApiResponse.success();
    }

    @PostMapping("/logout")
    public ApiResponse<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        authenticationService.logout(currentAdminResolver.resolveSessionToken(request));
        response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie("", Duration.ZERO, request.isSecure()).toString());
        return ApiResponse.success();
    }

    private static ResponseCookie sessionCookie(String value, Duration maxAge, boolean secure) {
        return ResponseCookie.from(CurrentAdminResolver.SESSION_COOKIE_NAME, value)
                .httpOnly(true).secure(secure).sameSite("Strict").path("/").maxAge(maxAge).build();
    }

    private static InetAddress resolveRemoteAddress(HttpServletRequest request) {
        try {
            return InetAddress.getByName(request.getRemoteAddr());
        } catch (UnknownHostException exception) {
            return null;
        }
    }
}
