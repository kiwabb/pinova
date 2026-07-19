package com.pinova.service;

import com.pinova.pojo.entity.ProductReview;
import com.pinova.service.model.PageResult;
import com.pinova.service.model.ProductReviewResult;
import com.pinova.service.query.ProductReviewPageQuery;
import com.baomidou.mybatisplus.spring.service.IService;

/**
 * <p>
 * 商品订单项评价 服务类
 * </p>
 *
 * @author Pinova
 * @since 2026-07-16
 */
public interface ProductReviewService extends IService<ProductReview> {

    PageResult<ProductReviewResult> listPublishedReviews(Long productId, ProductReviewPageQuery query);

}
