package com.pinova.service.error;

import com.pinova.common.error.ErrorCode;

public enum AdminAuthenticationErrorCode implements ErrorCode {
    INVALID_CREDENTIALS("ADMIN_AUTH.INVALID_CREDENTIALS", "账号或密码错误", 401),
    AUTHENTICATION_REQUIRED("ADMIN_AUTH.AUTHENTICATION_REQUIRED", "请先登录后台", 401),
    PASSWORD_CHANGE_REQUIRED("ADMIN_AUTH.PASSWORD_CHANGE_REQUIRED", "请先修改临时密码", 403),
    PERMISSION_DENIED("ADMIN_AUTH.PERMISSION_DENIED", "没有执行此操作的权限", 403),
    ADMIN_ALREADY_EXISTS("ADMIN_AUTH.ADMIN_ALREADY_EXISTS", "后台管理员已经存在", 409),
    PASSWORD_UPDATE_CONFLICT("ADMIN_AUTH.PASSWORD_UPDATE_CONFLICT", "账号已发生变化，请重新登录", 409);

    private final String code;
    private final String message;
    private final int httpStatus;

    AdminAuthenticationErrorCode(String code, String message, int httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
    public String code() { return code; }
    public String message() { return message; }
    public int httpStatus() { return httpStatus; }
}

