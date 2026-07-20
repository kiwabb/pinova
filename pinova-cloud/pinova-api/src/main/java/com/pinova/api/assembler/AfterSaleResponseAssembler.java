package com.pinova.api.assembler;
import com.pinova.api.response.AfterSaleResponse;import com.pinova.service.model.AfterSaleResult;import org.springframework.stereotype.Component;
@Component public class AfterSaleResponseAssembler {
    public AfterSaleResponse toResponse(AfterSaleResult r){return new AfterSaleResponse(r.afterSaleNo(),r.orderNo(),r.status().name(),r.amountFen(),r.currencyCode(),r.reasonCode(),r.reason(),r.reviewReason(),r.refundNo(),r.refundStatus()==null?null:r.refundStatus().name(),r.version(),r.appliedAt(),r.completedAt());}
}
