package com.pinova.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.pinova.pojo.entity.ShoppingCart;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

import java.time.Instant;

/**
 * <p>
 * 会员或游客购物车 Mapper 接口
 * </p>
 *
 * @author Pinova
 * @since 2026-07-16
 */
public interface ShoppingCartMapper extends BaseMapper<ShoppingCart> {

    @Update("""
            UPDATE pinova.shopping_cart
            SET last_activity_at = #{lastActivityAt},
                version = version + 1,
                updated_at = CURRENT_TIMESTAMP,
                updated_by = 0
            WHERE id = #{cartId}
            """)
    int touch(@Param("cartId") Long cartId, @Param("lastActivityAt") Instant lastActivityAt);

}
