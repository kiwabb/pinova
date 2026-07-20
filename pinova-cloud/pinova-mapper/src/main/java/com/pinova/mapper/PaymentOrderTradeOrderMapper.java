package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.PaymentOrderTradeOrder;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * <p>
 * 支付单与交易订单的关联快照 Mapper 接口
 * </p>
 *
 * @author Pinova
 * @since 2026-07-19
 */
public interface PaymentOrderTradeOrderMapper extends BaseMapper<PaymentOrderTradeOrder> {
    @Select("SELECT * FROM pinova.payment_order_trade_order WHERE trade_order_id = #{orderId} FOR UPDATE")
    PaymentOrderTradeOrder selectByTradeOrderIdForUpdate(@Param("orderId") Long orderId);
}
