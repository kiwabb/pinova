package com.pinova.common.error;

public enum CommonErrorCode implements ErrorCode {

    INVALID_REQUEST("COMMON.INVALID_REQUEST", "请求参数无效", 400),
    RESOURCE_NOT_FOUND("COMMON.RESOURCE_NOT_FOUND", "请求资源不存在", 404),
    METHOD_NOT_ALLOWED("COMMON.METHOD_NOT_ALLOWED", "请求方法不支持", 405),
    UNSUPPORTED_MEDIA_TYPE("COMMON.UNSUPPORTED_MEDIA_TYPE", "请求媒体类型不支持", 415),
    INTERNAL_ERROR("COMMON.INTERNAL_ERROR", "系统内部错误", 500);

    private final String code;
    private final String message;
    private final int httpStatus;

    CommonErrorCode(String code, String message, int httpStatus) {
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
