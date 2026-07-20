package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.PaymentOrder;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * <p>
 * 按结算聚合的支付单，一次 checkout 只允许一张有效支付单 Mapper 接口
 * </p>
 *
 * @author Pinova
 * @since 2026-07-19
 */
public interface PaymentOrderMapper extends BaseMapper<PaymentOrder> {

    @Select("""
            SELECT *
            FROM pinova.payment_order
            WHERE checkout_no = #{checkoutNo}
            FOR UPDATE
            """)
    PaymentOrder selectByCheckoutNoForUpdate(@Param("checkoutNo") String checkoutNo);

    @Select("""
            SELECT *
            FROM pinova.payment_order
            WHERE payment_no = #{paymentNo}
            FOR UPDATE
            """)
    PaymentOrder selectByPaymentNoForUpdate(@Param("paymentNo") String paymentNo);

    @Select("SELECT * FROM pinova.payment_order WHERE id = #{paymentId} FOR UPDATE")
    PaymentOrder selectByIdForUpdate(@Param("paymentId") Long paymentId);
}
