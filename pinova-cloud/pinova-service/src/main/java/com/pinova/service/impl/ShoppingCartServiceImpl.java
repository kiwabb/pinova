package com.pinova.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import com.pinova.common.error.BusinessException;
import com.pinova.mapper.ShoppingCartMapper;
import com.pinova.mapper.ShoppingCartItemMapper;
import com.pinova.mapper.ProductSkuMapper;
import com.pinova.mapper.ProductSpuMapper;
import com.pinova.pojo.entity.ProductSku;
import com.pinova.pojo.entity.ProductSpu;
import com.pinova.pojo.entity.ShoppingCart;
import com.pinova.pojo.entity.ShoppingCartItem;
import com.pinova.service.ShoppingCartService;
import com.pinova.service.command.AddShoppingCartItemCommand;
import com.pinova.service.command.UpdateShoppingCartItemCommand;
import com.pinova.service.error.ShoppingCartErrorCode;
import com.pinova.service.model.ShoppingCartItemResult;
import com.pinova.service.model.ShoppingCartResult;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * <p>
 * 会员或游客购物车 服务实现类
 * </p>
 *
 * @author Pinova
 * @since 2026-07-16
 */
@Service
public class ShoppingCartServiceImpl extends ServiceImpl<ShoppingCartMapper, ShoppingCart> implements ShoppingCartService {

    private static final short ACTIVE_CART = 0;
    private static final short PUBLISHED_PRODUCT = 2;
    private static final short ENABLED_SKU = 1;
    private static final long MAX_QUANTITY = 999;

    private final ShoppingCartItemMapper shoppingCartItemMapper;
    private final ProductSkuMapper productSkuMapper;
    private final ProductSpuMapper productSpuMapper;

    public ShoppingCartServiceImpl(
            ShoppingCartItemMapper shoppingCartItemMapper,
            ProductSkuMapper productSkuMapper,
            ProductSpuMapper productSpuMapper) {
        this.shoppingCartItemMapper = shoppingCartItemMapper;
        this.productSkuMapper = productSkuMapper;
        this.productSpuMapper = productSpuMapper;
    }

    @Override
    @Transactional
    public ShoppingCartResult getGuestCart(String guestToken) {
        return toResult(getOrCreateGuestCart(guestToken));
    }

    @Override
    @Transactional
    public ShoppingCartResult addGuestCartItem(AddShoppingCartItemCommand command) {
        validateToken(command.guestToken());
        validateQuantity(command.quantity());
        if (command.skuId() == null || command.skuId() <= 0) {
            throw new BusinessException(ShoppingCartErrorCode.SKU_NOT_SALEABLE);
        }
        ShoppingCart cart = getOrCreateGuestCart(command.guestToken());
        ProductSku sku = productSkuMapper.selectOne(Wrappers.lambdaQuery(ProductSku.class)
                .eq(ProductSku::getId, command.skuId()).eq(ProductSku::getStatus, ENABLED_SKU));
        if (sku == null) {
            throw new BusinessException(ShoppingCartErrorCode.SKU_NOT_SALEABLE);
        }
        ProductSpu product = productSpuMapper.selectOne(Wrappers.lambdaQuery(ProductSpu.class)
                .eq(ProductSpu::getId, sku.getSpuId()).eq(ProductSpu::getStatus, PUBLISHED_PRODUCT));
        if (product == null) {
            throw new BusinessException(ShoppingCartErrorCode.SKU_NOT_SALEABLE);
        }
        ShoppingCartItem item = new ShoppingCartItem();
        item.setId(IdWorker.getId());
        item.setCartId(cart.getId());
        item.setShopId(product.getShopId());
        item.setSpuId(product.getId());
        item.setSkuId(sku.getId());
        item.setQuantity(command.quantity());
        item.setSelected(true);
        item.setVersion(0);
        item.setCreatedBy(0L);
        item.setUpdatedBy(0L);
        if (shoppingCartItemMapper.insertOrIncrement(item) == 0) {
            throw new BusinessException(com.pinova.common.error.CommonErrorCode.INVALID_REQUEST, "购物车中该商品数量不能超过 999");
        }
        touch(cart);
        return toResult(cart);
    }

    @Override
    @Transactional
    public ShoppingCartResult updateGuestCartItem(UpdateShoppingCartItemCommand command) {
        validateToken(command.guestToken());
        if (command.itemId() == null || command.itemId() <= 0 || command.version() == null
                || (command.quantity() == null && command.selected() == null)) {
            throw new BusinessException(com.pinova.common.error.CommonErrorCode.INVALID_REQUEST, "购物车项更新参数不完整");
        }
        if (command.quantity() != null) validateQuantity(command.quantity());
        ShoppingCart cart = getOrCreateGuestCart(command.guestToken());
        ShoppingCartItem item = shoppingCartItemMapper.selectOne(Wrappers.lambdaQuery(ShoppingCartItem.class)
                .eq(ShoppingCartItem::getId, command.itemId()).eq(ShoppingCartItem::getCartId, cart.getId()));
        if (item == null) throw new BusinessException(ShoppingCartErrorCode.ITEM_NOT_FOUND);
        if (!command.version().equals(item.getVersion())) throw new BusinessException(ShoppingCartErrorCode.ITEM_VERSION_CONFLICT);
        if (shoppingCartItemMapper.updateItem(item.getId(), cart.getId(), command.quantity(), command.selected(),
                command.version()) == 0) {
            throw new BusinessException(ShoppingCartErrorCode.ITEM_VERSION_CONFLICT);
        }
        touch(cart);
        return toResult(cart);
    }

    @Override
    @Transactional
    public void removeGuestCartItem(String guestToken, Long itemId) {
        validateToken(guestToken);
        if (itemId == null || itemId <= 0) throw new BusinessException(ShoppingCartErrorCode.ITEM_NOT_FOUND);
        ShoppingCart cart = getOrCreateGuestCart(guestToken);
        int deleted = shoppingCartItemMapper.delete(Wrappers.lambdaQuery(ShoppingCartItem.class)
                .eq(ShoppingCartItem::getId, itemId).eq(ShoppingCartItem::getCartId, cart.getId()));
        if (deleted == 0) throw new BusinessException(ShoppingCartErrorCode.ITEM_NOT_FOUND);
        touch(cart);
    }

    private ShoppingCart getOrCreateGuestCart(String guestToken) {
        validateToken(guestToken);
        String hash = sha256(guestToken);
        ShoppingCart cart = baseMapper.selectOne(Wrappers.lambdaQuery(ShoppingCart.class)
                .eq(ShoppingCart::getGuestTokenHash, hash).eq(ShoppingCart::getStatus, ACTIVE_CART));
        if (cart != null) return cart;
        ShoppingCart created = new ShoppingCart();
        created.setGuestTokenHash(hash);
        created.setStatus(ACTIVE_CART);
        created.setExpiresAt(Instant.now().plus(30, ChronoUnit.DAYS));
        created.setLastActivityAt(Instant.now());
        created.setVersion(0);
        created.setCreatedBy(0L);
        created.setUpdatedBy(0L);
        baseMapper.insert(created);
        return created;
    }

    private ShoppingCartResult toResult(ShoppingCart cart) {
        List<ShoppingCartItem> items = shoppingCartItemMapper.selectList(Wrappers.lambdaQuery(ShoppingCartItem.class)
                .eq(ShoppingCartItem::getCartId, cart.getId()).orderByAsc(ShoppingCartItem::getId));
        if (items.isEmpty()) return new ShoppingCartResult(cart.getId(), List.of());
        Map<Long, ProductSku> skus = productSkuMapper.selectList(Wrappers.lambdaQuery(ProductSku.class)
                        .in(ProductSku::getId, items.stream().map(ShoppingCartItem::getSkuId).toList()))
                .stream().collect(Collectors.toMap(ProductSku::getId, item -> item));
        Map<Long, ProductSpu> products = productSpuMapper.selectList(Wrappers.lambdaQuery(ProductSpu.class)
                        .in(ProductSpu::getId, items.stream().map(ShoppingCartItem::getSpuId).toList()))
                .stream().collect(Collectors.toMap(ProductSpu::getId, item -> item));
        return new ShoppingCartResult(cart.getId(), items.stream().map(item -> {
            ProductSku sku = skus.get(item.getSkuId());
            ProductSpu product = products.get(item.getSpuId());
            return new ShoppingCartItemResult(item.getId(), item.getShopId(), item.getSpuId(), item.getSkuId(),
                    product == null ? null : product.getName(), sku == null ? null : sku.getSpecSummary(),
                    sku != null && sku.getMainImageKey() != null ? sku.getMainImageKey() : product == null ? null : product.getMainImageKey(),
                    sku == null ? null : sku.getSalePriceFen(), item.getQuantity(), item.getSelected(), item.getVersion());
        }).toList());
    }

    private void touch(ShoppingCart cart) {
        baseMapper.touch(cart.getId(), Instant.now());
    }

    private static void validateToken(String token) {
        if (token == null || token.length() < 32 || token.length() > 256) {
            throw new BusinessException(com.pinova.common.error.CommonErrorCode.INVALID_REQUEST, "购物车令牌无效");
        }
    }

    private static void validateQuantity(long quantity) {
        if (quantity < 1 || quantity > MAX_QUANTITY) {
            throw new BusinessException(com.pinova.common.error.CommonErrorCode.INVALID_REQUEST, "商品数量必须在 1 到 999 之间");
        }
    }

    private static String sha256(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder(64);
            for (byte item : digest) result.append(String.format("%02x", item));
            return result.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 不可用", exception);
        }
    }

}
