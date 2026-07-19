package com.pinova.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import com.pinova.common.error.BusinessException;
import com.pinova.mapper.ProductReviewMapper;
import com.pinova.mapper.ProductReviewMediaMapper;
import com.pinova.mapper.ProductSkuMapper;
import com.pinova.mapper.ProductSpuMapper;
import com.pinova.pojo.entity.ProductReview;
import com.pinova.pojo.entity.ProductReviewMedia;
import com.pinova.pojo.entity.ProductSku;
import com.pinova.pojo.entity.ProductSpu;
import com.pinova.service.ProductReviewService;
import com.pinova.service.error.ProductErrorCode;
import com.pinova.service.model.PageResult;
import com.pinova.service.model.ProductReviewMediaResult;
import com.pinova.service.model.ProductReviewResult;
import com.pinova.service.query.ProductReviewPageQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * <p>
 * 商品订单项评价 服务实现类
 * </p>
 *
 * @author Pinova
 * @since 2026-07-16
 */
@Service
public class ProductReviewServiceImpl extends ServiceImpl<ProductReviewMapper, ProductReview> implements ProductReviewService {

    private static final short PUBLISHED_PRODUCT = 2;
    private static final short ENABLED_SKU = 1;
    private static final short PUBLISHED_REVIEW = 1;
    private static final short VISIBLE_MEDIA = 1;
    private static final int MAX_PAGE_SIZE = 100;

    private final ProductSkuMapper productSkuMapper;
    private final ProductSpuMapper productSpuMapper;
    private final ProductReviewMediaMapper productReviewMediaMapper;

    public ProductReviewServiceImpl(
            ProductSkuMapper productSkuMapper,
            ProductSpuMapper productSpuMapper,
            ProductReviewMediaMapper productReviewMediaMapper) {
        this.productSkuMapper = productSkuMapper;
        this.productSpuMapper = productSpuMapper;
        this.productReviewMediaMapper = productReviewMediaMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<ProductReviewResult> listPublishedReviews(Long productId, ProductReviewPageQuery query) {
        if (productId == null || productId <= 0) {
            throw new BusinessException(com.pinova.common.error.CommonErrorCode.INVALID_REQUEST, "商品 ID 必须大于 0");
        }
        if (query.page() < 1 || query.pageSize() < 1 || query.pageSize() > MAX_PAGE_SIZE) {
            throw new BusinessException(com.pinova.common.error.CommonErrorCode.INVALID_REQUEST, "评价分页参数无效");
        }
        ProductSpu product = productSpuMapper.selectOne(Wrappers.lambdaQuery(ProductSpu.class)
                .eq(ProductSpu::getId, productId).eq(ProductSpu::getStatus, PUBLISHED_PRODUCT));
        if (product == null) throw new BusinessException(ProductErrorCode.PRODUCT_NOT_FOUND);
        List<Long> skuIds = productSkuMapper.selectList(Wrappers.lambdaQuery(ProductSku.class)
                        .eq(ProductSku::getSpuId, productId).eq(ProductSku::getStatus, ENABLED_SKU))
                .stream().map(ProductSku::getId).toList();
        if (skuIds.isEmpty()) return new PageResult<>(List.of(), query.page(), query.pageSize(), 0);
        var countQuery = Wrappers.lambdaQuery(ProductReview.class)
                .in(ProductReview::getSkuId, skuIds)
                .eq(ProductReview::getStatus, PUBLISHED_REVIEW)
                .isNotNull(ProductReview::getPublishedAt);
        long total = baseMapper.selectCount(countQuery);
        if (total == 0) return new PageResult<>(List.of(), query.page(), query.pageSize(), 0);
        var reviewQuery = Wrappers.lambdaQuery(ProductReview.class)
                .in(ProductReview::getSkuId, skuIds)
                .eq(ProductReview::getStatus, PUBLISHED_REVIEW)
                .isNotNull(ProductReview::getPublishedAt)
                .orderByDesc(ProductReview::getPublishedAt)
                .orderByDesc(ProductReview::getId)
                .last("OFFSET " + (long) (query.page() - 1) * query.pageSize() + " LIMIT " + query.pageSize());
        List<ProductReview> reviews = baseMapper.selectList(reviewQuery);
        Map<Long, List<ProductReviewMedia>> mediaByReviewId = reviews.isEmpty() ? Map.of()
                : productReviewMediaMapper.selectList(Wrappers.lambdaQuery(ProductReviewMedia.class)
                                .in(ProductReviewMedia::getReviewId, reviews.stream().map(ProductReview::getId).toList())
                                .eq(ProductReviewMedia::getStatus, VISIBLE_MEDIA)
                                .orderByAsc(ProductReviewMedia::getSortOrder).orderByAsc(ProductReviewMedia::getId))
                        .stream().collect(Collectors.groupingBy(ProductReviewMedia::getReviewId));
        return new PageResult<>(reviews.stream().map(review -> new ProductReviewResult(
                review.getId(), Boolean.TRUE.equals(review.getAnonymous()) ? "匿名用户" : "已购用户", review.getRating(),
                review.getContent(), review.getSkuSpecSnapshot(), review.getPublishedAt(),
                mediaByReviewId.getOrDefault(review.getId(), List.of()).stream().map(this::toMediaResult).toList())).toList(),
                query.page(), query.pageSize(), total);
    }

    private ProductReviewMediaResult toMediaResult(ProductReviewMedia media) {
        return new ProductReviewMediaResult(media.getId(), media.getMediaType(), media.getObjectKey(), media.getCoverObjectKey(),
                media.getMimeType(), media.getWidth(), media.getHeight(), media.getDurationMs(), media.getAltText());
    }

}
