package com.pinova.service.error;

import com.pinova.common.error.ErrorCode;

public enum TradeOrderErrorCode implements ErrorCode {
    INVALID_IDEMPOTENCY_KEY("ORDER.INVALID_IDEMPOTENCY_KEY", "订单幂等键无效", 400),
    IDEMPOTENCY_CONFLICT("ORDER.IDEMPOTENCY_CONFLICT", "该幂等键已用于不同的订单请求", 409),
    CART_NOT_FOUND("ORDER.CART_NOT_FOUND", "当前购物车不存在或已失效", 409),
    CART_CHANGED("ORDER.CART_CHANGED", "购物车已更新，请刷新后重新确认", 409),
    ADDRESS_NOT_FOUND("ORDER.ADDRESS_NOT_FOUND", "收货地址不存在", 409),
    ADDRESS_CHANGED("ORDER.ADDRESS_CHANGED", "收货地址已更新，请刷新后重新确认", 409),
    PRODUCT_NOT_SALEABLE("ORDER.PRODUCT_NOT_SALEABLE", "部分商品已不可售，请返回购物车确认", 409),
    UNSUPPORTED_PRODUCT_TYPE("ORDER.UNSUPPORTED_PRODUCT_TYPE", "当前结算只支持实物商品", 409),
    INVENTORY_INSUFFICIENT("ORDER.INVENTORY_INSUFFICIENT", "部分商品库存不足，请返回购物车确认", 409);

    private final String code;
    private final String message;
    private final int httpStatus;

    TradeOrderErrorCode(String code, String message, int httpStatus) {
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
