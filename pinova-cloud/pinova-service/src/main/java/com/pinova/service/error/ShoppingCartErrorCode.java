package com.pinova.service.error;

import com.pinova.common.error.ErrorCode;

public enum ShoppingCartErrorCode implements ErrorCode {

    ITEM_NOT_FOUND("CART.ITEM_NOT_FOUND", "购物车商品不存在", 404),
    ITEM_VERSION_CONFLICT("CART.ITEM_VERSION_CONFLICT", "购物车已在其他设备更新，请刷新后重试", 409),
    SKU_NOT_SALEABLE("CART.SKU_NOT_SALEABLE", "商品规格不存在或不可售", 409);

    private final String code;
    private final String message;
    private final int httpStatus;

    ShoppingCartErrorCode(String code, String message, int httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }

    @Override public String code() { return code; }
    @Override public String message() { return message; }
    @Override public int httpStatus() { return httpStatus; }
}
