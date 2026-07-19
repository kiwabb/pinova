package com.pinova.service.impl;

import com.pinova.pojo.entity.ProductSku;
import com.pinova.mapper.ProductSkuMapper;
import com.pinova.service.ProductSkuService;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 商品销售单元 SKU 服务实现类
 * </p>
 *
 * @author Pinova
 * @since 2026-07-15
 */
@Service
public class ProductSkuServiceImpl extends ServiceImpl<ProductSkuMapper, ProductSku> implements ProductSkuService {

}
