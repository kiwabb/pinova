package com.pinova.service.error;

import com.pinova.common.error.ErrorCode;

public enum PaymentErrorCode implements ErrorCode {
    INVALID_CHECKOUT_NO("PAYMENT.INVALID_CHECKOUT_NO", "结算编号无效", 400),
    CHECKOUT_NOT_FOUND("PAYMENT.CHECKOUT_NOT_FOUND", "结算订单不存在", 404),
    PAYMENT_NOT_FOUND("PAYMENT.NOT_FOUND", "支付单不存在", 404),
    PAYMENT_NOT_REQUIRED("PAYMENT.NOT_REQUIRED", "本次结算无需支付", 409),
    ORDER_NOT_PAYABLE("PAYMENT.ORDER_NOT_PAYABLE", "订单当前不能支付", 409),
    PAYMENT_EXPIRED("PAYMENT.EXPIRED", "支付已过期，请刷新订单状态", 409),
    PAYMENT_STATE_CONFLICT("PAYMENT.STATE_CONFLICT", "支付状态已更新，请刷新后重试", 409),
    INVALID_SIMULATION_OUTCOME("PAYMENT.INVALID_SIMULATION_OUTCOME", "模拟支付结果无效", 400),
    MOCK_PROVIDER_DISABLED("PAYMENT.MOCK_PROVIDER_DISABLED", "当前环境未启用模拟支付", 503),
    PROVIDER_UNAVAILABLE("PAYMENT.PROVIDER_UNAVAILABLE", "支付渠道暂时不可用", 502),
    REVIEW_REQUIRED("PAYMENT.REVIEW_REQUIRED", "支付结果需要人工确认，请勿重复付款", 409);

    private final String code;
    private final String message;
    private final int httpStatus;

    PaymentErrorCode(String code, String message, int httpStatus) {
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
