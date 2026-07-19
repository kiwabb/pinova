package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.TradeOrder;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

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
}
