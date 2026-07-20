package com.pinova.service.error;

import com.pinova.common.error.ErrorCode;

public enum OrderLifecycleErrorCode implements ErrorCode {
    ORDER_NOT_FOUND("ORDER_LIFECYCLE.NOT_FOUND", "订单不存在", 404),
    STATE_CONFLICT("ORDER_LIFECYCLE.STATE_CONFLICT", "订单状态已变化，请刷新后重试", 409),
    AFTER_SALE_ACTIVE("ORDER_LIFECYCLE.AFTER_SALE_ACTIVE", "订单正在处理售后，不能推进履约", 409),
    INVALID_REQUEST_KEY("ORDER_LIFECYCLE.INVALID_REQUEST_KEY", "操作幂等键无效", 400),
    INVALID_SHIPMENT("ORDER_LIFECYCLE.INVALID_SHIPMENT", "承运商或物流单号无效", 400),
    REASON_REQUIRED("ORDER_LIFECYCLE.REASON_REQUIRED", "必须填写操作原因", 400);
    private final String code; private final String message; private final int httpStatus;
    OrderLifecycleErrorCode(String code,String message,int httpStatus){this.code=code;this.message=message;this.httpStatus=httpStatus;}
    public String code(){return code;} public String message(){return message;} public int httpStatus(){return httpStatus;}
}
