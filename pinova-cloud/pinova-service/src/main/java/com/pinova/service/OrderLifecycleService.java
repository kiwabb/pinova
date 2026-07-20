package com.pinova.service;
import com.pinova.service.command.*;
import com.pinova.service.model.*;
public interface OrderLifecycleService {
    OrderLifecycleResult ship(ShipOrderCommand command);
    OrderLifecycleResult correctShipment(CorrectOrderShipmentCommand command);
    OrderLifecycleResult confirmReceipt(Long memberId, String orderNo, String requestKey);
    OrderLifecycleResult forceComplete(AuthenticatedAdminResult admin, String orderNo, String requestKey, String reason);
    int completeExpiredShipments(int limit);
}
