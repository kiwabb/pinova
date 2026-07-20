package com.pinova.service.command;
import com.pinova.service.model.AuthenticatedAdminResult;
public record ReviewAfterSaleCommand(AuthenticatedAdminResult admin,String afterSaleNo,Integer version,
                                     boolean approved,String reason) {}
