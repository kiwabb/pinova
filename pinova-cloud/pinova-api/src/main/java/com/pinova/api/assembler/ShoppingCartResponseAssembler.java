package com.pinova.api.assembler;

import com.pinova.api.media.PublicMediaUrlResolver;
import com.pinova.api.response.ShoppingCartItemResponse;
import com.pinova.api.response.ShoppingCartResponse;
import com.pinova.service.model.ShoppingCartItemResult;
import com.pinova.service.model.ShoppingCartResult;
import org.springframework.stereotype.Component;

@Component
public class ShoppingCartResponseAssembler {
    private final PublicMediaUrlResolver mediaUrlResolver;

    public ShoppingCartResponseAssembler(PublicMediaUrlResolver mediaUrlResolver) {
        this.mediaUrlResolver = mediaUrlResolver;
    }

    public ShoppingCartResponse toCartResponse(ShoppingCartResult result) {
        return new ShoppingCartResponse(result.id(), result.items().stream().map(this::toItemResponse).toList());
    }

    private ShoppingCartItemResponse toItemResponse(ShoppingCartItemResult result) {
        return new ShoppingCartItemResponse(result.id(), result.shopId(), result.spuId(), result.skuId(),
                result.productName(), result.skuSpecSummary(), mediaUrlResolver.resolveNullable(result.imageKey()),
                result.priceFen(), result.quantity(), result.selected(), result.version());
    }
}
