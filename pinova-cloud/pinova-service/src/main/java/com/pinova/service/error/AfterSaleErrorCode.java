package com.pinova.service.error;
import com.pinova.common.error.ErrorCode;
public enum AfterSaleErrorCode implements ErrorCode {
    NOT_FOUND("AFTER_SALE.NOT_FOUND","售后申请不存在",404), ORDER_NOT_ELIGIBLE("AFTER_SALE.ORDER_NOT_ELIGIBLE","订单当前不能申请仅退款",409),
    WINDOW_EXPIRED("AFTER_SALE.WINDOW_EXPIRED","订单售后申请期限已结束",409), ACTIVE_EXISTS("AFTER_SALE.ACTIVE_EXISTS","订单已有进行中的售后",409),
    STATE_CONFLICT("AFTER_SALE.STATE_CONFLICT","售后状态已变化，请刷新后重试",409), INVALID_REQUEST("AFTER_SALE.INVALID_REQUEST","售后申请参数无效",400),
    REFUND_FAILED("AFTER_SALE.REFUND_FAILED","退款执行失败，可在后台重试",409);
    private final String code,message;private final int status;AfterSaleErrorCode(String c,String m,int s){code=c;message=m;status=s;}
    public String code(){return code;}public String message(){return message;}public int httpStatus(){return status;}
}
