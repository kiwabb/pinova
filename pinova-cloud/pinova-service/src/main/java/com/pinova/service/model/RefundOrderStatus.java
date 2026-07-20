package com.pinova.service.model;
import java.util.Arrays;
public enum RefundOrderStatus {
    PENDING((short)0), SUCCEEDED((short)1), FAILED((short)2), REVIEW_REQUIRED((short)3);
    private final short code; RefundOrderStatus(short code){this.code=code;} public short code(){return code;}
    public static RefundOrderStatus fromCode(short code){return Arrays.stream(values()).filter(v->v.code==code).findFirst().orElseThrow();}
}
