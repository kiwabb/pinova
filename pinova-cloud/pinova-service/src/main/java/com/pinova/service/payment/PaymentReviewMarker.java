package com.pinova.service.payment;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.pinova.mapper.PaymentOrderMapper;
import com.pinova.pojo.entity.PaymentOrder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class PaymentReviewMarker {

    private final PaymentOrderMapper paymentOrderMapper;

    public PaymentReviewMarker(PaymentOrderMapper paymentOrderMapper) {
        this.paymentOrderMapper = paymentOrderMapper;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void mark(
            String paymentNo,
            ProviderPaymentResult providerResult,
            String failureCode,
            String failureMessage) {
        PaymentOrder payment = paymentOrderMapper.selectByPaymentNoForUpdate(paymentNo);
        if (payment == null || payment.getStatus() == 1 || payment.getStatus() == 4) {
            return;
        }
        Instant now = Instant.now();
        Instant paidAt = providerResult.occurredAt() == null
                ? now
                : providerResult.occurredAt().isBefore(payment.getCreatedAt())
                        ? payment.getCreatedAt()
                        : providerResult.occurredAt();
        paymentOrderMapper.update(null, Wrappers.lambdaUpdate(PaymentOrder.class)
                .eq(PaymentOrder::getId, payment.getId())
                .eq(PaymentOrder::getVersion, payment.getVersion())
                .set(PaymentOrder::getProviderTransactionNo, providerResult.providerTransactionNo())
                .set(PaymentOrder::getStatus, (short) 4)
                .set(PaymentOrder::getLastQueriedAt, now)
                .set(PaymentOrder::getPaidAt, paidAt)
                .set(PaymentOrder::getFailedAt, null)
                .set(PaymentOrder::getClosedAt, null)
                .set(PaymentOrder::getReviewRequiredAt, now)
                .set(PaymentOrder::getFailureCode, failureCode)
                .set(PaymentOrder::getFailureMessage, truncate(failureMessage))
                .set(PaymentOrder::getUpdatedAt, now)
                .set(PaymentOrder::getUpdatedBy, 0L)
                .setSql("version = version + 1"));
    }

    private static String truncate(String value) {
        if (value == null || value.isBlank()) {
            return "支付结果已确认，但订单状态未能安全推进";
        }
        return value.length() <= 255 ? value : value.substring(0, 255);
    }
}
