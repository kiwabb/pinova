package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.TradeOrder;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.Instant;
import java.util.List;

/**
 * <p>
 * 交易订单聚合根，每行只属于一个店铺和一种履约类型 Mapper 接口
 * </p>
 *
 * @author Pinova
 * @since 2026-07-18
 */
public interface TradeOrderMapper extends BaseMapper<TradeOrder> {

    @Select("SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(#{checkoutNo}, 0))")
    int acquireCheckoutLock(@Param("checkoutNo") String checkoutNo);

    @Select("""
            SELECT *
            FROM pinova.trade_order
            WHERE checkout_no = #{checkoutNo}
            ORDER BY shop_id, id
            FOR UPDATE
            """)
    List<TradeOrder> selectCheckoutOrdersForUpdate(@Param("checkoutNo") String checkoutNo);

    @Select("SELECT * FROM pinova.trade_order WHERE order_no = #{orderNo} FOR UPDATE")
    TradeOrder selectByOrderNoForUpdate(@Param("orderNo") String orderNo);

    @Select("""
            SELECT order_no FROM pinova.trade_order
            WHERE status = 2 AND auto_complete_at <= #{now}
            ORDER BY auto_complete_at, id LIMIT #{limit}
            """)
    List<String> selectAutoCompleteOrderNos(@Param("now") Instant now, @Param("limit") int limit);

    @Select("""
            SELECT DISTINCT checkout_no
            FROM (
                SELECT checkout_no, payment_expires_at, id
                FROM pinova.trade_order
                WHERE status = 0
                  AND payment_expires_at <= #{now}
                ORDER BY payment_expires_at, id
                LIMIT #{limit}
            ) expired
            """)
    List<String> selectExpiredCheckoutNos(
            @Param("now") Instant now,
            @Param("limit") int limit);

    @Update("""
            UPDATE pinova.trade_order
            SET status = 1,
                paid_amount_fen = payable_amount_fen,
                paid_at = #{paidAt},
                version = version + 1,
                updated_at = #{updatedAt},
                updated_by = #{operatorId}
            WHERE id = #{orderId}
              AND status = 0
              AND version = #{version}
            """)
    int markPaid(
            @Param("orderId") Long orderId,
            @Param("version") Integer version,
            @Param("paidAt") Instant paidAt,
            @Param("updatedAt") Instant updatedAt,
            @Param("operatorId") Long operatorId);

    @Update("""
            UPDATE pinova.trade_order
            SET status = 4,
                closed_at = #{closedAt},
                close_reason_code = 2,
                close_reason = '支付超时',
                version = version + 1,
                updated_at = #{closedAt},
                updated_by = #{operatorId}
            WHERE id = #{orderId}
              AND status = 0
              AND version = #{version}
            """)
    int closeExpired(
            @Param("orderId") Long orderId,
            @Param("version") Integer version,
            @Param("closedAt") Instant closedAt,
            @Param("operatorId") Long operatorId);

    @Update("""
            UPDATE pinova.trade_order
            SET status = 4,
                closed_at = #{closedAt},
                close_reason_code = 1,
                close_reason = '用户取消',
                version = version + 1,
                updated_at = #{closedAt},
                updated_by = #{operatorId}
            WHERE id = #{orderId}
              AND status = 0
              AND version = #{version}
            """)
    int closeCancelled(
            @Param("orderId") Long orderId,
            @Param("version") Integer version,
            @Param("closedAt") Instant closedAt,
            @Param("operatorId") Long operatorId);
}
