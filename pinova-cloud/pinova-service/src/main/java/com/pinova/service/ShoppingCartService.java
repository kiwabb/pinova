package com.pinova.service;

import com.pinova.pojo.entity.ShoppingCart;
import com.pinova.service.command.AddShoppingCartItemCommand;
import com.pinova.service.command.UpdateShoppingCartItemCommand;
import com.pinova.service.model.ShoppingCartResult;
import com.baomidou.mybatisplus.spring.service.IService;

/**
 * <p>
 * 会员或游客购物车 服务类
 * </p>
 *
 * @author Pinova
 * @since 2026-07-16
 */
public interface ShoppingCartService extends IService<ShoppingCart> {

    ShoppingCartResult getGuestCart(String guestToken);

    ShoppingCartResult addGuestCartItem(AddShoppingCartItemCommand command);

    ShoppingCartResult updateGuestCartItem(UpdateShoppingCartItemCommand command);

    void removeGuestCartItem(String guestToken, Long itemId);

}
