package com.pinova.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.RefundOrder;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
public interface RefundOrderMapper extends BaseMapper<RefundOrder> {
    @Select("SELECT * FROM pinova.refund_order WHERE after_sale_id = #{afterSaleId} FOR UPDATE")
    RefundOrder selectByAfterSaleIdForUpdate(@Param("afterSaleId") Long afterSaleId);
}
