package com.pinova.service.error;

import com.pinova.common.error.ErrorCode;

public enum ProductErrorCode implements ErrorCode {

    CATEGORY_NOT_FOUND("PRODUCT.CATEGORY_NOT_FOUND", "分类不存在或已停用", 404),
    PRODUCT_NOT_FOUND("PRODUCT.NOT_FOUND", "商品不存在或未上架", 404);

    private final String code;
    private final String message;
    private final int httpStatus;

    ProductErrorCode(String code, String message, int httpStatus) {
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
