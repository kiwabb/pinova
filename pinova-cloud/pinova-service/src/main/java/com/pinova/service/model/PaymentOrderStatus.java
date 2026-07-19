package com.pinova.service.model;

import java.util.Arrays;

public enum PaymentOrderStatus {
    PENDING((short) 0),
    SUCCEEDED((short) 1),
    FAILED((short) 2),
    CLOSED((short) 3),
    REVIEW_REQUIRED((short) 4);

    private final short code;

    PaymentOrderStatus(short code) {
        this.code = code;
    }

    public short code() {
        return code;
    }

    public static PaymentOrderStatus fromCode(short code) {
        return Arrays.stream(values())
                .filter(status -> status.code == code)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("未知支付状态：" + code));
    }
}
