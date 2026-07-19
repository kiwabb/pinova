package com.pinova.service.impl;

import com.pinova.pojo.entity.InventoryStock;
import com.pinova.mapper.InventoryStockMapper;
import com.pinova.service.InventoryStockService;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * SKU 库存余额 服务实现类
 * </p>
 *
 * @author Pinova
 * @since 2026-07-15
 */
@Service
public class InventoryStockServiceImpl extends ServiceImpl<InventoryStockMapper, InventoryStock> implements InventoryStockService {

}
