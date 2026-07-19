package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.InventoryReservation;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import java.time.Instant;

/**
 * <p>
 * 订单库存预占记录 Mapper 接口
 * </p>
 *
 * @author Pinova
 * @since 2026-07-15
 */
public interface InventoryReservationMapper extends BaseMapper<InventoryReservation> {

    @Update("""
            UPDATE pinova.inventory_reservation
            SET status = 1,
                closed_at = #{closedAt},
                version = version + 1,
                updated_at = #{closedAt},
                updated_by = #{operatorId}
            WHERE id = #{reservationId}
              AND status = 0
              AND version = #{version}
            """)
    int markDeducted(
            @Param("reservationId") Long reservationId,
            @Param("version") Integer version,
            @Param("closedAt") Instant closedAt,
            @Param("operatorId") Long operatorId);

    @Update("""
            UPDATE pinova.inventory_reservation
            SET status = 3,
                closed_at = #{closedAt},
                version = version + 1,
                updated_at = #{closedAt},
                updated_by = #{operatorId}
            WHERE id = #{reservationId}
              AND status = 0
              AND version = #{version}
            """)
    int markExpired(
            @Param("reservationId") Long reservationId,
            @Param("version") Integer version,
            @Param("closedAt") Instant closedAt,
            @Param("operatorId") Long operatorId);
}
