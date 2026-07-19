package com.pinova.service.error;

import com.pinova.common.error.ErrorCode;

public enum MemberAuthenticationErrorCode implements ErrorCode {

    USERNAME_UNAVAILABLE("MEMBER_AUTH.USERNAME_UNAVAILABLE", "用户名已被使用", 409),
    INVALID_CREDENTIALS("MEMBER_AUTH.INVALID_CREDENTIALS", "账号或密码错误", 401),
    AUTHENTICATION_REQUIRED("MEMBER_AUTH.AUTHENTICATION_REQUIRED", "请先登录", 401);

    private final String code;
    private final String message;
    private final int httpStatus;

    MemberAuthenticationErrorCode(String code, String message, int httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }

    @Override
    public String code() {
        return code;
    }

    @Override
    public String message() {
        return message;
    }

    @Override
    public int httpStatus() {
        return httpStatus;
    }
}
