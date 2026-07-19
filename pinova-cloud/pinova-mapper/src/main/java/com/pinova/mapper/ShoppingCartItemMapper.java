package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.ShoppingCartItem;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/**
 * <p>
 * 购物车 SKU 项 Mapper 接口
 * </p>
 *
 * @author Pinova
 * @since 2026-07-16
 */
public interface ShoppingCartItemMapper extends BaseMapper<ShoppingCartItem> {

    @Insert("""
            INSERT INTO pinova.shopping_cart_item
                (id, cart_id, shop_id, spu_id, sku_id, quantity, selected, version, created_by, updated_by)
            VALUES
                (#{id}, #{cartId}, #{shopId}, #{spuId}, #{skuId}, #{quantity}, #{selected}, #{version}, #{createdBy}, #{updatedBy})
            ON CONFLICT (cart_id, sku_id) DO UPDATE
            SET quantity = pinova.shopping_cart_item.quantity + EXCLUDED.quantity,
                version = pinova.shopping_cart_item.version + 1,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = EXCLUDED.updated_by
            WHERE pinova.shopping_cart_item.quantity + EXCLUDED.quantity <= 999
            """)
    int insertOrIncrement(ShoppingCartItem item);

    @Update("""
            UPDATE pinova.shopping_cart_item
            SET quantity = COALESCE(#{quantity}, quantity),
                selected = COALESCE(#{selected}, selected),
                version = version + 1,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = 0
            WHERE id = #{itemId}
              AND cart_id = #{cartId}
              AND version = #{version}
            """)
    int updateItem(
            @Param("itemId") Long itemId,
            @Param("cartId") Long cartId,
            @Param("quantity") Long quantity,
            @Param("selected") Boolean selected,
            @Param("version") Integer version);

}
