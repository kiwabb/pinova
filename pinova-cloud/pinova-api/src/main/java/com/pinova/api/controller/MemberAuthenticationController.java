package com.pinova.api.controller;

import com.pinova.api.assembler.MemberAuthenticationResponseAssembler;
import com.pinova.api.request.LoginMemberRequest;
import com.pinova.api.request.RegisterMemberRequest;
import com.pinova.api.response.AuthenticatedMemberResponse;
import com.pinova.api.web.CurrentMemberResolver;
import com.pinova.common.api.ApiResponse;
import com.pinova.service.MemberLoginSessionService;
import com.pinova.service.command.LoginMemberCommand;
import com.pinova.service.command.RegisterMemberCommand;
import com.pinova.service.model.MemberLoginResult;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.time.Duration;
import java.time.Instant;

@Tag(name = "会员认证", description = "会员注册、密码登录、退出和当前登录会员接口")
@RestController
@RequestMapping("/auth")
public class MemberAuthenticationController {

    private final MemberLoginSessionService memberLoginSessionService;
    private final MemberAuthenticationResponseAssembler responseAssembler;
    private final CurrentMemberResolver currentMemberResolver;

    public MemberAuthenticationController(
            MemberLoginSessionService memberLoginSessionService,
            MemberAuthenticationResponseAssembler responseAssembler,
            CurrentMemberResolver currentMemberResolver) {
        this.memberLoginSessionService = memberLoginSessionService;
        this.responseAssembler = responseAssembler;
        this.currentMemberResolver = currentMemberResolver;
    }

    @Operation(summary = "注册会员并自动登录")
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AuthenticatedMemberResponse> register(
            @Valid @RequestBody RegisterMemberRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        MemberLoginResult result = memberLoginSessionService.register(new RegisterMemberCommand(
                request.username(),
                request.nickname(),
                request.password(),
                request.confirmPassword(),
                resolveRemoteAddress(servletRequest),
                servletRequest.getHeader(HttpHeaders.USER_AGENT)));
        writeSessionCookie(result, servletRequest, servletResponse);
        return ApiResponse.success(responseAssembler.toAuthenticatedMemberResponse(result.member()));
    }

    @Operation(summary = "会员密码登录")
    @PostMapping("/login")
    public ApiResponse<AuthenticatedMemberResponse> login(
            @Valid @RequestBody LoginMemberRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        MemberLoginResult result = memberLoginSessionService.login(new LoginMemberCommand(
                request.identifier(),
                request.password(),
                resolveRemoteAddress(servletRequest),
                servletRequest.getHeader(HttpHeaders.USER_AGENT)));
        writeSessionCookie(result, servletRequest, servletResponse);
        return ApiResponse.success(responseAssembler.toAuthenticatedMemberResponse(result.member()));
    }

    @Operation(summary = "退出当前会员会话")
    @PostMapping("/logout")
    public ApiResponse<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response) {
        memberLoginSessionService.logout(currentMemberResolver.resolveSessionToken(request));
        response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie("", Duration.ZERO, request.isSecure()).toString());
        return ApiResponse.success();
    }

    @Operation(summary = "获取当前登录会员")
    @GetMapping("/me")
    public ApiResponse<AuthenticatedMemberResponse> currentMember(HttpServletRequest request) {
        return ApiResponse.success(responseAssembler.toAuthenticatedMemberResponse(
                currentMemberResolver.requireCurrentMember(request)));
    }

    private static ResponseCookie sessionCookie(String value, Duration maxAge, boolean secure) {
        return ResponseCookie.from(CurrentMemberResolver.SESSION_COOKIE_NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Lax")
                .path("/")
                .maxAge(maxAge)
                .build();
    }

    private static void writeSessionCookie(
            MemberLoginResult result,
            HttpServletRequest request,
            HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, sessionCookie(
                result.sessionToken(),
                Duration.between(Instant.now(), result.expiresAt()),
                request.isSecure()).toString());
    }

    private static InetAddress resolveRemoteAddress(HttpServletRequest request) {
        try {
            return InetAddress.getByName(request.getRemoteAddr());
        } catch (UnknownHostException exception) {
            return null;
        }
    }
}
