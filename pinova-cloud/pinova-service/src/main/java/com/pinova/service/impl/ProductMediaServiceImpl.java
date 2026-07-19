package com.pinova.service.impl;

import com.pinova.pojo.entity.ProductMedia;
import com.pinova.mapper.ProductMediaMapper;
import com.pinova.service.ProductMediaService;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 商品 SPU 公共媒体与 SKU 专属媒体 服务实现类
 * </p>
 *
 * @author Pinova
 * @since 2026-07-15
 */
@Service
public class ProductMediaServiceImpl extends ServiceImpl<ProductMediaMapper, ProductMedia> implements ProductMediaService {

}
