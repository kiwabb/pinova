package com.pinova.service.impl;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.pinova.common.error.BusinessException;
import com.pinova.common.error.CommonErrorCode;
import com.pinova.mapper.InventoryLedgerMapper;
import com.pinova.mapper.InventoryReservationMapper;
import com.pinova.mapper.InventoryStockMapper;
import com.pinova.mapper.PaymentOrderMapper;
import com.pinova.mapper.PaymentOrderTradeOrderMapper;
import com.pinova.mapper.TradeOrderMapper;
import com.pinova.pojo.entity.InventoryLedger;
import com.pinova.pojo.entity.InventoryReservation;
import com.pinova.pojo.entity.InventoryStock;
import com.pinova.pojo.entity.PaymentOrder;
import com.pinova.pojo.entity.PaymentOrderTradeOrder;
import com.pinova.pojo.entity.TradeOrder;
import com.pinova.service.PaymentOrderService;
import com.pinova.service.assembler.PaymentOrderResultAssembler;
import com.pinova.service.command.CreatePaymentCommand;
import com.pinova.service.command.SimulatePaymentResultCommand;
import com.pinova.service.error.PaymentErrorCode;
import com.pinova.service.model.PaymentOrderResult;
import com.pinova.service.model.PaymentOrderStatus;
import com.pinova.service.model.TradeOrderStatus;
import com.pinova.service.payment.LocalMockPaymentProvider;
import com.pinova.service.payment.PaymentConsistencyException;
import com.pinova.service.payment.PaymentProvider;
import com.pinova.service.payment.PaymentProviderRegistry;
import com.pinova.service.payment.PaymentResultProcessor;
import com.pinova.service.payment.PaymentReviewMarker;
import com.pinova.service.payment.ProviderPaymentCommand;
import com.pinova.service.payment.ProviderPaymentResult;
import com.pinova.service.payment.ProviderPaymentStatus;
import com.pinova.service.payment.SimulatedPaymentProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.UUID;

@Service
public class PaymentOrderServiceImpl implements PaymentOrderService {

    private static final short RESERVED_INVENTORY = 0;
    private static final short RELEASE_LEDGER_CHANGE = 4;
    private static final int MAX_EXPIRATION_BATCH = 500;
    private static final DateTimeFormatter PAYMENT_DATE_FORMAT =
            DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final ZoneId PAYMENT_NUMBER_ZONE = ZoneId.of("Asia/Shanghai");

    private final PaymentOrderMapper paymentOrderMapper;
    private final PaymentOrderTradeOrderMapper paymentLinkMapper;
    private final TradeOrderMapper tradeOrderMapper;
    private final InventoryReservationMapper reservationMapper;
    private final InventoryStockMapper stockMapper;
    private final InventoryLedgerMapper ledgerMapper;
    private final PaymentProviderRegistry providerRegistry;
    private final PaymentResultProcessor resultProcessor;
    private final PaymentReviewMarker reviewMarker;

    public PaymentOrderServiceImpl(
            PaymentOrderMapper paymentOrderMapper,
            PaymentOrderTradeOrderMapper paymentLinkMapper,
            TradeOrderMapper tradeOrderMapper,
            InventoryReservationMapper reservationMapper,
            InventoryStockMapper stockMapper,
            InventoryLedgerMapper ledgerMapper,
            PaymentProviderRegistry providerRegistry,
            PaymentResultProcessor resultProcessor,
            PaymentReviewMarker reviewMarker) {
        this.paymentOrderMapper = paymentOrderMapper;
        this.paymentLinkMapper = paymentLinkMapper;
        this.tradeOrderMapper = tradeOrderMapper;
        this.reservationMapper = reservationMapper;
        this.stockMapper = stockMapper;
        this.ledgerMapper = ledgerMapper;
        this.providerRegistry = providerRegistry;
        this.resultProcessor = resultProcessor;
        this.reviewMarker = reviewMarker;
    }

    @Override
    @Transactional
    public PaymentOrderResult createPayment(CreatePaymentCommand command) {
        requireMember(command == null ? null : command.memberId());
        String checkoutNo = normalizeCheckoutNo(command.checkoutNo());
        Long memberId = command.memberId();
        Instant now = Instant.now();

        tradeOrderMapper.acquireCheckoutLock(checkoutNo);
        List<TradeOrder> orders = tradeOrderMapper.selectCheckoutOrdersForUpdate(checkoutNo);
        if (orders.isEmpty() || orders.stream().anyMatch(order -> !memberId.equals(order.getMemberId()))) {
            throw new BusinessException(PaymentErrorCode.CHECKOUT_NOT_FOUND);
        }

        PaymentOrder existing = paymentOrderMapper.selectByCheckoutNoForUpdate(checkoutNo);
        if (existing != null) {
            if (!memberId.equals(existing.getMemberId())) {
                throw new BusinessException(PaymentErrorCode.CHECKOUT_NOT_FOUND);
            }
            PaymentOrderStatus status = PaymentOrderStatus.fromCode(existing.getStatus());
            if (status != PaymentOrderStatus.FAILED) {
                if (status == PaymentOrderStatus.PENDING && !existing.getExpiresAt().isAfter(now)) {
                    throw new BusinessException(PaymentErrorCode.PAYMENT_EXPIRED);
                }
                return toResult(existing);
            }
        }

        List<TradeOrder> payableOrders = orders.stream()
                .filter(order -> order.getPayableAmountFen() > 0)
                .toList();
        if (payableOrders.isEmpty()) {
            throw new BusinessException(PaymentErrorCode.PAYMENT_NOT_REQUIRED);
        }
        if (payableOrders.stream().anyMatch(order ->
                order.getStatus() != TradeOrderStatus.PENDING_PAYMENT.code())) {
            throw new BusinessException(PaymentErrorCode.ORDER_NOT_PAYABLE);
        }
        String currencyCode = payableOrders.getFirst().getCurrencyCode();
        if (payableOrders.stream().anyMatch(order -> !currencyCode.equals(order.getCurrencyCode()))) {
            throw new BusinessException(PaymentErrorCode.PAYMENT_STATE_CONFLICT, "同一次结算的订单币种不一致");
        }
        long amountFen = sumPayableAmount(payableOrders);
        if (existing != null && (existing.getAmountFen() != amountFen
                || !existing.getCurrencyCode().equals(currencyCode))) {
            throw new BusinessException(PaymentErrorCode.PAYMENT_STATE_CONFLICT);
        }
        Instant expiresAt = payableOrders.stream()
                .map(TradeOrder::getPaymentExpiresAt)
                .filter(Objects::nonNull)
                .min(Instant::compareTo)
                .orElseThrow(() -> new BusinessException(
                        PaymentErrorCode.PAYMENT_STATE_CONFLICT, "待支付订单缺少支付有效期"));
        if (!expiresAt.isAfter(now)) {
            throw new BusinessException(PaymentErrorCode.PAYMENT_EXPIRED);
        }

        PaymentProvider provider = providerRegistry.require(LocalMockPaymentProvider.PROVIDER_CODE);
        if (existing == null) {
            return createNewPayment(
                    checkoutNo, memberId, payableOrders, currencyCode,
                    amountFen, expiresAt, provider, now);
        }
        return retryPayment(existing, payableOrders, provider, expiresAt, now);
    }

    @Override
    @Transactional(readOnly = true)
    public PaymentOrderResult getPayment(Long memberId, String paymentNo) {
        requireMember(memberId);
        PaymentOrder payment = selectMemberPayment(memberId, normalizePaymentNo(paymentNo));
        return toResult(payment);
    }

    @Override
    public PaymentOrderResult refreshPayment(Long memberId, String paymentNo) {
        requireMember(memberId);
        PaymentOrder payment = selectMemberPayment(memberId, normalizePaymentNo(paymentNo));
        PaymentProvider provider = providerRegistry.require(payment.getProviderCode());
        ProviderPaymentResult providerResult = provider.queryPayment(
                toProviderCommand(payment), payment.getProviderTransactionNo());
        applyProviderResult(payment.getPaymentNo(), providerResult);
        return getPayment(memberId, payment.getPaymentNo());
    }

    @Override
    public PaymentOrderResult simulatePayment(SimulatePaymentResultCommand command) {
        requireMember(command == null ? null : command.memberId());
        String paymentNo = normalizePaymentNo(command.paymentNo());
        PaymentOrder payment = selectMemberPayment(command.memberId(), paymentNo);
        PaymentOrderStatus currentStatus = PaymentOrderStatus.fromCode(payment.getStatus());
        if (currentStatus == PaymentOrderStatus.SUCCEEDED) {
            return toResult(payment);
        }
        if (currentStatus != PaymentOrderStatus.PENDING) {
            throw new BusinessException(PaymentErrorCode.PAYMENT_STATE_CONFLICT);
        }

        PaymentProvider provider = providerRegistry.require(payment.getProviderCode());
        if (!(provider instanceof SimulatedPaymentProvider simulatedProvider)) {
            throw new BusinessException(PaymentErrorCode.MOCK_PROVIDER_DISABLED);
        }
        ProviderPaymentStatus outcome = parseSimulationOutcome(command.outcome());
        simulatedProvider.simulateResult(
                toProviderCommand(payment), payment.getProviderTransactionNo(), outcome);
        return refreshPayment(command.memberId(), paymentNo);
    }

    @Override
    @Transactional
    public int closeExpiredCheckouts(int requestedLimit) {
        int limit = Math.max(1, Math.min(requestedLimit, MAX_EXPIRATION_BATCH));
        Instant now = Instant.now();
        List<String> checkoutNos = tradeOrderMapper.selectExpiredCheckoutNos(now, limit);
        int closed = 0;
        for (String checkoutNo : checkoutNos) {
            tradeOrderMapper.acquireCheckoutLock(checkoutNo);
            List<TradeOrder> orders = tradeOrderMapper.selectCheckoutOrdersForUpdate(checkoutNo);
            List<TradeOrder> pendingOrders = orders.stream()
                    .filter(order -> order.getStatus() == TradeOrderStatus.PENDING_PAYMENT.code())
                    .toList();
            if (pendingOrders.isEmpty()
                    || pendingOrders.stream().noneMatch(order ->
                            order.getPaymentExpiresAt() != null
                                    && !order.getPaymentExpiresAt().isAfter(now))) {
                continue;
            }
            PaymentOrder payment = paymentOrderMapper.selectByCheckoutNoForUpdate(checkoutNo);
            if (payment != null && (payment.getStatus() == PaymentOrderStatus.SUCCEEDED.code()
                    || payment.getStatus() == PaymentOrderStatus.REVIEW_REQUIRED.code())) {
                continue;
            }
            closeProviderPayment(payment);
            releaseReservations(pendingOrders, now);
            for (TradeOrder order : pendingOrders) {
                if (tradeOrderMapper.closeExpired(
                        order.getId(), order.getVersion(), now, 0L) != 1) {
                    throw new BusinessException(PaymentErrorCode.PAYMENT_STATE_CONFLICT);
                }
            }
            closePaymentRecord(payment, now);
            closed++;
        }
        return closed;
    }

    private PaymentOrderResult createNewPayment(
            String checkoutNo,
            Long memberId,
            List<TradeOrder> orders,
            String currencyCode,
            long amountFen,
            Instant expiresAt,
            PaymentProvider provider,
            Instant now) {
        Long paymentId = IdWorker.getId();
        String paymentNo = "PY" + PAYMENT_DATE_FORMAT.format(now.atZone(PAYMENT_NUMBER_ZONE)) + paymentId;
        ProviderPaymentCommand providerCommand = new ProviderPaymentCommand(
                paymentNo, amountFen, currencyCode, 1, expiresAt);
        ProviderPaymentResult providerResult = provider.createPayment(providerCommand);
        if (providerResult.status() != ProviderPaymentStatus.PENDING) {
            throw new BusinessException(PaymentErrorCode.PROVIDER_UNAVAILABLE);
        }

        PaymentOrder payment = new PaymentOrder();
        payment.setId(paymentId);
        payment.setPaymentNo(paymentNo);
        payment.setCheckoutNo(checkoutNo);
        payment.setMemberId(memberId);
        payment.setProviderCode(provider.code());
        payment.setProviderTransactionNo(providerResult.providerTransactionNo());
        payment.setCurrencyCode(currencyCode);
        payment.setAmountFen(amountFen);
        payment.setStatus(PaymentOrderStatus.PENDING.code());
        payment.setAttemptCount(1);
        payment.setExpiresAt(expiresAt);
        payment.setVersion(0);
        payment.setCreatedAt(now);
        payment.setCreatedBy(memberId);
        payment.setUpdatedAt(now);
        payment.setUpdatedBy(memberId);
        paymentOrderMapper.insert(payment);

        for (TradeOrder order : orders) {
            PaymentOrderTradeOrder link = new PaymentOrderTradeOrder();
            link.setId(IdWorker.getId());
            link.setPaymentOrderId(paymentId);
            link.setTradeOrderId(order.getId());
            link.setOrderAmountFen(order.getPayableAmountFen());
            link.setCreatedAt(now);
            link.setCreatedBy(memberId);
            link.setUpdatedAt(now);
            link.setUpdatedBy(memberId);
            paymentLinkMapper.insert(link);
        }
        return PaymentOrderResultAssembler.toResult(payment, orders.size(), true);
    }

    private PaymentOrderResult retryPayment(
            PaymentOrder payment,
            List<TradeOrder> orders,
            PaymentProvider provider,
            Instant expiresAt,
            Instant now) {
        int attemptCount = Math.addExact(payment.getAttemptCount(), 1);
        ProviderPaymentCommand providerCommand = new ProviderPaymentCommand(
                payment.getPaymentNo(), payment.getAmountFen(), payment.getCurrencyCode(),
                attemptCount, expiresAt);
        ProviderPaymentResult providerResult = provider.createPayment(providerCommand);
        if (providerResult.status() != ProviderPaymentStatus.PENDING) {
            throw new BusinessException(PaymentErrorCode.PROVIDER_UNAVAILABLE);
        }
        long linkedOrderCount = paymentLinkMapper.selectCount(
                Wrappers.lambdaQuery(PaymentOrderTradeOrder.class)
                        .eq(PaymentOrderTradeOrder::getPaymentOrderId, payment.getId()));
        if (linkedOrderCount != orders.size()) {
            throw new BusinessException(PaymentErrorCode.PAYMENT_STATE_CONFLICT);
        }
        int updated = paymentOrderMapper.update(null, Wrappers.lambdaUpdate(PaymentOrder.class)
                .eq(PaymentOrder::getId, payment.getId())
                .eq(PaymentOrder::getVersion, payment.getVersion())
                .eq(PaymentOrder::getStatus, PaymentOrderStatus.FAILED.code())
                .set(PaymentOrder::getProviderTransactionNo, providerResult.providerTransactionNo())
                .set(PaymentOrder::getStatus, PaymentOrderStatus.PENDING.code())
                .set(PaymentOrder::getAttemptCount, attemptCount)
                .set(PaymentOrder::getExpiresAt, expiresAt)
                .set(PaymentOrder::getLastQueriedAt, null)
                .set(PaymentOrder::getPaidAt, null)
                .set(PaymentOrder::getFailedAt, null)
                .set(PaymentOrder::getClosedAt, null)
                .set(PaymentOrder::getReviewRequiredAt, null)
                .set(PaymentOrder::getFailureCode, null)
                .set(PaymentOrder::getFailureMessage, null)
                .set(PaymentOrder::getUpdatedAt, now)
                .set(PaymentOrder::getUpdatedBy, payment.getMemberId())
                .setSql("version = version + 1"));
        if (updated != 1) {
            throw new BusinessException(PaymentErrorCode.PAYMENT_STATE_CONFLICT);
        }
        return toResult(paymentOrderMapper.selectByCheckoutNoForUpdate(payment.getCheckoutNo()));
    }

    private void applyProviderResult(String paymentNo, ProviderPaymentResult providerResult) {
        try {
            resultProcessor.apply(paymentNo, providerResult);
        } catch (PaymentConsistencyException exception) {
            ProviderPaymentResult reviewResult = exception.providerResult() == null
                    ? providerResult
                    : exception.providerResult();
            reviewMarker.mark(
                    paymentNo,
                    reviewResult,
                    exception.failureCode(),
                    exception.getMessage());
            throw new BusinessException(PaymentErrorCode.REVIEW_REQUIRED);
        }
    }

    private void closeProviderPayment(PaymentOrder payment) {
        if (payment == null || payment.getStatus() != PaymentOrderStatus.PENDING.code()
                || payment.getProviderTransactionNo() == null) {
            return;
        }
        providerRegistry.find(payment.getProviderCode())
                .filter(PaymentProvider::isEnabled)
                .ifPresent(provider -> provider.closePayment(
                        toProviderCommand(payment), payment.getProviderTransactionNo()));
    }

    private void closePaymentRecord(PaymentOrder payment, Instant closedAt) {
        if (payment == null || payment.getStatus() == PaymentOrderStatus.CLOSED.code()) {
            return;
        }
        int updated = paymentOrderMapper.update(null, Wrappers.lambdaUpdate(PaymentOrder.class)
                .eq(PaymentOrder::getId, payment.getId())
                .eq(PaymentOrder::getVersion, payment.getVersion())
                .in(PaymentOrder::getStatus,
                        PaymentOrderStatus.PENDING.code(), PaymentOrderStatus.FAILED.code())
                .set(PaymentOrder::getStatus, PaymentOrderStatus.CLOSED.code())
                .set(PaymentOrder::getLastQueriedAt, null)
                .set(PaymentOrder::getPaidAt, null)
                .set(PaymentOrder::getFailedAt, null)
                .set(PaymentOrder::getClosedAt, closedAt)
                .set(PaymentOrder::getReviewRequiredAt, null)
                .set(PaymentOrder::getFailureCode, null)
                .set(PaymentOrder::getFailureMessage, null)
                .set(PaymentOrder::getUpdatedAt, closedAt)
                .set(PaymentOrder::getUpdatedBy, 0L)
                .setSql("version = version + 1"));
        if (updated != 1) {
            throw new BusinessException(PaymentErrorCode.PAYMENT_STATE_CONFLICT);
        }
    }

    private void releaseReservations(List<TradeOrder> orders, Instant closedAt) {
        List<Long> orderIds = orders.stream().map(TradeOrder::getId).toList();
        List<InventoryReservation> reservations = reservationMapper.selectList(
                Wrappers.lambdaQuery(InventoryReservation.class)
                        .in(InventoryReservation::getOrderId, orderIds)
                        .eq(InventoryReservation::getStatus, RESERVED_INVENTORY)
                        .orderByAsc(InventoryReservation::getStockId)
                        .orderByAsc(InventoryReservation::getId)
                        .last("FOR UPDATE"));
        for (InventoryReservation reservation : reservations) {
            InventoryStock stock = stockMapper.selectByIdForUpdate(reservation.getStockId());
            if (stock == null || stockMapper.releaseReserved(
                    stock.getId(), reservation.getQuantity(), stock.getVersion(),
                    closedAt, 0L) != 1) {
                throw new BusinessException(PaymentErrorCode.PAYMENT_STATE_CONFLICT);
            }
            if (reservationMapper.markExpired(
                    reservation.getId(), reservation.getVersion(), closedAt, 0L) != 1) {
                throw new BusinessException(PaymentErrorCode.PAYMENT_STATE_CONFLICT);
            }
            InventoryLedger ledger = new InventoryLedger();
            ledger.setId(IdWorker.getId());
            ledger.setTransactionNo("EXPIRE-PAY-" + reservation.getId());
            ledger.setStockId(stock.getId());
            ledger.setReservationId(reservation.getId());
            ledger.setChangeType(RELEASE_LEDGER_CHANGE);
            ledger.setOnHandDelta(0L);
            ledger.setReservedDelta(-reservation.getQuantity());
            ledger.setOnHandAfter(stock.getOnHandQuantity());
            ledger.setReservedAfter(stock.getReservedQuantity() - reservation.getQuantity());
            ledger.setReferenceType("ORDER");
            ledger.setReferenceId(reservation.getOrderId());
            ledger.setRemark("支付超时，释放库存预占");
            ledger.setOccurredAt(closedAt);
            ledger.setCreatedAt(closedAt);
            ledger.setCreatedBy(0L);
            ledger.setUpdatedAt(closedAt);
            ledger.setUpdatedBy(0L);
            ledgerMapper.insert(ledger);
        }
    }

    private PaymentOrder selectMemberPayment(Long memberId, String paymentNo) {
        PaymentOrder payment = paymentOrderMapper.selectOne(
                Wrappers.lambdaQuery(PaymentOrder.class)
                        .eq(PaymentOrder::getPaymentNo, paymentNo)
                        .eq(PaymentOrder::getMemberId, memberId));
        if (payment == null) {
            throw new BusinessException(PaymentErrorCode.PAYMENT_NOT_FOUND);
        }
        return payment;
    }

    private PaymentOrderResult toResult(PaymentOrder payment) {
        long count = paymentLinkMapper.selectCount(
                Wrappers.lambdaQuery(PaymentOrderTradeOrder.class)
                        .eq(PaymentOrderTradeOrder::getPaymentOrderId, payment.getId()));
        boolean mockMode = providerRegistry.find(payment.getProviderCode())
                .filter(PaymentProvider::isEnabled)
                .filter(SimulatedPaymentProvider.class::isInstance)
                .isPresent();
        return PaymentOrderResultAssembler.toResult(payment, Math.toIntExact(count), mockMode);
    }

    private static ProviderPaymentCommand toProviderCommand(PaymentOrder payment) {
        return new ProviderPaymentCommand(
                payment.getPaymentNo(),
                payment.getAmountFen(),
                payment.getCurrencyCode(),
                payment.getAttemptCount(),
                payment.getExpiresAt());
    }

    private static long sumPayableAmount(List<TradeOrder> orders) {
        try {
            return orders.stream().mapToLong(TradeOrder::getPayableAmountFen)
                    .reduce(0L, Math::addExact);
        } catch (ArithmeticException exception) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "支付金额超出支持范围", exception);
        }
    }

    private static ProviderPaymentStatus parseSimulationOutcome(String rawOutcome) {
        if (rawOutcome == null) {
            throw new BusinessException(PaymentErrorCode.INVALID_SIMULATION_OUTCOME);
        }
        return switch (rawOutcome.trim().toUpperCase(Locale.ROOT)) {
            case "SUCCESS", "SUCCEEDED" -> ProviderPaymentStatus.SUCCEEDED;
            case "FAIL", "FAILED" -> ProviderPaymentStatus.FAILED;
            default -> throw new BusinessException(PaymentErrorCode.INVALID_SIMULATION_OUTCOME);
        };
    }

    private static String normalizeCheckoutNo(String rawCheckoutNo) {
        if (rawCheckoutNo == null || rawCheckoutNo.isBlank()) {
            throw new BusinessException(PaymentErrorCode.INVALID_CHECKOUT_NO);
        }
        try {
            String normalized = UUID.fromString(rawCheckoutNo).toString();
            if (!normalized.equalsIgnoreCase(rawCheckoutNo.trim())) {
                throw new BusinessException(PaymentErrorCode.INVALID_CHECKOUT_NO);
            }
            return normalized;
        } catch (IllegalArgumentException exception) {
            throw new BusinessException(PaymentErrorCode.INVALID_CHECKOUT_NO);
        }
    }

    private static String normalizePaymentNo(String paymentNo) {
        if (paymentNo == null || !paymentNo.trim().matches("^PY[0-9]{8}[0-9]{10,20}$")) {
            throw new BusinessException(PaymentErrorCode.PAYMENT_NOT_FOUND);
        }
        return paymentNo.trim();
    }

    private static void requireMember(Long memberId) {
        if (memberId == null || memberId <= 0) {
            throw new BusinessException(PaymentErrorCode.PAYMENT_NOT_FOUND);
        }
    }
}
