package com.pinova.service.impl;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.pinova.common.error.BusinessException;
import com.pinova.common.error.CommonErrorCode;
import com.pinova.mapper.TradeOrderItemMapper;
import com.pinova.mapper.TradeOrderMapper;
import com.pinova.pojo.entity.TradeOrder;
import com.pinova.pojo.entity.TradeOrderItem;
import com.pinova.service.MemberOrderQueryService;
import com.pinova.service.assembler.MemberOrderResultAssembler;
import com.pinova.service.error.MemberAuthenticationErrorCode;
import com.pinova.service.model.MemberOrderPageResult;
import com.pinova.service.query.MemberOrderListQuery;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MemberOrderQueryServiceImpl implements MemberOrderQueryService {
    private static final int MAX_PAGE_SIZE = 50;

    private final TradeOrderMapper orderMapper;
    private final TradeOrderItemMapper orderItemMapper;

    public MemberOrderQueryServiceImpl(
            TradeOrderMapper orderMapper,
            TradeOrderItemMapper orderItemMapper) {
        this.orderMapper = orderMapper;
        this.orderItemMapper = orderItemMapper;
    }

    @Override
    @Transactional(readOnly = true)
    public MemberOrderPageResult listOrders(Long memberId, MemberOrderListQuery query) {
        validateQuery(memberId, query);
        var wrapper = Wrappers.lambdaQuery(TradeOrder.class)
                .eq(TradeOrder::getMemberId, memberId)
                .eq(query.status() != null, TradeOrder::getStatus, query.status())
                .orderByDesc(TradeOrder::getSubmittedAt)
                .orderByDesc(TradeOrder::getId);
        Page<TradeOrder> result = orderMapper.selectPage(new Page<>(query.page(), query.pageSize()), wrapper);
        Map<Long, List<TradeOrderItem>> itemsByOrderId = loadItems(result.getRecords());
        return new MemberOrderPageResult(
                result.getRecords().stream()
                        .map(order -> MemberOrderResultAssembler.toSummaryResult(
                                order, itemsByOrderId.getOrDefault(order.getId(), List.of())))
                        .toList(),
                query.page(),
                query.pageSize(),
                result.getTotal());
    }

    private Map<Long, List<TradeOrderItem>> loadItems(List<TradeOrder> orders) {
        if (orders.isEmpty()) {
            return Map.of();
        }
        List<Long> orderIds = orders.stream().map(TradeOrder::getId).toList();
        return orderItemMapper.selectList(Wrappers.lambdaQuery(TradeOrderItem.class)
                        .in(TradeOrderItem::getOrderId, orderIds)
                        .orderByAsc(TradeOrderItem::getOrderId)
                        .orderByAsc(TradeOrderItem::getId))
                .stream()
                .collect(Collectors.groupingBy(TradeOrderItem::getOrderId));
    }

    private static void validateQuery(Long memberId, MemberOrderListQuery query) {
        if (memberId == null || memberId <= 0) {
            throw new BusinessException(MemberAuthenticationErrorCode.AUTHENTICATION_REQUIRED);
        }
        if (query == null) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "订单查询参数不能为空");
        }
        if (query.page() < 1 || query.pageSize() < 1 || query.pageSize() > MAX_PAGE_SIZE) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "页码必须从 1 开始，每页数量为 1 到 50");
        }
        if (query.status() != null && (query.status() < 0 || query.status() > 4)) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "订单状态无效");
        }
    }
}
