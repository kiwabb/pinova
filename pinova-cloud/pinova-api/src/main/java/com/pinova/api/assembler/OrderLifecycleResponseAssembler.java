package com.pinova.api.assembler;
import com.pinova.api.response.OrderLifecycleResponse;
import com.pinova.service.model.OrderLifecycleResult;
import org.springframework.stereotype.Component;
@Component
public class OrderLifecycleResponseAssembler {
    public OrderLifecycleResponse toResponse(OrderLifecycleResult r){
        return new OrderLifecycleResponse(r.orderNo(),r.status().name(),r.carrierCode(),r.carrierName(),r.trackingNo(),r.shippedAt(),r.autoCompleteAt(),r.completedAt(),r.completionSource());
    }
}
