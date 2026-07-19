package com.pinova.service;

import com.pinova.service.model.MemberOrderPageResult;
import com.pinova.service.query.MemberOrderListQuery;

public interface MemberOrderQueryService {

    MemberOrderPageResult listOrders(Long memberId, MemberOrderListQuery query);
}
