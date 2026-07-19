package com.pinova.service.impl;

import com.pinova.pojo.entity.ProductSpuDetail;
import com.pinova.mapper.ProductSpuDetailMapper;
import com.pinova.service.ProductSpuDetailService;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 商品 SPU 详情，一对一保存前台详情内容 服务实现类
 * </p>
 *
 * @author Pinova
 * @since 2026-07-15
 */
@Service
public class ProductSpuDetailServiceImpl extends ServiceImpl<ProductSpuDetailMapper, ProductSpuDetail> implements ProductSpuDetailService {

}
