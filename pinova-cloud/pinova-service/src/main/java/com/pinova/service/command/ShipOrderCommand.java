package com.pinova.service.command;
import com.pinova.service.model.AuthenticatedAdminResult;
public record ShipOrderCommand(AuthenticatedAdminResult admin, String orderNo, String requestKey,
                               String carrierCode, String carrierName, String trackingNo) {}
