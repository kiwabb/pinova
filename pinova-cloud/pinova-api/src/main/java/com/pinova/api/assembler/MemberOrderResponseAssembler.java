package com.pinova.api.assembler;

import com.pinova.api.media.PublicMediaUrlResolver;
import com.pinova.api.response.MemberOrderItemResponse;
import com.pinova.api.response.MemberOrderSummaryResponse;
import com.pinova.api.response.PageResponse;
import com.pinova.service.model.MemberOrderItemResult;
import com.pinova.service.model.MemberOrderPageResult;
import com.pinova.service.model.MemberOrderSummaryResult;
import org.springframework.stereotype.Component;

@Component
public class MemberOrderResponseAssembler {
    private final PublicMediaUrlResolver mediaUrlResolver;

    public MemberOrderResponseAssembler(PublicMediaUrlResolver mediaUrlResolver) {
        this.mediaUrlResolver = mediaUrlResolver;
    }

    public PageResponse<MemberOrderSummaryResponse> toPageResponse(MemberOrderPageResult result) {
        return new PageResponse<>(
                result.items().stream().map(this::toSummaryResponse).toList(),
                result.page(),
                result.pageSize(),
                result.total());
    }

    private MemberOrderSummaryResponse toSummaryResponse(MemberOrderSummaryResult result) {
        return new MemberOrderSummaryResponse(
                result.orderNo(),
                result.checkoutNo(),
                result.status(),
                result.fulfillmentType(),
                result.currencyCode(),
                result.payableAmountFen(),
                result.paidAmountFen(),
                result.submittedAt(),
                result.carrierName(),
                result.trackingNo(),
                result.shippedAt(),
                result.autoCompleteAt(),
                result.completedAt(),
                result.afterSaleDeadlineAt(),
                result.refundedAt(),
                result.items().stream().map(this::toItemResponse).toList());
    }

    private MemberOrderItemResponse toItemResponse(MemberOrderItemResult result) {
        return new MemberOrderItemResponse(
                result.productName(),
                result.skuSpec(),
                mediaUrlResolver.resolveNullable(result.imageKey()),
                result.unitPriceFen(),
                result.quantity(),
                result.payableAmountFen());
    }
}
