package com.pinova.service;

import com.pinova.service.command.SubmitOrderCommand;
import com.pinova.service.model.SubmittedCheckoutResult;

public interface TradeOrderService {

    SubmittedCheckoutResult submitOrder(SubmitOrderCommand command);
}
