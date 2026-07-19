package com.pinova.service.error;

import com.pinova.common.error.ErrorCode;

public enum AdminOrderErrorCode implements ErrorCode {
    ORDER_NOT_FOUND("ADMIN_ORDER.ORDER_NOT_FOUND", "订单不存在", 404);

    private final String code;
    private final String message;
    private final int httpStatus;
    AdminOrderErrorCode(String code, String message, int httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
    public String code() { return code; }
    public String message() { return message; }
    public int httpStatus() { return httpStatus; }
}

