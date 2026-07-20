package com.pinova.api.assembler;

import com.pinova.api.media.PublicMediaUrlResolver;
import com.pinova.api.response.PageResponse;
import com.pinova.api.response.MemberOrderSummaryResponse;
import com.pinova.service.model.MemberOrderItemResult;
import com.pinova.service.model.MemberOrderPageResult;
import com.pinova.service.model.MemberOrderSummaryResult;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MemberOrderResponseAssemblerTest {
    @Test
    void resolvesSnapshotImageAndPreservesPagination() {
        MemberOrderResponseAssembler assembler = new MemberOrderResponseAssembler(
                new PublicMediaUrlResolver("http://127.0.0.1:19000", "pinova-public"));
        MemberOrderPageResult result = new MemberOrderPageResult(List.of(
                new MemberOrderSummaryResult(
                        "PO202607190001", "550e8400-e29b-41d4-a716-446655440000",
                        "PENDING_PAYMENT", (short) 1, "CNY",
                        5990L, 0L, Instant.parse("2026-07-19T04:00:00Z"),
                        null, null, null, null, null, null, null,
                        List.of(new MemberOrderItemResult(
                                "48 色基础拼豆套装", "48 色 / 基础版",
                                "products/基础套装.webp", 5990L, 1L, 5990L)))),
                1, 10, 1L);

        PageResponse<MemberOrderSummaryResponse> response = assembler.toPageResponse(result);

        assertEquals(1L, response.total());
        assertEquals(
                "550e8400-e29b-41d4-a716-446655440000",
                response.items().getFirst().checkoutNo());
        assertEquals("PENDING_PAYMENT", response.items().getFirst().status());
        assertEquals(
                "http://127.0.0.1:19000/pinova-public/products/%E5%9F%BA%E7%A1%80%E5%A5%97%E8%A3%85.webp",
                response.items().getFirst().items().getFirst().imageUrl());
    }
}
