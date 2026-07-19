package com.pinova.service.payment;

import com.pinova.common.error.BusinessException;
import com.pinova.service.error.PaymentErrorCode;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class PaymentProviderRegistry {

    private final Map<String, PaymentProvider> providers;

    public PaymentProviderRegistry(List<PaymentProvider> providers) {
        this.providers = providers.stream().collect(Collectors.toUnmodifiableMap(
                provider -> provider.code().toUpperCase(Locale.ROOT),
                Function.identity()));
    }

    public PaymentProvider require(String providerCode) {
        PaymentProvider provider = find(providerCode).orElse(null);
        if (provider == null) {
            throw new BusinessException(PaymentErrorCode.PROVIDER_UNAVAILABLE);
        }
        if (!provider.isEnabled()) {
            throw new BusinessException(PaymentErrorCode.MOCK_PROVIDER_DISABLED);
        }
        return provider;
    }

    public Optional<PaymentProvider> find(String providerCode) {
        if (providerCode == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(providers.get(providerCode.toUpperCase(Locale.ROOT)));
    }
}
