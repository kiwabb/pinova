package com.pinova.api.response;

public record CancelledCheckoutResponse(String checkoutNo, int cancelledOrderCount) {
}
