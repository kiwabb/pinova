package com.pinova.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import com.pinova.common.error.BusinessException;
import com.pinova.common.error.CommonErrorCode;
import com.pinova.mapper.ProductCategoryMapper;
import com.pinova.mapper.ProductMediaMapper;
import com.pinova.mapper.ProductSkuMapper;
import com.pinova.mapper.ProductSpuMapper;
import com.pinova.mapper.ProductSpuDetailMapper;
import com.pinova.mapper.model.ProductSaleSnapshot;
import com.pinova.mapper.model.ProductSkuSaleSnapshot;
import com.pinova.pojo.entity.ProductCategory;
import com.pinova.pojo.entity.ProductMedia;
import com.pinova.pojo.entity.ProductSku;
import com.pinova.pojo.entity.ProductSpu;
import com.pinova.pojo.entity.ProductSpuDetail;
import com.pinova.service.ProductSpuService;
import com.pinova.service.assembler.ProductDetailResultAssembler;
import com.pinova.service.assembler.ProductSpuResultAssembler;
import com.pinova.service.error.ProductErrorCode;
import com.pinova.service.model.PageResult;
import com.pinova.service.model.ProductDetailResult;
import com.pinova.service.model.ProductSummaryResult;
import com.pinova.service.query.ProductListQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * <p>
 * 商品 SPU 服务实现类
 * </p>
 *
 * @author Pinova
 * @since 2026-07-15
 */
@Service
public class ProductSpuServiceImpl extends ServiceImpl<ProductSpuMapper, ProductSpu> implements ProductSpuService {

    private static final short ENABLED_CATEGORY = 1;
    private static final short PUBLISHED_PRODUCT = 2;
    private static final short ENABLED_SKU = 1;
    private static final short ENABLED_MEDIA = 1;
    private static final int MAX_PAGE_SIZE = 100;
    private static final long LOW_STOCK_THRESHOLD = 10;

    private final ProductCategoryMapper productCategoryMapper;
    private final ProductSkuMapper productSkuMapper;
    private final ProductSpuDetailMapper productSpuDetailMapper;
    private final ProductMediaMapper productMediaMapper;

    public ProductSpuServiceImpl(
            ProductCategoryMapper productCategoryMapper,
            ProductSkuMapper productSkuMapper,
            ProductSpuDetailMapper productSpuDetailMapper,
            ProductMediaMapper productMediaMapper) {
        this.productCategoryMapper = productCategoryMapper;
        this.productSkuMapper = productSkuMapper;
        this.productSpuDetailMapper = productSpuDetailMapper;
        this.productMediaMapper = productMediaMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<ProductSummaryResult> listPublishedProducts(ProductListQuery query) {
        validateQuery(query);

        List<ProductCategory> categories = productCategoryMapper.selectList(
                Wrappers.lambdaQuery(ProductCategory.class)
                        .eq(ProductCategory::getStatus, ENABLED_CATEGORY)
                        .orderByAsc(ProductCategory::getLevel)
                        .orderByAsc(ProductCategory::getSortOrder)
                        .orderByAsc(ProductCategory::getId));
        Map<Long, ProductCategory> categoriesById = categories.stream()
                .collect(Collectors.toMap(ProductCategory::getId, category -> category));

        Set<Long> categoryIds = resolveCategoryIds(query.categoryCode(), categories, categoriesById);
        long total = baseMapper.countPublishedProducts(categoryIds);
        if (total == 0) {
            return new PageResult<>(List.of(), query.page(), query.pageSize(), 0);
        }

        long offset = (long) (query.page() - 1) * query.pageSize();
        List<ProductSpu> products = baseMapper.selectPublishedProducts(
                categoryIds,
                offset,
                query.pageSize());
        Map<Long, ProductSaleSnapshot> saleSnapshotsBySpu = products.isEmpty()
                ? Map.of()
                : productSkuMapper.selectSaleSnapshots(
                                products.stream().map(ProductSpu::getId).toList(),
                                LOW_STOCK_THRESHOLD)
                        .stream()
                        .collect(Collectors.toUnmodifiableMap(ProductSaleSnapshot::spuId, snapshot -> snapshot));
        List<ProductSummaryResult> items = products.stream()
                .map(product -> toSummaryResult(product, categoriesById, saleSnapshotsBySpu))
                .toList();
        return new PageResult<>(items, query.page(), query.pageSize(), total);
    }

    @Override
    @Transactional(readOnly = true)
    public ProductDetailResult getPublishedProductDetail(Long productId) {
        if (productId == null || productId <= 0) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "商品 ID 必须大于 0");
        }
        ProductSpu product = baseMapper.selectOne(
                Wrappers.lambdaQuery(ProductSpu.class)
                        .eq(ProductSpu::getId, productId)
                        .eq(ProductSpu::getStatus, PUBLISHED_PRODUCT));
        if (product == null) {
            throw new BusinessException(ProductErrorCode.PRODUCT_NOT_FOUND);
        }

        List<ProductCategory> categories = productCategoryMapper.selectList(
                Wrappers.lambdaQuery(ProductCategory.class)
                        .eq(ProductCategory::getStatus, ENABLED_CATEGORY)
                        .orderByAsc(ProductCategory::getLevel)
                        .orderByAsc(ProductCategory::getSortOrder)
                        .orderByAsc(ProductCategory::getId));
        Map<Long, ProductCategory> categoriesById = categories.stream()
                .collect(Collectors.toMap(ProductCategory::getId, category -> category));
        ProductCategory category = categoriesById.get(product.getCategoryId());
        if (category == null) {
            throw new IllegalStateException("上架商品关联了不可用分类: " + productId);
        }

        ProductSpuDetail detail = productSpuDetailMapper.selectOne(
                Wrappers.lambdaQuery(ProductSpuDetail.class)
                        .eq(ProductSpuDetail::getSpuId, productId));
        List<ProductSku> skus = productSkuMapper.selectList(
                Wrappers.lambdaQuery(ProductSku.class)
                        .eq(ProductSku::getSpuId, productId)
                        .eq(ProductSku::getStatus, ENABLED_SKU)
                        .orderByAsc(ProductSku::getSortOrder)
                        .orderByAsc(ProductSku::getId));
        Map<Long, ProductSkuSaleSnapshot> saleSnapshotsBySku = productSkuMapper
                .selectSkuSaleSnapshots(productId, LOW_STOCK_THRESHOLD)
                .stream()
                .collect(Collectors.toUnmodifiableMap(ProductSkuSaleSnapshot::skuId, snapshot -> snapshot));

        List<Long> skuIds = skus.stream().map(ProductSku::getId).toList();
        List<ProductMedia> media = productMediaMapper.selectList(
                Wrappers.lambdaQuery(ProductMedia.class)
                        .eq(ProductMedia::getStatus, ENABLED_MEDIA)
                        .and(owner -> {
                            owner.eq(ProductMedia::getSpuId, productId);
                            if (!skuIds.isEmpty()) {
                                owner.or().in(ProductMedia::getSkuId, skuIds);
                            }
                        })
                        .orderByAsc(ProductMedia::getMediaRole)
                        .orderByAsc(ProductMedia::getSortOrder)
                        .orderByAsc(ProductMedia::getId));
        List<ProductMedia> commonMedia = media.stream()
                .filter(item -> item.getSpuId() != null)
                .toList();
        Map<Long, List<ProductMedia>> mediaBySku = media.stream()
                .filter(item -> item.getSkuId() != null)
                .collect(Collectors.groupingBy(ProductMedia::getSkuId));

        return ProductDetailResultAssembler.toDetailResult(
                product,
                category,
                buildCategoryPath(category, categoriesById),
                detail,
                skus,
                saleSnapshotsBySku,
                commonMedia,
                mediaBySku);
    }

    private static void validateQuery(ProductListQuery query) {
        if (query.page() < 1) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "页码必须大于 0");
        }
        if (query.pageSize() < 1 || query.pageSize() > MAX_PAGE_SIZE) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "每页数量必须在 1 到 100 之间");
        }
    }

    private static Set<Long> resolveCategoryIds(
            String categoryCode,
            List<ProductCategory> categories,
            Map<Long, ProductCategory> categoriesById) {
        if (categoryCode == null || categoryCode.isBlank()) {
            return null;
        }

        String normalizedCode = categoryCode.trim().toLowerCase(Locale.ROOT);
        ProductCategory root = categories.stream()
                .filter(category -> category.getCategoryCode().toLowerCase(Locale.ROOT).equals(normalizedCode))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ProductErrorCode.CATEGORY_NOT_FOUND));

        return categories.stream()
                .filter(category -> isDescendantOrSelf(category, root.getId(), categoriesById))
                .map(ProductCategory::getId)
                .collect(Collectors.toUnmodifiableSet());
    }

    private static boolean isDescendantOrSelf(
            ProductCategory category,
            Long rootId,
            Map<Long, ProductCategory> categoriesById) {
        ProductCategory current = category;
        while (current != null) {
            if (current.getId().equals(rootId)) {
                return true;
            }
            current = current.getParentId() == null
                    ? null
                    : categoriesById.get(current.getParentId());
        }
        return false;
    }

    private static ProductSummaryResult toSummaryResult(
            ProductSpu product,
            Map<Long, ProductCategory> categoriesById,
            Map<Long, ProductSaleSnapshot> saleSnapshotsBySpu) {
        ProductCategory category = categoriesById.get(product.getCategoryId());
        if (category == null) {
            throw new IllegalStateException("上架商品关联了不可用分类: " + product.getId());
        }
        ProductSaleSnapshot saleSnapshot = saleSnapshotsBySpu.get(product.getId());
        return ProductSpuResultAssembler.toSummaryResult(
                product,
                category,
                buildCategoryPath(category, categoriesById),
                saleSnapshot == null ? null : saleSnapshot.priceFen(),
                saleSnapshot == null ? null : saleSnapshot.stock());
    }

    private static List<String> buildCategoryPath(
            ProductCategory category,
            Map<Long, ProductCategory> categoriesById) {
        List<String> path = new ArrayList<>();
        ProductCategory current = category;
        while (current != null) {
            path.add(current.getCategoryCode());
            current = current.getParentId() == null
                    ? null
                    : categoriesById.get(current.getParentId());
        }
        Collections.reverse(path);
        return path;
    }

}
