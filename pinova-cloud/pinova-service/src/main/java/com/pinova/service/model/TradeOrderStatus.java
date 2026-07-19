package com.pinova.service.model;

import java.util.Arrays;

public enum TradeOrderStatus {
    PENDING_PAYMENT((short) 0),
    PENDING_FULFILLMENT((short) 1),
    FULFILLING((short) 2),
    COMPLETED((short) 3),
    CLOSED((short) 4);

    private final short code;

    TradeOrderStatus(short code) {
        this.code = code;
    }

    public short code() {
        return code;
    }

    public static TradeOrderStatus fromCode(Short code) {
        return Arrays.stream(values())
                .filter(status -> code != null && status.code == code)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("未知订单状态：" + code));
    }
}
