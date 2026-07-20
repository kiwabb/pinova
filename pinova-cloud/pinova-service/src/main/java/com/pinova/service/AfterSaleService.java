package com.pinova.service;
import com.pinova.service.command.*;
import com.pinova.service.model.*;
import java.util.List;
public interface AfterSaleService {
    AfterSaleResult apply(ApplyAfterSaleCommand command);
    List<AfterSaleResult> listMemberAfterSales(Long memberId);
    List<AfterSaleResult> listAdminAfterSales(AuthenticatedAdminResult admin);
    AfterSaleResult review(ReviewAfterSaleCommand command);
    AfterSaleResult retryRefund(AuthenticatedAdminResult admin,String afterSaleNo);
    AfterSaleResult reconcileRefund(AuthenticatedAdminResult admin,String afterSaleNo);
}
