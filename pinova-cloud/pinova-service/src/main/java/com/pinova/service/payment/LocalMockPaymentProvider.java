package com.pinova.service.payment;

import com.pinova.common.error.BusinessException;
import com.pinova.service.error.PaymentErrorCode;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LocalMockPaymentProvider implements SimulatedPaymentProvider {

    public static final String PROVIDER_CODE = "MOCK";

    private final Environment environment;
    private final Map<String, ProviderPaymentResult> results = new ConcurrentHashMap<>();
    private final Map<String, ProviderRefundResult> refundResults = new ConcurrentHashMap<>();

    public LocalMockPaymentProvider(Environment environment) {
        this.environment = environment;
    }

    @Override
    public String code() {
        return PROVIDER_CODE;
    }

    @Override
    public boolean isEnabled() {
        return environment.acceptsProfiles(Profiles.of("!prod"))
                && environment.getProperty("pinova.payment.mock-enabled", Boolean.class, false);
    }

    @Override
    public ProviderPaymentResult createPayment(ProviderPaymentCommand command) {
        requireEnabled();
        String transactionNo = "MOCK-" + command.paymentNo() + "-" + command.attemptCount();
        ProviderPaymentResult result = pending(command, transactionNo);
        results.put(transactionNo, result);
        return result;
    }

    @Override
    public ProviderPaymentResult queryPayment(
            ProviderPaymentCommand command,
            String providerTransactionNo) {
        requireEnabled();
        return results.computeIfAbsent(
                providerTransactionNo,
                ignored -> pending(command, providerTransactionNo));
    }

    @Override
    public void closePayment(ProviderPaymentCommand command, String providerTransactionNo) {
        requireEnabled();
        results.compute(providerTransactionNo, (ignored, current) -> {
            if (current != null && current.status() == ProviderPaymentStatus.SUCCEEDED) {
                return current;
            }
            return new ProviderPaymentResult(
                    providerTransactionNo,
                    ProviderPaymentStatus.CLOSED,
                    command.amountFen(),
                    command.currencyCode(),
                    Instant.now(),
                    null,
                    null);
        });
    }

    @Override
    public void simulateResult(
            ProviderPaymentCommand command,
            String providerTransactionNo,
            ProviderPaymentStatus outcome) {
        requireEnabled();
        if (outcome != ProviderPaymentStatus.SUCCEEDED
                && outcome != ProviderPaymentStatus.FAILED) {
            throw new BusinessException(PaymentErrorCode.INVALID_SIMULATION_OUTCOME);
        }
        results.put(providerTransactionNo, new ProviderPaymentResult(
                providerTransactionNo,
                outcome,
                command.amountFen(),
                command.currencyCode(),
                Instant.now(),
                outcome == ProviderPaymentStatus.FAILED ? "MOCK_PAYMENT_FAILED" : null,
                outcome == ProviderPaymentStatus.FAILED ? "模拟支付失败，可重新发起支付" : null));
    }

    @Override
    public ProviderRefundResult createRefund(ProviderRefundCommand command) {
        requireEnabled();
        String providerRefundNo = "MOCK-REFUND-" + command.refundNo() + "-" + command.attemptCount();
        ProviderRefundResult result = new ProviderRefundResult(providerRefundNo,
                ProviderRefundStatus.SUCCEEDED, command.amountFen(), command.currencyCode(),
                Instant.now(), null, null);
        refundResults.put(providerRefundNo, result);
        return result;
    }

    @Override
    public ProviderRefundResult queryRefund(ProviderRefundCommand command, String providerRefundNo) {
        requireEnabled();
        return refundResults.getOrDefault(providerRefundNo, new ProviderRefundResult(
                providerRefundNo, ProviderRefundStatus.FAILED, command.amountFen(), command.currencyCode(),
                Instant.now(), "MOCK_REFUND_NOT_FOUND", "模拟退款记录不存在"));
    }

    private ProviderPaymentResult pending(
            ProviderPaymentCommand command,
            String providerTransactionNo) {
        return new ProviderPaymentResult(
                providerTransactionNo,
                ProviderPaymentStatus.PENDING,
                command.amountFen(),
                command.currencyCode(),
                Instant.now(),
                null,
                null);
    }

    private void requireEnabled() {
        if (!isEnabled()) {
            throw new BusinessException(PaymentErrorCode.MOCK_PROVIDER_DISABLED);
        }
    }
}
