package com.pinova.service.impl;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.pinova.common.error.BusinessException;
import com.pinova.common.error.CommonErrorCode;
import com.pinova.mapper.InventoryLedgerMapper;
import com.pinova.mapper.InventoryReservationMapper;
import com.pinova.mapper.InventoryStockMapper;
import com.pinova.mapper.MemberShippingAddressMapper;
import com.pinova.mapper.ProductSkuMapper;
import com.pinova.mapper.ProductSpuMapper;
import com.pinova.mapper.ShoppingCartItemMapper;
import com.pinova.mapper.ShoppingCartMapper;
import com.pinova.mapper.TradeOrderItemMapper;
import com.pinova.mapper.TradeOrderMapper;
import com.pinova.mapper.TradeOrderShippingAddressMapper;
import com.pinova.pojo.entity.InventoryLedger;
import com.pinova.pojo.entity.InventoryReservation;
import com.pinova.pojo.entity.InventoryStock;
import com.pinova.pojo.entity.MemberShippingAddress;
import com.pinova.pojo.entity.ProductSku;
import com.pinova.pojo.entity.ProductSpu;
import com.pinova.pojo.entity.ShoppingCart;
import com.pinova.pojo.entity.ShoppingCartItem;
import com.pinova.pojo.entity.TradeOrder;
import com.pinova.pojo.entity.TradeOrderItem;
import com.pinova.pojo.entity.TradeOrderShippingAddress;
import com.pinova.service.TradeOrderService;
import com.pinova.service.assembler.TradeOrderResultAssembler;
import com.pinova.service.command.SubmitOrderCommand;
import com.pinova.service.command.SubmitOrderLineCommand;
import com.pinova.service.error.TradeOrderErrorCode;
import com.pinova.service.model.SubmittedCheckoutResult;
import com.pinova.service.model.TradeOrderStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TradeOrderServiceImpl implements TradeOrderService {

    private static final short ACTIVE_CART = 0;
    private static final short CHECKED_OUT_CART = 2;
    private static final short PUBLISHED_PRODUCT = 2;
    private static final short PHYSICAL_PRODUCT = 1;
    private static final short PHYSICAL_FULFILLMENT = 1;
    private static final short ENABLED_SKU = 1;
    private static final short TRACKED_INVENTORY = 1;
    private static final short UNLIMITED_INVENTORY = 2;
    private static final short RESERVED_INVENTORY = 0;
    private static final short DEDUCTED_INVENTORY = 1;
    private static final short OUTBOUND_LEDGER_CHANGE = 2;
    private static final short RESERVATION_LEDGER_CHANGE = 3;
    private static final int MAX_ORDER_ITEMS = 100;
    private static final long MAX_ITEM_QUANTITY = 999;
    private static final int MAX_BUYER_REMARK_LENGTH = 500;
    private static final ZoneId ORDER_NUMBER_ZONE = ZoneId.of("Asia/Shanghai");
    private static final DateTimeFormatter ORDER_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");

    private final TradeOrderMapper tradeOrderMapper;
    private final TradeOrderItemMapper tradeOrderItemMapper;
    private final TradeOrderShippingAddressMapper tradeOrderShippingAddressMapper;
    private final ShoppingCartMapper shoppingCartMapper;
    private final ShoppingCartItemMapper shoppingCartItemMapper;
    private final MemberShippingAddressMapper memberShippingAddressMapper;
    private final ProductSkuMapper productSkuMapper;
    private final ProductSpuMapper productSpuMapper;
    private final InventoryStockMapper inventoryStockMapper;
    private final InventoryReservationMapper inventoryReservationMapper;
    private final InventoryLedgerMapper inventoryLedgerMapper;
    private final TradeOrderResultAssembler resultAssembler;

    public TradeOrderServiceImpl(
            TradeOrderMapper tradeOrderMapper,
            TradeOrderItemMapper tradeOrderItemMapper,
            TradeOrderShippingAddressMapper tradeOrderShippingAddressMapper,
            ShoppingCartMapper shoppingCartMapper,
            ShoppingCartItemMapper shoppingCartItemMapper,
            MemberShippingAddressMapper memberShippingAddressMapper,
            ProductSkuMapper productSkuMapper,
            ProductSpuMapper productSpuMapper,
            InventoryStockMapper inventoryStockMapper,
            InventoryReservationMapper inventoryReservationMapper,
            InventoryLedgerMapper inventoryLedgerMapper,
            TradeOrderResultAssembler resultAssembler) {
        this.tradeOrderMapper = tradeOrderMapper;
        this.tradeOrderItemMapper = tradeOrderItemMapper;
        this.tradeOrderShippingAddressMapper = tradeOrderShippingAddressMapper;
        this.shoppingCartMapper = shoppingCartMapper;
        this.shoppingCartItemMapper = shoppingCartItemMapper;
        this.memberShippingAddressMapper = memberShippingAddressMapper;
        this.productSkuMapper = productSkuMapper;
        this.productSpuMapper = productSpuMapper;
        this.inventoryStockMapper = inventoryStockMapper;
        this.inventoryReservationMapper = inventoryReservationMapper;
        this.inventoryLedgerMapper = inventoryLedgerMapper;
        this.resultAssembler = resultAssembler;
    }

    @Override
    @Transactional
    public SubmittedCheckoutResult submitOrder(SubmitOrderCommand rawCommand) {
        NormalizedSubmission command = normalize(rawCommand);
        String requestHash = hashRequest(command);

        tradeOrderMapper.acquireCheckoutLock(command.checkoutNo());
        List<TradeOrder> existingOrders = selectCheckoutOrders(command.checkoutNo());
        if (!existingOrders.isEmpty()) {
            boolean conflict = existingOrders.stream().anyMatch(order ->
                    !command.memberId().equals(order.getMemberId())
                            || !requestHash.equals(order.getRequestHash()));
            if (conflict) {
                throw new BusinessException(TradeOrderErrorCode.IDEMPOTENCY_CONFLICT);
            }
            return resultAssembler.toSubmittedCheckoutResult(command.checkoutNo(), existingOrders);
        }

        ShoppingCart cart = lockActiveCart(command);
        List<ShoppingCartItem> allCartItems = lockCartItems(cart.getId());
        List<ShoppingCartItem> selectedItems = requireRequestedSelection(command, allCartItems);
        MemberShippingAddress address = lockAddress(command);
        List<ValidatedLine> validatedLines = validateProducts(selectedItems);

        Instant now = Instant.now();
        Map<Long, List<ValidatedLine>> linesByShop = validatedLines.stream()
                .collect(Collectors.groupingBy(
                        line -> line.product().getShopId(),
                        TreeMap::new,
                        Collectors.toList()));

        List<TradeOrder> createdOrders = new ArrayList<>(linesByShop.size());
        for (Map.Entry<Long, List<ValidatedLine>> shopEntry : linesByShop.entrySet()) {
            TradeOrder order = createOrder(
                    command, requestHash, cart.getId(), shopEntry.getKey(), shopEntry.getValue(), now);
            tradeOrderMapper.insert(order);
            tradeOrderShippingAddressMapper.insert(createAddressSnapshot(order, address, now));
            for (ValidatedLine line : shopEntry.getValue()) {
                TradeOrderItem orderItem = createOrderItem(order, line, now);
                tradeOrderItemMapper.insert(orderItem);
                reserveInventory(order, orderItem, line.sku(), now, command.memberId());
            }
            createdOrders.add(order);
        }

        consumeCartItems(cart, selectedItems, allCartItems.size() - selectedItems.size(), now, command.memberId());
        return resultAssembler.toSubmittedCheckoutResult(command.checkoutNo(), createdOrders);
    }

    private List<TradeOrder> selectCheckoutOrders(String checkoutNo) {
        return tradeOrderMapper.selectList(Wrappers.lambdaQuery(TradeOrder.class)
                .eq(TradeOrder::getCheckoutNo, checkoutNo)
                .orderByAsc(TradeOrder::getShopId)
                .orderByAsc(TradeOrder::getId));
    }

    private ShoppingCart lockActiveCart(NormalizedSubmission command) {
        ShoppingCart cart = shoppingCartMapper.selectOne(Wrappers.lambdaQuery(ShoppingCart.class)
                .eq(ShoppingCart::getId, command.cartId())
                .eq(ShoppingCart::getGuestTokenHash, sha256(command.guestCartToken().getBytes(StandardCharsets.UTF_8)))
                .eq(ShoppingCart::getStatus, ACTIVE_CART)
                .last("FOR UPDATE"));
        if (cart == null) {
            throw new BusinessException(TradeOrderErrorCode.CART_NOT_FOUND);
        }
        return cart;
    }

    private List<ShoppingCartItem> lockCartItems(Long cartId) {
        return shoppingCartItemMapper.selectList(Wrappers.lambdaQuery(ShoppingCartItem.class)
                .eq(ShoppingCartItem::getCartId, cartId)
                .orderByAsc(ShoppingCartItem::getId)
                .last("FOR UPDATE"));
    }

    private List<ShoppingCartItem> requireRequestedSelection(
            NormalizedSubmission command,
            List<ShoppingCartItem> allCartItems) {
        Map<Long, SubmitOrderLineCommand> requestLines = command.items().stream()
                .collect(Collectors.toMap(SubmitOrderLineCommand::cartItemId, Function.identity()));
        List<ShoppingCartItem> selectedItems = allCartItems.stream()
                .filter(item -> Boolean.TRUE.equals(item.getSelected()))
                .toList();
        if (selectedItems.isEmpty() || selectedItems.size() != requestLines.size()) {
            throw new BusinessException(TradeOrderErrorCode.CART_CHANGED);
        }
        for (ShoppingCartItem item : selectedItems) {
            SubmitOrderLineCommand requested = requestLines.get(item.getId());
            if (requested == null
                    || !requested.cartItemVersion().equals(item.getVersion())
                    || !requested.skuId().equals(item.getSkuId())
                    || !requested.quantity().equals(item.getQuantity())) {
                throw new BusinessException(TradeOrderErrorCode.CART_CHANGED);
            }
        }
        return selectedItems;
    }

    private MemberShippingAddress lockAddress(NormalizedSubmission command) {
        MemberShippingAddress address = memberShippingAddressMapper.selectActiveByIdForUpdate(
                command.memberId(), command.shippingAddressId());
        if (address == null) {
            throw new BusinessException(TradeOrderErrorCode.ADDRESS_NOT_FOUND);
        }
        if (!command.shippingAddressVersion().equals(address.getVersion())) {
            throw new BusinessException(TradeOrderErrorCode.ADDRESS_CHANGED);
        }
        return address;
    }

    private List<ValidatedLine> validateProducts(List<ShoppingCartItem> cartItems) {
        List<Long> skuIds = cartItems.stream().map(ShoppingCartItem::getSkuId).toList();
        Map<Long, ProductSku> skus = productSkuMapper.selectList(Wrappers.lambdaQuery(ProductSku.class)
                        .in(ProductSku::getId, skuIds)
                        .last("FOR SHARE"))
                .stream().collect(Collectors.toMap(ProductSku::getId, Function.identity()));
        List<Long> spuIds = cartItems.stream().map(ShoppingCartItem::getSpuId).distinct().toList();
        Map<Long, ProductSpu> products = productSpuMapper.selectList(Wrappers.lambdaQuery(ProductSpu.class)
                        .in(ProductSpu::getId, spuIds)
                        .last("FOR SHARE"))
                .stream().collect(Collectors.toMap(ProductSpu::getId, Function.identity()));

        List<ValidatedLine> validated = new ArrayList<>(cartItems.size());
        try {
            for (ShoppingCartItem cartItem : cartItems) {
                ProductSku sku = skus.get(cartItem.getSkuId());
                ProductSpu product = products.get(cartItem.getSpuId());
                if (sku == null || product == null
                        || !cartItem.getSpuId().equals(sku.getSpuId())
                        || !cartItem.getShopId().equals(product.getShopId())
                        || sku.getStatus() == null || sku.getStatus() != ENABLED_SKU
                        || product.getStatus() == null || product.getStatus() != PUBLISHED_PRODUCT) {
                    throw new BusinessException(TradeOrderErrorCode.PRODUCT_NOT_SALEABLE);
                }
                if (product.getProductType() == null || product.getProductType() != PHYSICAL_PRODUCT) {
                    throw new BusinessException(TradeOrderErrorCode.UNSUPPORTED_PRODUCT_TYPE);
                }
                if (sku.getInventoryMode() == null
                        || (sku.getInventoryMode() != TRACKED_INVENTORY
                        && sku.getInventoryMode() != UNLIMITED_INVENTORY)) {
                    throw new BusinessException(TradeOrderErrorCode.PRODUCT_NOT_SALEABLE);
                }
                long lineAmount = Math.multiplyExact(sku.getSalePriceFen(), cartItem.getQuantity());
                validated.add(new ValidatedLine(cartItem, sku, product, lineAmount));
            }
        } catch (ArithmeticException exception) {
            throw new BusinessException(
                    TradeOrderErrorCode.AMOUNT_OVERFLOW,
                    TradeOrderErrorCode.AMOUNT_OVERFLOW.message(),
                    exception);
        }
        return validated;
    }

    private TradeOrder createOrder(
            NormalizedSubmission command,
            String requestHash,
            Long cartId,
            Long shopId,
            List<ValidatedLine> lines,
            Instant now) {
        long goodsAmount;
        try {
            goodsAmount = lines.stream().mapToLong(ValidatedLine::lineAmountFen)
                    .reduce(0L, Math::addExact);
        } catch (ArithmeticException exception) {
            throw new BusinessException(
                    TradeOrderErrorCode.AMOUNT_OVERFLOW,
                    TradeOrderErrorCode.AMOUNT_OVERFLOW.message(),
                    exception);
        }

        Long orderId = IdWorker.getId();
        boolean zeroAmount = goodsAmount == 0;
        TradeOrder order = new TradeOrder();
        order.setId(orderId);
        order.setOrderNo("PO" + ORDER_DATE_FORMAT.format(now.atZone(ORDER_NUMBER_ZONE)) + orderId);
        order.setCheckoutNo(command.checkoutNo());
        order.setRequestHash(requestHash);
        order.setMemberId(command.memberId());
        order.setShopId(shopId);
        order.setSourceCartId(cartId);
        order.setFulfillmentType(PHYSICAL_FULFILLMENT);
        order.setCurrencyCode("CNY");
        order.setGoodsAmountFen(goodsAmount);
        order.setDiscountAmountFen(0L);
        order.setShippingAmountFen(0L);
        order.setPayableAmountFen(goodsAmount);
        order.setPaidAmountFen(0L);
        order.setBuyerRemark(command.buyerRemark());
        order.setStatus(zeroAmount
                ? TradeOrderStatus.PENDING_FULFILLMENT.code()
                : TradeOrderStatus.PENDING_PAYMENT.code());
        order.setSubmittedAt(now);
        order.setPaymentExpiresAt(zeroAmount ? null : now.plus(30, ChronoUnit.MINUTES));
        order.setPaidAt(zeroAmount ? now : null);
        order.setVersion(0);
        order.setCreatedAt(now);
        order.setCreatedBy(command.memberId());
        order.setUpdatedAt(now);
        order.setUpdatedBy(command.memberId());
        return order;
    }

    private TradeOrderItem createOrderItem(TradeOrder order, ValidatedLine line, Instant now) {
        TradeOrderItem item = new TradeOrderItem();
        item.setId(IdWorker.getId());
        item.setOrderId(order.getId());
        item.setSourceCartItemId(line.cartItem().getId());
        item.setSpuId(line.product().getId());
        item.setSkuId(line.sku().getId());
        item.setProductTypeSnapshot(line.product().getProductType());
        item.setProductNameSnapshot(line.product().getName());
        item.setSkuCodeSnapshot(line.sku().getSkuCode());
        item.setSkuSpecSnapshot(line.sku().getSpecSummary());
        item.setMainImageKeySnapshot(line.sku().getMainImageKey() == null
                ? line.product().getMainImageKey()
                : line.sku().getMainImageKey());
        item.setUnitPriceFen(line.sku().getSalePriceFen());
        item.setQuantity(line.cartItem().getQuantity());
        item.setLineAmountFen(line.lineAmountFen());
        item.setDiscountAmountFen(0L);
        item.setPayableAmountFen(line.lineAmountFen());
        item.setCreatedAt(now);
        item.setCreatedBy(order.getMemberId());
        item.setUpdatedAt(now);
        item.setUpdatedBy(order.getMemberId());
        return item;
    }

    private TradeOrderShippingAddress createAddressSnapshot(
            TradeOrder order,
            MemberShippingAddress source,
            Instant now) {
        TradeOrderShippingAddress address = new TradeOrderShippingAddress();
        address.setId(IdWorker.getId());
        address.setOrderId(order.getId());
        address.setSourceAddressId(source.getId());
        address.setSourceAddressVersion(source.getVersion());
        address.setReceiverName(source.getReceiverName());
        address.setReceiverMobile(source.getReceiverMobile());
        address.setCountryCode(source.getCountryCode());
        address.setProvinceCode(source.getProvinceCode());
        address.setProvinceName(source.getProvinceName());
        address.setCityCode(source.getCityCode());
        address.setCityName(source.getCityName());
        address.setDistrictCode(source.getDistrictCode());
        address.setDistrictName(source.getDistrictName());
        address.setDetailAddress(source.getDetailAddress());
        address.setPostalCode(source.getPostalCode());
        address.setCreatedAt(now);
        address.setCreatedBy(order.getMemberId());
        address.setUpdatedAt(now);
        address.setUpdatedBy(order.getMemberId());
        return address;
    }

    private void reserveInventory(
            TradeOrder order,
            TradeOrderItem orderItem,
            ProductSku sku,
            Instant now,
            Long operatorId) {
        if (sku.getInventoryMode() == UNLIMITED_INVENTORY) {
            return;
        }
        boolean deductImmediately = order.getStatus() == TradeOrderStatus.PENDING_FULFILLMENT.code();
        long remainingQuantity = orderItem.getQuantity();
        List<InventoryStock> stocks = inventoryStockMapper.selectAvailableStocksForUpdate(
                order.getShopId(), sku.getId());
        for (InventoryStock stock : stocks) {
            long availableQuantity = stock.getOnHandQuantity() - stock.getReservedQuantity();
            long allocatedQuantity = Math.min(remainingQuantity, availableQuantity);
            updateInventoryStock(stock, allocatedQuantity, deductImmediately, operatorId);
            createInventoryRecords(
                    order, orderItem, stock, allocatedQuantity, deductImmediately, now, operatorId);
            remainingQuantity -= allocatedQuantity;
            if (remainingQuantity == 0) {
                return;
            }
        }
        throw new BusinessException(TradeOrderErrorCode.INVENTORY_INSUFFICIENT);
    }

    private void updateInventoryStock(
            InventoryStock stock,
            long quantity,
            boolean deductImmediately,
            Long operatorId) {
        int updated = deductImmediately
                ? inventoryStockMapper.deductAvailable(
                        stock.getId(), quantity, stock.getVersion(), operatorId)
                : inventoryStockMapper.reserve(
                        stock.getId(), quantity, stock.getVersion(), operatorId);
        if (updated != 1) {
            throw new BusinessException(TradeOrderErrorCode.INVENTORY_INSUFFICIENT);
        }
    }

    private void createInventoryRecords(
            TradeOrder order,
            TradeOrderItem orderItem,
            InventoryStock stock,
            long quantity,
            boolean deductImmediately,
            Instant now,
            Long operatorId) {
        Long reservationId = IdWorker.getId();
        InventoryReservation reservation = new InventoryReservation();
        reservation.setId(reservationId);
        reservation.setReservationNo("OR-" + reservationId);
        reservation.setStockId(stock.getId());
        reservation.setOrderId(order.getId());
        reservation.setOrderItemId(orderItem.getId());
        reservation.setQuantity(quantity);
        reservation.setStatus(deductImmediately ? DEDUCTED_INVENTORY : RESERVED_INVENTORY);
        reservation.setExpiresAt(order.getPaymentExpiresAt() == null
                ? now.plus(1, ChronoUnit.DAYS)
                : order.getPaymentExpiresAt());
        reservation.setClosedAt(deductImmediately ? now : null);
        reservation.setVersion(0);
        reservation.setCreatedAt(now);
        reservation.setCreatedBy(operatorId);
        reservation.setUpdatedAt(now);
        reservation.setUpdatedBy(operatorId);
        inventoryReservationMapper.insert(reservation);

        InventoryLedger ledger = new InventoryLedger();
        ledger.setId(IdWorker.getId());
        ledger.setTransactionNo((deductImmediately ? "DEDUCT-" : "RESERVE-") + reservationId);
        ledger.setStockId(stock.getId());
        ledger.setReservationId(reservationId);
        ledger.setChangeType(deductImmediately ? OUTBOUND_LEDGER_CHANGE : RESERVATION_LEDGER_CHANGE);
        ledger.setOnHandDelta(deductImmediately ? -quantity : 0L);
        ledger.setReservedDelta(deductImmediately ? 0L : quantity);
        ledger.setOnHandAfter(stock.getOnHandQuantity() - (deductImmediately ? quantity : 0L));
        ledger.setReservedAfter(stock.getReservedQuantity()
                + (deductImmediately ? 0L : quantity));
        ledger.setReferenceType("ORDER");
        ledger.setReferenceId(order.getId());
        ledger.setRemark(deductImmediately ? "零元订单库存扣减" : "订单库存预占");
        ledger.setOccurredAt(now);
        ledger.setCreatedAt(now);
        ledger.setCreatedBy(operatorId);
        ledger.setUpdatedAt(now);
        ledger.setUpdatedBy(operatorId);
        inventoryLedgerMapper.insert(ledger);
    }

    private void consumeCartItems(
            ShoppingCart cart,
            List<ShoppingCartItem> selectedItems,
            int remainingItemCount,
            Instant now,
            Long operatorId) {
        List<Long> itemIds = selectedItems.stream().map(ShoppingCartItem::getId).toList();
        int deleted = shoppingCartItemMapper.delete(Wrappers.lambdaQuery(ShoppingCartItem.class)
                .eq(ShoppingCartItem::getCartId, cart.getId())
                .in(ShoppingCartItem::getId, itemIds));
        if (deleted != itemIds.size()) {
            throw new BusinessException(TradeOrderErrorCode.CART_CHANGED);
        }

        var update = Wrappers.lambdaUpdate(ShoppingCart.class)
                .eq(ShoppingCart::getId, cart.getId())
                .eq(ShoppingCart::getStatus, ACTIVE_CART)
                .eq(ShoppingCart::getVersion, cart.getVersion())
                .set(ShoppingCart::getLastActivityAt, now)
                .set(ShoppingCart::getUpdatedAt, now)
                .set(ShoppingCart::getUpdatedBy, operatorId)
                .setSql("version = version + 1");
        if (remainingItemCount == 0) {
            update.set(ShoppingCart::getStatus, CHECKED_OUT_CART)
                    .set(ShoppingCart::getClosedAt, now);
        }
        if (shoppingCartMapper.update(null, update) != 1) {
            throw new BusinessException(TradeOrderErrorCode.CART_CHANGED);
        }
    }

    private static NormalizedSubmission normalize(SubmitOrderCommand command) {
        if (command == null) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "订单请求不能为空");
        }
        requirePositiveId(command.memberId(), "会员 ID");
        requirePositiveId(command.cartId(), "购物车 ID");
        requirePositiveId(command.shippingAddressId(), "收货地址 ID");
        if (command.guestCartToken() == null
                || command.guestCartToken().length() < 32
                || command.guestCartToken().length() > 256) {
            throw new BusinessException(TradeOrderErrorCode.CART_NOT_FOUND);
        }
        if (command.shippingAddressVersion() == null || command.shippingAddressVersion() < 0) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "收货地址版本号无效");
        }
        if (command.items() == null || command.items().isEmpty() || command.items().size() > MAX_ORDER_ITEMS) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "订单商品数量必须在 1 到 100 之间");
        }

        List<SubmitOrderLineCommand> normalizedItems = command.items().stream()
                .peek(TradeOrderServiceImpl::validateLine)
                .sorted(Comparator.comparing(SubmitOrderLineCommand::cartItemId))
                .toList();
        if (normalizedItems.stream().map(SubmitOrderLineCommand::cartItemId).distinct().count()
                != normalizedItems.size()) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "订单商品不能重复");
        }

        String rawIdempotencyKey = command.idempotencyKey() == null ? "" : command.idempotencyKey().trim();
        String checkoutNo;
        try {
            checkoutNo = UUID.fromString(rawIdempotencyKey).toString();
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(TradeOrderErrorCode.INVALID_IDEMPOTENCY_KEY);
        }
        if (!checkoutNo.equalsIgnoreCase(rawIdempotencyKey)) {
            throw new BusinessException(TradeOrderErrorCode.INVALID_IDEMPOTENCY_KEY);
        }

        String buyerRemark = command.buyerRemark() == null ? null : command.buyerRemark().trim();
        if (buyerRemark != null && buyerRemark.isEmpty()) {
            buyerRemark = null;
        }
        if (buyerRemark != null && buyerRemark.length() > MAX_BUYER_REMARK_LENGTH) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "订单备注不能超过 500 字符");
        }
        return new NormalizedSubmission(
                command.memberId(), command.guestCartToken(), checkoutNo, command.cartId(),
                command.shippingAddressId(), command.shippingAddressVersion(),
                List.copyOf(normalizedItems), buyerRemark);
    }

    private static void validateLine(SubmitOrderLineCommand line) {
        if (line == null) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "订单商品不能为空");
        }
        requirePositiveId(line.cartItemId(), "购物车项 ID");
        requirePositiveId(line.skuId(), "SKU ID");
        if (line.cartItemVersion() == null || line.cartItemVersion() < 0) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "购物车项版本号无效");
        }
        if (line.quantity() == null || line.quantity() < 1 || line.quantity() > MAX_ITEM_QUANTITY) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "商品数量必须在 1 到 999 之间");
        }
    }

    private static void requirePositiveId(Long value, String fieldName) {
        if (value == null || value <= 0) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, fieldName + "必须大于 0");
        }
    }

    private static String hashRequest(NormalizedSubmission command) {
        try {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (DataOutputStream output = new DataOutputStream(bytes)) {
                output.writeLong(command.memberId());
                output.writeLong(command.cartId());
                output.writeLong(command.shippingAddressId());
                output.writeInt(command.shippingAddressVersion());
                output.writeInt(command.items().size());
                for (SubmitOrderLineCommand line : command.items()) {
                    output.writeLong(line.cartItemId());
                    output.writeInt(line.cartItemVersion());
                    output.writeLong(line.skuId());
                    output.writeLong(line.quantity());
                }
                output.writeBoolean(command.buyerRemark() != null);
                if (command.buyerRemark() != null) {
                    output.writeUTF(command.buyerRemark());
                }
            }
            return sha256(bytes.toByteArray());
        } catch (IOException exception) {
            throw new IllegalStateException("无法规范化订单请求", exception);
        }
    }

    private static String sha256(byte[] value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(value);
            StringBuilder result = new StringBuilder(64);
            for (byte item : digest) {
                result.append(String.format("%02x", item));
            }
            return result.toString();
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 不可用", exception);
        }
    }

    private record NormalizedSubmission(
            Long memberId,
            String guestCartToken,
            String checkoutNo,
            Long cartId,
            Long shippingAddressId,
            Integer shippingAddressVersion,
            List<SubmitOrderLineCommand> items,
            String buyerRemark) {
    }

    private record ValidatedLine(
            ShoppingCartItem cartItem,
            ProductSku sku,
            ProductSpu product,
            long lineAmountFen) {
    }
}
