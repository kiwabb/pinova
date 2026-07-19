package com.pinova.service.payment;

import com.pinova.common.error.BusinessException;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class LocalMockPaymentProviderTest {

    @Test
    void createsAndQueriesASimulatedSuccess() {
        LocalMockPaymentProvider provider = new LocalMockPaymentProvider(enabledEnvironment());
        ProviderPaymentCommand command = new ProviderPaymentCommand(
                "PY202607191234567890", 5990L, "CNY", 1,
                Instant.now().plusSeconds(600));

        ProviderPaymentResult created = provider.createPayment(command);
        assertEquals(ProviderPaymentStatus.PENDING, created.status());

        provider.simulateResult(
                command, created.providerTransactionNo(), ProviderPaymentStatus.SUCCEEDED);
        ProviderPaymentResult queried = provider.queryPayment(
                command, created.providerTransactionNo());

        assertEquals(ProviderPaymentStatus.SUCCEEDED, queried.status());
        assertEquals(5990L, queried.amountFen());
        assertEquals("CNY", queried.currencyCode());
    }

    @Test
    void remainsDisabledInProductionEvenWhenPropertyIsTrue() {
        StandardEnvironment environment = enabledEnvironment();
        environment.setActiveProfiles("prod");
        LocalMockPaymentProvider provider = new LocalMockPaymentProvider(environment);

        assertTrue(!provider.isEnabled());
        assertThrows(BusinessException.class, () -> provider.createPayment(
                new ProviderPaymentCommand(
                        "PY202607191234567890", 5990L, "CNY", 1,
                        Instant.now().plusSeconds(600))));
    }

    private static StandardEnvironment enabledEnvironment() {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource(
                "payment-test",
                Map.of("pinova.payment.mock-enabled", "true")));
        return environment;
    }
}
