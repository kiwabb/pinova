package com.pinova.service.assembler;

import com.pinova.pojo.entity.TradeOrder;
import com.pinova.pojo.entity.TradeOrderItem;
import com.pinova.service.model.MemberOrderSummaryResult;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MemberOrderResultAssemblerTest {
    @Test
    void mapsStatusAndImmutableItemSnapshots() {
        Instant submittedAt = Instant.parse("2026-07-19T04:00:00Z");
        TradeOrder order = new TradeOrder();
        order.setOrderNo("PO202607190001");
        order.setStatus((short) 0);
        order.setFulfillmentType((short) 1);
        order.setCurrencyCode("CNY");
        order.setPayableAmountFen(5990L);
        order.setPaidAmountFen(0L);
        order.setSubmittedAt(submittedAt);

        TradeOrderItem item = new TradeOrderItem();
        item.setProductNameSnapshot("48 色基础拼豆套装");
        item.setSkuSpecSnapshot("48 色 / 基础版");
        item.setMainImageKeySnapshot("products/starter-kit.webp");
        item.setUnitPriceFen(5990L);
        item.setQuantity(1L);
        item.setPayableAmountFen(5990L);

        MemberOrderSummaryResult result = MemberOrderResultAssembler.toSummaryResult(order, List.of(item));

        assertEquals("PENDING_PAYMENT", result.status());
        assertEquals(submittedAt, result.submittedAt());
        assertEquals("48 色基础拼豆套装", result.items().getFirst().productName());
        assertEquals("products/starter-kit.webp", result.items().getFirst().imageKey());
        assertEquals(5990L, result.items().getFirst().payableAmountFen());
    }
}
