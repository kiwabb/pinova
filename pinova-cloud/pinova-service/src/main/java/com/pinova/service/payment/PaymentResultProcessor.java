package com.pinova.service.payment;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.pinova.common.error.BusinessException;
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
import com.pinova.service.error.PaymentErrorCode;
import com.pinova.service.model.PaymentOrderStatus;
import com.pinova.service.model.TradeOrderStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class PaymentResultProcessor {

    private static final short RESERVED = 0;
    private static final short OUTBOUND_LEDGER_CHANGE = 2;

    private final PaymentOrderMapper paymentOrderMapper;
    private final PaymentOrderTradeOrderMapper paymentLinkMapper;
    private final TradeOrderMapper tradeOrderMapper;
    private final InventoryReservationMapper reservationMapper;
    private final InventoryStockMapper stockMapper;
    private final InventoryLedgerMapper ledgerMapper;

    public PaymentResultProcessor(
            PaymentOrderMapper paymentOrderMapper,
            PaymentOrderTradeOrderMapper paymentLinkMapper,
            TradeOrderMapper tradeOrderMapper,
            InventoryReservationMapper reservationMapper,
            InventoryStockMapper stockMapper,
            InventoryLedgerMapper ledgerMapper) {
        this.paymentOrderMapper = paymentOrderMapper;
        this.paymentLinkMapper = paymentLinkMapper;
        this.tradeOrderMapper = tradeOrderMapper;
        this.reservationMapper = reservationMapper;
        this.stockMapper = stockMapper;
        this.ledgerMapper = ledgerMapper;
    }

    @Transactional
    public void apply(String paymentNo, ProviderPaymentResult providerResult) {
        PaymentOrder snapshot = paymentOrderMapper.selectOne(
                Wrappers.lambdaQuery(PaymentOrder.class)
                        .eq(PaymentOrder::getPaymentNo, paymentNo));
        if (snapshot == null) {
            throw new BusinessException(PaymentErrorCode.PAYMENT_NOT_FOUND);
        }
        tradeOrderMapper.acquireCheckoutLock(snapshot.getCheckoutNo());
        PaymentOrder payment = paymentOrderMapper.selectByPaymentNoForUpdate(paymentNo);
        if (payment == null) {
            throw new BusinessException(PaymentErrorCode.PAYMENT_NOT_FOUND);
        }
        validateProviderSnapshot(payment, providerResult);

        PaymentOrderStatus currentStatus = PaymentOrderStatus.fromCode(payment.getStatus());
        if (currentStatus == PaymentOrderStatus.SUCCEEDED) {
            return;
        }
        if (currentStatus == PaymentOrderStatus.REVIEW_REQUIRED) {
            throw new BusinessException(PaymentErrorCode.REVIEW_REQUIRED);
        }
        if (providerResult.status() == ProviderPaymentStatus.PENDING) {
            markQueried(payment, Instant.now());
            return;
        }
        if (providerResult.status() == ProviderPaymentStatus.CLOSED) {
            return;
        }
        if (providerResult.status() == ProviderPaymentStatus.FAILED) {
            if (currentStatus == PaymentOrderStatus.CLOSED) {
                return;
            }
            markFailed(payment, providerResult);
            return;
        }
        if (currentStatus == PaymentOrderStatus.CLOSED) {
            throw consistency("PAYMENT_CLOSED_BEFORE_SUCCESS", "支付已关闭后才收到成功结果", providerResult);
        }
        if (providerResult.occurredAt() == null
                || providerResult.occurredAt().isAfter(payment.getExpiresAt())) {
            throw consistency("PAYMENT_SUCCESS_AFTER_EXPIRY", "支付成功时间晚于订单有效期", providerResult);
        }

        List<PaymentOrderTradeOrder> links = paymentLinkMapper.selectList(
                Wrappers.lambdaQuery(PaymentOrderTradeOrder.class)
                        .eq(PaymentOrderTradeOrder::getPaymentOrderId, payment.getId())
                        .orderByAsc(PaymentOrderTradeOrder::getTradeOrderId)
                        .last("FOR UPDATE"));
        if (links.isEmpty()) {
            throw consistency("PAYMENT_ORDERS_MISSING", "支付单没有关联订单", providerResult);
        }
        List<Long> orderIds = links.stream().map(PaymentOrderTradeOrder::getTradeOrderId).toList();
        List<TradeOrder> orders = tradeOrderMapper.selectList(
                Wrappers.lambdaQuery(TradeOrder.class)
                        .in(TradeOrder::getId, orderIds)
                        .orderByAsc(TradeOrder::getId)
                        .last("FOR UPDATE"));
        if (orders.size() != links.size()) {
            throw consistency("PAYMENT_ORDER_MISSING", "支付单关联的订单不存在", providerResult);
        }
        Map<Long, PaymentOrderTradeOrder> linksByOrder = links.stream()
                .collect(Collectors.toMap(PaymentOrderTradeOrder::getTradeOrderId, Function.identity()));
        long total = 0L;
        for (TradeOrder order : orders) {
            PaymentOrderTradeOrder link = linksByOrder.get(order.getId());
            if (!payment.getMemberId().equals(order.getMemberId())
                    || !payment.getCheckoutNo().equals(order.getCheckoutNo())
                    || order.getStatus() != TradeOrderStatus.PENDING_PAYMENT.code()
                    || !order.getPayableAmountFen().equals(link.getOrderAmountFen())) {
                throw consistency("PAYMENT_ORDER_STATE_CONFLICT", "关联订单状态或金额发生变化", providerResult);
            }
            try {
                total = Math.addExact(total, order.getPayableAmountFen());
            } catch (ArithmeticException exception) {
                throw consistency("PAYMENT_AMOUNT_OVERFLOW", "支付金额超出支持范围", providerResult);
            }
        }
        if (total != payment.getAmountFen()) {
            throw consistency("PAYMENT_AMOUNT_MISMATCH", "支付单金额与订单合计不一致", providerResult);
        }

        List<InventoryReservation> reservations = reservationMapper.selectList(
                Wrappers.lambdaQuery(InventoryReservation.class)
                        .in(InventoryReservation::getOrderId, orderIds)
                        .orderByAsc(InventoryReservation::getStockId)
                        .orderByAsc(InventoryReservation::getId)
                        .last("FOR UPDATE"));
        for (InventoryReservation reservation : reservations) {
            if (reservation.getStatus() != RESERVED) {
                throw consistency("INVENTORY_RESERVATION_STATE_CONFLICT", "库存预占状态发生变化", providerResult);
            }
            deductReservation(reservation, payment.getMemberId(), providerResult.occurredAt());
        }

        for (TradeOrder order : orders) {
            if (tradeOrderMapper.markPaid(
                    order.getId(), order.getVersion(), providerResult.occurredAt(),
                    Instant.now(), payment.getMemberId()) != 1) {
                throw consistency("PAYMENT_ORDER_UPDATE_CONFLICT", "订单状态更新冲突", providerResult);
            }
        }
        markSucceeded(payment, providerResult);
    }

    private void deductReservation(
            InventoryReservation reservation,
            Long operatorId,
            Instant occurredAt) {
        InventoryStock stock = stockMapper.selectByIdForUpdate(reservation.getStockId());
        if (stock == null || stock.getOnHandQuantity() < reservation.getQuantity()
                || stock.getReservedQuantity() < reservation.getQuantity()
                || stockMapper.deductReserved(
                        stock.getId(), reservation.getQuantity(), stock.getVersion(),
                        occurredAt, operatorId) != 1) {
            throw consistency(
                    "INVENTORY_DEDUCT_CONFLICT",
                    "支付成功但库存无法从预占转为扣减",
                    null);
        }
        if (reservationMapper.markDeducted(
                reservation.getId(), reservation.getVersion(), occurredAt, operatorId) != 1) {
            throw consistency("INVENTORY_RESERVATION_UPDATE_CONFLICT", "库存预占更新冲突", null);
        }
        InventoryLedger ledger = new InventoryLedger();
        ledger.setId(com.baomidou.mybatisplus.core.toolkit.IdWorker.getId());
        ledger.setTransactionNo("DEDUCT-PAY-" + reservation.getId());
        ledger.setStockId(stock.getId());
        ledger.setReservationId(reservation.getId());
        ledger.setChangeType(OUTBOUND_LEDGER_CHANGE);
        ledger.setOnHandDelta(-reservation.getQuantity());
        ledger.setReservedDelta(-reservation.getQuantity());
        ledger.setOnHandAfter(stock.getOnHandQuantity() - reservation.getQuantity());
        ledger.setReservedAfter(stock.getReservedQuantity() - reservation.getQuantity());
        ledger.setReferenceType("PAYMENT");
        ledger.setReferenceId(reservation.getOrderId());
        ledger.setRemark("支付成功，库存预占转扣减");
        ledger.setOccurredAt(occurredAt);
        ledger.setCreatedAt(occurredAt);
        ledger.setCreatedBy(0L);
        ledger.setUpdatedAt(occurredAt);
        ledger.setUpdatedBy(0L);
        ledgerMapper.insert(ledger);
    }

    private void validateProviderSnapshot(
            PaymentOrder payment,
            ProviderPaymentResult providerResult) {
        if (providerResult == null
                || providerResult.providerTransactionNo() == null
                || !providerResult.providerTransactionNo().equals(payment.getProviderTransactionNo())
                || providerResult.amountFen() != payment.getAmountFen()
                || !payment.getCurrencyCode().equals(providerResult.currencyCode())) {
            throw consistency("PAYMENT_PROVIDER_SNAPSHOT_MISMATCH", "支付渠道结果与支付单不一致", providerResult);
        }
    }

    private void markQueried(PaymentOrder payment, Instant queriedAt) {
        int updated = paymentOrderMapper.update(null, Wrappers.lambdaUpdate(PaymentOrder.class)
                .eq(PaymentOrder::getId, payment.getId())
                .eq(PaymentOrder::getVersion, payment.getVersion())
                .set(PaymentOrder::getLastQueriedAt, queriedAt)
                .set(PaymentOrder::getUpdatedAt, queriedAt)
                .set(PaymentOrder::getUpdatedBy, 0L)
                .setSql("version = version + 1"));
        if (updated != 1) {
            throw new BusinessException(PaymentErrorCode.PAYMENT_STATE_CONFLICT);
        }
    }

    private void markFailed(PaymentOrder payment, ProviderPaymentResult result) {
        Instant failedAt = result.occurredAt() == null ? Instant.now() : result.occurredAt();
        int updated = paymentOrderMapper.update(null, Wrappers.lambdaUpdate(PaymentOrder.class)
                .eq(PaymentOrder::getId, payment.getId())
                .eq(PaymentOrder::getVersion, payment.getVersion())
                .set(PaymentOrder::getProviderTransactionNo, result.providerTransactionNo())
                .set(PaymentOrder::getStatus, (short) 2)
                .set(PaymentOrder::getLastQueriedAt, Instant.now())
                .set(PaymentOrder::getFailedAt, failedAt)
                .set(PaymentOrder::getFailureCode, result.failureCode() == null ? "PROVIDER_FAILED" : result.failureCode())
                .set(PaymentOrder::getFailureMessage, result.failureMessage())
                .set(PaymentOrder::getUpdatedAt, Instant.now())
                .set(PaymentOrder::getUpdatedBy, 0L)
                .setSql("version = version + 1"));
        if (updated != 1) {
            throw new BusinessException(PaymentErrorCode.PAYMENT_STATE_CONFLICT);
        }
    }

    private void markSucceeded(PaymentOrder payment, ProviderPaymentResult result) {
        Instant now = Instant.now();
        int updated = paymentOrderMapper.update(null, Wrappers.lambdaUpdate(PaymentOrder.class)
                .eq(PaymentOrder::getId, payment.getId())
                .eq(PaymentOrder::getVersion, payment.getVersion())
                .set(PaymentOrder::getProviderTransactionNo, result.providerTransactionNo())
                .set(PaymentOrder::getStatus, (short) 1)
                .set(PaymentOrder::getLastQueriedAt, now)
                .set(PaymentOrder::getPaidAt, result.occurredAt())
                .set(PaymentOrder::getFailedAt, null)
                .set(PaymentOrder::getClosedAt, null)
                .set(PaymentOrder::getReviewRequiredAt, null)
                .set(PaymentOrder::getFailureCode, null)
                .set(PaymentOrder::getFailureMessage, null)
                .set(PaymentOrder::getUpdatedAt, now)
                .set(PaymentOrder::getUpdatedBy, 0L)
                .setSql("version = version + 1"));
        if (updated != 1) {
            throw consistency("PAYMENT_UPDATE_CONFLICT", "支付单状态更新冲突", result);
        }
    }

    private static PaymentConsistencyException consistency(
            String code,
            String message,
            ProviderPaymentResult result) {
        return new PaymentConsistencyException(code, message, result);
    }
}
