package com.pinova.service.model;
import java.util.Arrays;
public enum AfterSaleStatus {
    APPLIED((short)0), REJECTED((short)1), REFUNDING((short)2), COMPLETED((short)3), CLOSED((short)4), FAILED((short)5);
    private final short code; AfterSaleStatus(short code){this.code=code;} public short code(){return code;}
    public static AfterSaleStatus fromCode(short code){return Arrays.stream(values()).filter(v->v.code==code).findFirst().orElseThrow();}
}
