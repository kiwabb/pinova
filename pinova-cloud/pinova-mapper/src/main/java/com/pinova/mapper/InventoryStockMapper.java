package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.InventoryStock;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;

/**
 * <p>
 * SKU 库存余额 Mapper 接口
 * </p>
 *
 * @author Pinova
 * @since 2026-07-15
 */
public interface InventoryStockMapper extends BaseMapper<InventoryStock> {

    @Select("""
            SELECT stock.*
            FROM pinova.inventory_stock stock
            JOIN pinova.warehouse warehouse ON warehouse.id = stock.warehouse_id
            WHERE warehouse.shop_id = #{shopId}
              AND warehouse.status = 1
              AND warehouse.deleted = false
              AND stock.sku_id = #{skuId}
              AND stock.on_hand_quantity > stock.reserved_quantity
            ORDER BY warehouse.warehouse_type, stock.id
            FOR UPDATE OF stock
            """)
    List<InventoryStock> selectAvailableStocksForUpdate(
            @Param("shopId") Long shopId,
            @Param("skuId") Long skuId);

    @Update("""
            UPDATE pinova.inventory_stock
            SET reserved_quantity = reserved_quantity + #{quantity},
                version = version + 1,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = #{operatorId}
            WHERE id = #{stockId}
              AND version = #{version}
              AND on_hand_quantity - reserved_quantity >= #{quantity}
            """)
    int reserve(
            @Param("stockId") Long stockId,
            @Param("quantity") Long quantity,
            @Param("version") Integer version,
            @Param("operatorId") Long operatorId);

    @Update("""
            UPDATE pinova.inventory_stock
            SET on_hand_quantity = on_hand_quantity - #{quantity},
                version = version + 1,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = #{operatorId}
            WHERE id = #{stockId}
              AND version = #{version}
              AND on_hand_quantity - reserved_quantity >= #{quantity}
            """)
    int deductAvailable(
            @Param("stockId") Long stockId,
            @Param("quantity") Long quantity,
            @Param("version") Integer version,
            @Param("operatorId") Long operatorId);
}
