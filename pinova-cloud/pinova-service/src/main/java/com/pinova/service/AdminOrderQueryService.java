package com.pinova.service;

import com.pinova.service.model.AdminOrderDetailResult;
import com.pinova.service.model.AdminOrderPageResult;
import com.pinova.service.model.AuthenticatedAdminResult;
import com.pinova.service.query.AdminOrderListQuery;

public interface AdminOrderQueryService {
    AdminOrderPageResult listOrders(AuthenticatedAdminResult admin, AdminOrderListQuery query);
    AdminOrderDetailResult getOrder(AuthenticatedAdminResult admin, String orderNo);
}

