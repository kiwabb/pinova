package com.pinova.mapper;
import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.OrderAfterSale;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
public interface OrderAfterSaleMapper extends BaseMapper<OrderAfterSale> {
    @Select("SELECT * FROM pinova.order_after_sale WHERE after_sale_no = #{afterSaleNo} FOR UPDATE")
    OrderAfterSale selectByNoForUpdate(@Param("afterSaleNo") String afterSaleNo);
}
