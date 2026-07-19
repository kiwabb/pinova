package com.pinova.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.pinova.common.error.BusinessException;
import com.pinova.common.error.CommonErrorCode;
import com.pinova.mapper.TradeOrderItemMapper;
import com.pinova.mapper.TradeOrderMapper;
import com.pinova.mapper.TradeOrderShippingAddressMapper;
import com.pinova.pojo.entity.TradeOrder;
import com.pinova.pojo.entity.TradeOrderItem;
import com.pinova.pojo.entity.TradeOrderShippingAddress;
import com.pinova.service.AdminAuthorizationService;
import com.pinova.service.AdminOrderQueryService;
import com.pinova.service.assembler.AdminOrderResultAssembler;
import com.pinova.service.error.AdminOrderErrorCode;
import com.pinova.service.model.AdminOrderDetailResult;
import com.pinova.service.model.AdminOrderPageResult;
import com.pinova.service.model.AuthenticatedAdminResult;
import com.pinova.service.query.AdminOrderListQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AdminOrderQueryServiceImpl implements AdminOrderQueryService {
    private static final int MAX_PAGE_SIZE = 100;
    private final TradeOrderMapper orderMapper;
    private final TradeOrderItemMapper orderItemMapper;
    private final TradeOrderShippingAddressMapper addressMapper;
    private final AdminAuthorizationService authorizationService;

    public AdminOrderQueryServiceImpl(
            TradeOrderMapper orderMapper,
            TradeOrderItemMapper orderItemMapper,
            TradeOrderShippingAddressMapper addressMapper,
            AdminAuthorizationService authorizationService) {
        this.orderMapper = orderMapper;
        this.orderItemMapper = orderItemMapper;
        this.addressMapper = addressMapper;
        this.authorizationService = authorizationService;
    }

    @Override
    @Transactional(readOnly = true)
    public AdminOrderPageResult listOrders(AuthenticatedAdminResult admin, AdminOrderListQuery query) {
        authorizationService.requireOrderRead(admin);
        validateQuery(query);
        String orderNo = normalizeOptionalOrderNo(query.orderNo());
        var wrapper = Wrappers.lambdaQuery(TradeOrder.class)
                .eq(orderNo != null, TradeOrder::getOrderNo, orderNo)
                .eq(query.status() != null, TradeOrder::getStatus, query.status())
                .ge(query.submittedFrom() != null, TradeOrder::getSubmittedAt, query.submittedFrom())
                .lt(query.submittedTo() != null, TradeOrder::getSubmittedAt, query.submittedTo())
                .orderByDesc(TradeOrder::getCreatedAt)
                .orderByDesc(TradeOrder::getId);
        Page<TradeOrder> result = orderMapper.selectPage(new Page<>(query.page(), query.pageSize()), wrapper);
        return new AdminOrderPageResult(
                result.getRecords().stream().map(AdminOrderResultAssembler::toSummaryResult).toList(),
                query.page(),
                query.pageSize(),
                result.getTotal());
    }

    @Override
    @Transactional(readOnly = true)
    public AdminOrderDetailResult getOrder(AuthenticatedAdminResult admin, String orderNo) {
        authorizationService.requireOrderRead(admin);
        String normalizedOrderNo = requireOrderNo(orderNo);
        TradeOrder order = orderMapper.selectOne(Wrappers.lambdaQuery(TradeOrder.class)
                .eq(TradeOrder::getOrderNo, normalizedOrderNo));
        if (order == null) {
            throw new BusinessException(AdminOrderErrorCode.ORDER_NOT_FOUND);
        }
        List<TradeOrderItem> items = orderItemMapper.selectList(Wrappers.lambdaQuery(TradeOrderItem.class)
                .eq(TradeOrderItem::getOrderId, order.getId())
                .orderByAsc(TradeOrderItem::getId));
        TradeOrderShippingAddress address = addressMapper.selectOne(
                Wrappers.lambdaQuery(TradeOrderShippingAddress.class)
                        .eq(TradeOrderShippingAddress::getOrderId, order.getId()));
        return AdminOrderResultAssembler.toDetailResult(order, items, address);
    }

    private static void validateQuery(AdminOrderListQuery query) {
        if (query == null) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "订单查询参数不能为空");
        }
        if (query.page() < 1 || query.pageSize() < 1 || query.pageSize() > MAX_PAGE_SIZE) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "页码必须从 1 开始，每页数量为 1 到 100");
        }
        if (query.status() != null && (query.status() < 0 || query.status() > 4)) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "订单状态无效");
        }
        if (query.submittedFrom() != null
                && query.submittedTo() != null
                && !query.submittedFrom().isBefore(query.submittedTo())) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "提交开始时间必须早于结束时间");
        }
        normalizeOptionalOrderNo(query.orderNo());
    }

    private static String normalizeOptionalOrderNo(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return requireOrderNo(value);
    }

    private static String requireOrderNo(String value) {
        if (value == null || value.isBlank()) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "订单号不能为空");
        }
        String normalized = value.trim();
        if (normalized.length() > 64) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "订单号长度不能超过 64");
        }
        return normalized;
    }
}

