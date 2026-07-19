package com.pinova.service.error;

import com.pinova.common.error.ErrorCode;

public enum MemberShippingAddressErrorCode implements ErrorCode {

    MEMBER_NOT_FOUND("MEMBER_ADDRESS.MEMBER_NOT_FOUND", "会员不存在或不可用", 404),
    ADDRESS_NOT_FOUND("MEMBER_ADDRESS.NOT_FOUND", "收货地址不存在", 404),
    VERSION_CONFLICT("MEMBER_ADDRESS.VERSION_CONFLICT", "收货地址已在其他设备更新，请刷新后重试", 409),
    ADDRESS_LIMIT_REACHED("MEMBER_ADDRESS.LIMIT_REACHED", "收货地址数量已达到上限", 409);

    private final String code;
    private final String message;
    private final int httpStatus;

    MemberShippingAddressErrorCode(String code, String message, int httpStatus) {
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
