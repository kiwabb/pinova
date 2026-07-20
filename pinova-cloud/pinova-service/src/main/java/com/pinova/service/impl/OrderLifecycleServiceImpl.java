package com.pinova.service.impl;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.pinova.common.error.BusinessException;
import com.pinova.mapper.*;
import com.pinova.pojo.entity.*;
import com.pinova.service.*;
import com.pinova.service.command.*;
import com.pinova.service.error.OrderLifecycleErrorCode;
import com.pinova.service.model.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class OrderLifecycleServiceImpl implements OrderLifecycleService {
    private static final short ACTION_SHIP=1, ACTION_CORRECT=2, ACTION_MEMBER_COMPLETE=3, ACTION_AUTO_COMPLETE=4, ACTION_ADMIN_COMPLETE=5;
    private static final short OPERATOR_MEMBER=1, OPERATOR_ADMIN=2, OPERATOR_SYSTEM=3;
    private static final int MAX_BATCH=500;
    private final TradeOrderMapper orderMapper; private final TradeOrderFulfillmentLogMapper logMapper;
    private final OrderAfterSaleMapper afterSaleMapper; private final AdminAuthorizationService authorizationService;
    private final AdminOperationAuditService auditService;
    public OrderLifecycleServiceImpl(TradeOrderMapper orderMapper, TradeOrderFulfillmentLogMapper logMapper,
            OrderAfterSaleMapper afterSaleMapper, AdminAuthorizationService authorizationService,
            AdminOperationAuditService auditService) {
        this.orderMapper=orderMapper; this.logMapper=logMapper; this.afterSaleMapper=afterSaleMapper;
        this.authorizationService=authorizationService; this.auditService=auditService;
    }

    @Override @Transactional
    public OrderLifecycleResult ship(ShipOrderCommand c) {
        authorizationService.requireSuperAdmin(c==null?null:c.admin());
        requireKey(c.requestKey()); requireShipment(c.carrierCode(),c.carrierName(),c.trackingNo());
        TradeOrder order=requireOrder(c.orderNo());
        OrderLifecycleResult replay=findReplay(order,c.requestKey()); if(replay!=null)return replay;
        requireNoAfterSale(order.getId());
        if(order.getStatus()!=TradeOrderStatus.PENDING_FULFILLMENT.code()) conflict();
        Instant now=Instant.now();
        int updated=orderMapper.update(null,Wrappers.lambdaUpdate(TradeOrder.class)
                .eq(TradeOrder::getId,order.getId()).eq(TradeOrder::getVersion,order.getVersion())
                .eq(TradeOrder::getStatus,TradeOrderStatus.PENDING_FULFILLMENT.code())
                .set(TradeOrder::getStatus,TradeOrderStatus.FULFILLING.code())
                .set(TradeOrder::getCarrierCode,normalize(c.carrierCode())).set(TradeOrder::getCarrierName,normalize(c.carrierName()))
                .set(TradeOrder::getTrackingNo,normalize(c.trackingNo())).set(TradeOrder::getShippedAt,now)
                .set(TradeOrder::getFulfillmentStartedAt,now).set(TradeOrder::getAutoCompleteAt,now.plus(7,ChronoUnit.DAYS))
                .set(TradeOrder::getUpdatedAt,now).set(TradeOrder::getUpdatedBy,c.admin().id()).setSql("version = version + 1"));
        if(updated!=1) conflict();
        insertLog(order,c.requestKey(),ACTION_SHIP,TradeOrderStatus.FULFILLING.code(),c.carrierCode(),c.carrierName(),c.trackingNo(),null,OPERATOR_ADMIN,c.admin().id(),now);
        auditService.record(new RecordAdminAuditCommand(c.admin().id(),"ORDER","SHIP","TRADE_ORDER",order.getOrderNo(),c.requestKey(),null,null,null));
        return toResult(requireOrder(c.orderNo()));
    }

    @Override @Transactional
    public OrderLifecycleResult correctShipment(CorrectOrderShipmentCommand c) {
        authorizationService.requireSuperAdmin(c==null?null:c.admin()); requireKey(c.requestKey());
        requireShipment(c.carrierCode(),c.carrierName(),c.trackingNo()); requireReason(c.reason());
        TradeOrder order=requireOrder(c.orderNo()); OrderLifecycleResult replay=findReplay(order,c.requestKey()); if(replay!=null)return replay;
        requireNoAfterSale(order.getId()); if(order.getStatus()!=TradeOrderStatus.FULFILLING.code()) conflict();
        Instant now=Instant.now();
        int updated=orderMapper.update(null,Wrappers.lambdaUpdate(TradeOrder.class)
                .eq(TradeOrder::getId,order.getId()).eq(TradeOrder::getVersion,order.getVersion())
                .eq(TradeOrder::getStatus,TradeOrderStatus.FULFILLING.code())
                .set(TradeOrder::getCarrierCode,normalize(c.carrierCode())).set(TradeOrder::getCarrierName,normalize(c.carrierName()))
                .set(TradeOrder::getTrackingNo,normalize(c.trackingNo())).set(TradeOrder::getUpdatedAt,now)
                .set(TradeOrder::getUpdatedBy,c.admin().id()).setSql("version = version + 1"));
        if(updated!=1) conflict();
        insertLog(order,c.requestKey(),ACTION_CORRECT,order.getStatus(),c.carrierCode(),c.carrierName(),c.trackingNo(),c.reason(),OPERATOR_ADMIN,c.admin().id(),now);
        auditService.record(new RecordAdminAuditCommand(c.admin().id(),"ORDER","CORRECT_SHIPMENT","TRADE_ORDER",order.getOrderNo(),c.requestKey(),normalize(c.reason()),null,null));
        return toResult(requireOrder(c.orderNo()));
    }

    @Override @Transactional public OrderLifecycleResult confirmReceipt(Long memberId,String orderNo,String key){
        if(memberId==null||memberId<=0) throw new BusinessException(OrderLifecycleErrorCode.ORDER_NOT_FOUND);
        return complete(new CompleteOrderCommand(orderNo,memberId,key,(short)1,null),OPERATOR_MEMBER,memberId);
    }
    @Override @Transactional public OrderLifecycleResult forceComplete(AuthenticatedAdminResult admin,String orderNo,String key,String reason){
        authorizationService.requireSuperAdmin(admin); requireReason(reason);
        OrderLifecycleResult result=complete(new CompleteOrderCommand(orderNo,admin.id(),key,(short)3,reason),OPERATOR_ADMIN,admin.id());
        auditService.record(new RecordAdminAuditCommand(admin.id(),"ORDER","FORCE_COMPLETE","TRADE_ORDER",orderNo,key,normalize(reason),null,null));
        return result;
    }
    @Override @Transactional public int completeExpiredShipments(int requestedLimit){
        int limit=Math.max(1,Math.min(requestedLimit,MAX_BATCH)); Instant now=Instant.now(); int count=0;
        for(String orderNo:orderMapper.selectAutoCompleteOrderNos(now,limit)){
            TradeOrder order=requireOrder(orderNo);
            if(order.getStatus()!=TradeOrderStatus.FULFILLING.code()||order.getAutoCompleteAt()==null||order.getAutoCompleteAt().isAfter(now))continue;
            if(hasActiveAfterSale(order.getId()))continue;
            complete(new CompleteOrderCommand(orderNo,0L,"AUTO-"+order.getId(),(short)2,null),OPERATOR_SYSTEM,0L); count++;
        } return count;
    }

    private OrderLifecycleResult complete(CompleteOrderCommand c,short operatorType,Long operatorId){
        requireKey(c.requestKey()); TradeOrder order=requireOrder(c.orderNo());
        if(operatorType==OPERATOR_MEMBER&&!operatorId.equals(order.getMemberId()))throw new BusinessException(OrderLifecycleErrorCode.ORDER_NOT_FOUND);
        OrderLifecycleResult replay=findReplay(order,c.requestKey()); if(replay!=null)return replay;
        requireNoAfterSale(order.getId()); if(order.getStatus()!=TradeOrderStatus.FULFILLING.code())conflict();
        Instant now=Instant.now();
        int updated=orderMapper.update(null,Wrappers.lambdaUpdate(TradeOrder.class)
                .eq(TradeOrder::getId,order.getId()).eq(TradeOrder::getVersion,order.getVersion())
                .eq(TradeOrder::getStatus,TradeOrderStatus.FULFILLING.code())
                .set(TradeOrder::getStatus,TradeOrderStatus.COMPLETED.code()).set(TradeOrder::getCompletedAt,now)
                .set(TradeOrder::getCompletionSource,c.completionSource()).set(TradeOrder::getCompletionReason,normalize(c.reason()))
                .set(TradeOrder::getAfterSaleDeadlineAt,now.plus(7,ChronoUnit.DAYS)).set(TradeOrder::getUpdatedAt,now)
                .set(TradeOrder::getUpdatedBy,operatorId).setSql("version = version + 1"));
        if(updated!=1)conflict(); short action=c.completionSource()==1?ACTION_MEMBER_COMPLETE:c.completionSource()==2?ACTION_AUTO_COMPLETE:ACTION_ADMIN_COMPLETE;
        insertLog(order,c.requestKey(),action,TradeOrderStatus.COMPLETED.code(),order.getCarrierCode(),order.getCarrierName(),order.getTrackingNo(),c.reason(),operatorType,operatorId,now);
        return toResult(requireOrder(c.orderNo()));
    }
    private TradeOrder requireOrder(String orderNo){
        if(orderNo==null||orderNo.isBlank())throw new BusinessException(OrderLifecycleErrorCode.ORDER_NOT_FOUND);
        TradeOrder order=orderMapper.selectByOrderNoForUpdate(orderNo.trim()); if(order==null)throw new BusinessException(OrderLifecycleErrorCode.ORDER_NOT_FOUND); return order;
    }
    private void requireNoAfterSale(Long orderId){if(hasActiveAfterSale(orderId))throw new BusinessException(OrderLifecycleErrorCode.AFTER_SALE_ACTIVE);}
    private boolean hasActiveAfterSale(Long orderId){return afterSaleMapper.selectCount(Wrappers.lambdaQuery(OrderAfterSale.class).eq(OrderAfterSale::getOrderId,orderId).in(OrderAfterSale::getStatus,(short)0,(short)2,(short)5))>0;}
    private OrderLifecycleResult findReplay(TradeOrder order,String key){
        TradeOrderFulfillmentLog log=logMapper.selectOne(Wrappers.lambdaQuery(TradeOrderFulfillmentLog.class).eq(TradeOrderFulfillmentLog::getOrderId,order.getId()).eq(TradeOrderFulfillmentLog::getRequestKey,key));
        return log==null?null:toResult(order);
    }
    private void insertLog(TradeOrder order,String key,short action,short after,String cc,String cn,String tn,String reason,short ot,Long oid,Instant now){
        TradeOrderFulfillmentLog log=new TradeOrderFulfillmentLog(); log.setId(IdWorker.getId());log.setOrderId(order.getId());log.setRequestKey(key);log.setActionType(action);
        log.setStatusBefore(order.getStatus());log.setStatusAfter(after);log.setCarrierCode(normalize(cc));log.setCarrierName(normalize(cn));log.setTrackingNo(normalize(tn));log.setReason(normalize(reason));
        log.setOperatorType(ot);log.setOperatorId(oid);log.setOccurredAt(now);log.setCreatedAt(now);log.setCreatedBy(oid);log.setUpdatedAt(now);log.setUpdatedBy(oid);logMapper.insert(log);
    }
    private static OrderLifecycleResult toResult(TradeOrder o){return new OrderLifecycleResult(o.getOrderNo(),TradeOrderStatus.fromCode(o.getStatus()),o.getCarrierCode(),o.getCarrierName(),o.getTrackingNo(),o.getShippedAt(),o.getAutoCompleteAt(),o.getCompletedAt(),o.getCompletionSource());}
    private static void requireKey(String k){if(k==null||k.isBlank()||k.length()>64)throw new BusinessException(OrderLifecycleErrorCode.INVALID_REQUEST_KEY);}
    private static void requireShipment(String a,String b,String c){if(blank(a)||blank(b)||blank(c)||a.trim().length()>32||b.trim().length()>64||c.trim().length()>128)throw new BusinessException(OrderLifecycleErrorCode.INVALID_SHIPMENT);}
    private static void requireReason(String r){if(blank(r)||r.trim().length()>500)throw new BusinessException(OrderLifecycleErrorCode.REASON_REQUIRED);}
    private static boolean blank(String v){return v==null||v.isBlank();} private static String normalize(String v){return blank(v)?null:v.trim();}
    private static void conflict(){throw new BusinessException(OrderLifecycleErrorCode.STATE_CONFLICT);}
}
