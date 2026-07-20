package com.pinova.service.payment;
import com.pinova.service.OrderLifecycleService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
@Component
public class OrderAutoCompletionScheduler {
    private final OrderLifecycleService service;
    public OrderAutoCompletionScheduler(OrderLifecycleService service){this.service=service;}
    @Scheduled(fixedDelayString="${pinova.order.auto-complete-scan-delay-ms:60000}")
    public void completeExpiredShipments(){service.completeExpiredShipments(100);}
}
