package com.pinova.service.impl;

import com.pinova.pojo.entity.ShoppingCartItem;
import com.pinova.mapper.ShoppingCartItemMapper;
import com.pinova.service.ShoppingCartItemService;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 购物车 SKU 项 服务实现类
 * </p>
 *
 * @author Pinova
 * @since 2026-07-16
 */
@Service
public class ShoppingCartItemServiceImpl extends ServiceImpl<ShoppingCartItemMapper, ShoppingCartItem> implements ShoppingCartItemService {

}
