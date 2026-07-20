package com.pinova.api.assembler;

import com.pinova.api.response.AdminOrderDetailResponse;
import com.pinova.service.model.AdminOrderDetailResult;
import com.pinova.service.model.AdminOrderShippingAddressResult;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class AdminOrderResponseAssemblerTest {
    private final AdminOrderResponseAssembler assembler = new AdminOrderResponseAssembler();

    @Test
    void masksShippingIdentityAndDetailAddress() {
        AdminOrderDetailResult result = new AdminOrderDetailResult(
                "P202607180001", "checkout", (short) 0, (short) 1, "CNY",
                1000, 0, 0, 1000, 0, null, Instant.now(), Instant.now(),
                null, null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, List.of(),
                new AdminOrderShippingAddressResult(
                        "周小明", "+8613812345678", "CN", "湖北省", "武汉市", "武昌区", "水果湖街道 1 号"));

        AdminOrderDetailResponse response = assembler.toDetailResponse(result);

        assertEquals("周**", response.shippingAddress().receiverName());
        assertEquals("+86*******5678", response.shippingAddress().receiverMobile());
        assertEquals("******", response.shippingAddress().detailAddress());
        assertFalse(response.toString().contains("水果湖"));
    }
}
