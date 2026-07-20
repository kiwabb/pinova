package com.pinova.service.impl;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.pinova.common.error.BusinessException;
import com.pinova.mapper.*;
import com.pinova.pojo.entity.*;
import com.pinova.service.*;
import com.pinova.service.command.*;
import com.pinova.service.error.AfterSaleErrorCode;
import com.pinova.service.model.*;
import com.pinova.service.payment.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class AfterSaleServiceImpl implements AfterSaleService {
    private static final DateTimeFormatter DATE=DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final ZoneId ZONE=ZoneId.of("Asia/Shanghai");
    private final OrderAfterSaleMapper saleMapper; private final RefundOrderMapper refundMapper;
    private final TradeOrderMapper orderMapper; private final PaymentOrderTradeOrderMapper paymentLinkMapper;
    private final PaymentOrderMapper paymentMapper; private final PaymentProviderRegistry providers;
    private final AdminAuthorizationService authorization; private final AdminOperationAuditService audit;
    public AfterSaleServiceImpl(OrderAfterSaleMapper saleMapper,RefundOrderMapper refundMapper,TradeOrderMapper orderMapper,
            PaymentOrderTradeOrderMapper paymentLinkMapper,PaymentOrderMapper paymentMapper,PaymentProviderRegistry providers,
            AdminAuthorizationService authorization,AdminOperationAuditService audit){
        this.saleMapper=saleMapper;this.refundMapper=refundMapper;this.orderMapper=orderMapper;this.paymentLinkMapper=paymentLinkMapper;
        this.paymentMapper=paymentMapper;this.providers=providers;this.authorization=authorization;this.audit=audit;
    }

    @Override @Transactional
    public AfterSaleResult apply(ApplyAfterSaleCommand c){
        validateApply(c); TradeOrder order=orderMapper.selectByOrderNoForUpdate(c.orderNo().trim());
        if(order==null||!c.memberId().equals(order.getMemberId()))notFound();
        OrderAfterSale replay=saleMapper.selectOne(Wrappers.lambdaQuery(OrderAfterSale.class)
                .eq(OrderAfterSale::getMemberId,c.memberId()).eq(OrderAfterSale::getRequestKey,c.requestKey().trim()));
        if(replay!=null)return toResult(replay);
        if(order.getStatus()!=TradeOrderStatus.PENDING_FULFILLMENT.code()
                &&order.getStatus()!=TradeOrderStatus.FULFILLING.code()
                &&order.getStatus()!=TradeOrderStatus.COMPLETED.code()){
            throw new BusinessException(AfterSaleErrorCode.ORDER_NOT_ELIGIBLE);
        }
        Instant now=Instant.now();
        if(order.getStatus()==TradeOrderStatus.COMPLETED.code()
                &&(order.getAfterSaleDeadlineAt()==null||now.isAfter(order.getAfterSaleDeadlineAt()))){
            throw new BusinessException(AfterSaleErrorCode.WINDOW_EXPIRED);
        }
        if(saleMapper.selectCount(Wrappers.lambdaQuery(OrderAfterSale.class).eq(OrderAfterSale::getOrderId,order.getId())
                .in(OrderAfterSale::getStatus,(short)0,(short)2,(short)5))>0)throw new BusinessException(AfterSaleErrorCode.ACTIVE_EXISTS);
        Long id=IdWorker.getId(); OrderAfterSale sale=new OrderAfterSale(); sale.setId(id);
        sale.setAfterSaleNo("AS"+DATE.format(now.atZone(ZONE))+id);sale.setOrderId(order.getId());sale.setMemberId(c.memberId());
        sale.setRequestKey(c.requestKey().trim());sale.setType((short)1);sale.setReasonCode(c.reasonCode());sale.setReason(norm(c.reason()));
        sale.setAmountFen(order.getPaidAmountFen());sale.setCurrencyCode(order.getCurrencyCode());sale.setStatus(AfterSaleStatus.APPLIED.code());
        sale.setAppliedAt(now);sale.setVersion(0);sale.setCreatedAt(now);sale.setCreatedBy(c.memberId());sale.setUpdatedAt(now);sale.setUpdatedBy(c.memberId());
        saleMapper.insert(sale);return toResult(sale);
    }

    @Override @Transactional(readOnly=true)
    public List<AfterSaleResult> listMemberAfterSales(Long memberId){
        if(memberId==null||memberId<=0)notFound();
        return saleMapper.selectList(Wrappers.lambdaQuery(OrderAfterSale.class).eq(OrderAfterSale::getMemberId,memberId)
                .orderByDesc(OrderAfterSale::getCreatedAt).orderByDesc(OrderAfterSale::getId)).stream().map(this::toResult).toList();
    }
    @Override @Transactional(readOnly=true)
    public List<AfterSaleResult> listAdminAfterSales(AuthenticatedAdminResult admin){
        authorization.requireSuperAdmin(admin);
        return saleMapper.selectList(Wrappers.lambdaQuery(OrderAfterSale.class).orderByDesc(OrderAfterSale::getCreatedAt)
                .orderByDesc(OrderAfterSale::getId).last("LIMIT 200")).stream().map(this::toResult).toList();
    }

    @Override @Transactional
    public AfterSaleResult review(ReviewAfterSaleCommand c){
        authorization.requireSuperAdmin(c==null?null:c.admin());
        if(c.version()==null||c.version()<0||blank(c.afterSaleNo())||blank(c.reason()))invalid();
        OrderAfterSale sale=requireSale(c.afterSaleNo());
        if(!c.version().equals(sale.getVersion())||sale.getStatus()!=AfterSaleStatus.APPLIED.code())conflict();
        Instant now=Instant.now();
        if(!c.approved()){
            int updated=saleMapper.update(null,Wrappers.lambdaUpdate(OrderAfterSale.class).eq(OrderAfterSale::getId,sale.getId())
                    .eq(OrderAfterSale::getVersion,sale.getVersion()).eq(OrderAfterSale::getStatus,AfterSaleStatus.APPLIED.code())
                    .set(OrderAfterSale::getStatus,AfterSaleStatus.REJECTED.code()).set(OrderAfterSale::getReviewedAt,now)
                    .set(OrderAfterSale::getReviewedBy,c.admin().id()).set(OrderAfterSale::getReviewReason,c.reason().trim())
                    .set(OrderAfterSale::getUpdatedAt,now).set(OrderAfterSale::getUpdatedBy,c.admin().id()).setSql("version = version + 1"));
            if(updated!=1)conflict();audit(c.admin().id(),"REJECT",sale,c.reason());return toResult(requireSale(c.afterSaleNo()));
        }
        TradeOrder order=orderMapper.selectById(sale.getOrderId());
        if(order==null||order.getStatus()==TradeOrderStatus.REFUNDED.code())conflict();
        int updated=saleMapper.update(null,Wrappers.lambdaUpdate(OrderAfterSale.class).eq(OrderAfterSale::getId,sale.getId())
                .eq(OrderAfterSale::getVersion,sale.getVersion()).eq(OrderAfterSale::getStatus,AfterSaleStatus.APPLIED.code())
                .set(OrderAfterSale::getStatus,AfterSaleStatus.REFUNDING.code()).set(OrderAfterSale::getReviewedAt,now)
                .set(OrderAfterSale::getReviewedBy,c.admin().id()).set(OrderAfterSale::getReviewReason,c.reason().trim())
                .set(OrderAfterSale::getUpdatedAt,now).set(OrderAfterSale::getUpdatedBy,c.admin().id()).setSql("version = version + 1"));
        if(updated!=1)conflict();
        sale=requireSale(c.afterSaleNo()); executeNewRefund(sale,order,c.admin().id()); audit(c.admin().id(),"APPROVE",sale,c.reason());
        return toResult(requireSale(c.afterSaleNo()));
    }

    @Override @Transactional public AfterSaleResult retryRefund(AuthenticatedAdminResult admin,String no){
        authorization.requireSuperAdmin(admin);OrderAfterSale sale=requireSale(no);RefundOrder refund=refundMapper.selectByAfterSaleIdForUpdate(sale.getId());
        if(refund==null||refund.getStatus()!=RefundOrderStatus.FAILED.code())conflict();
        PaymentOrder payment=paymentMapper.selectByIdForUpdate(refund.getPaymentOrderId());
        ProviderRefundResult result=providers.require(refund.getProviderCode()).createRefund(toCommand(refund,payment,refund.getAttemptCount()+1));
        applyRefundResult(sale,refund,result,admin.id(),refund.getAttemptCount()+1);audit(admin.id(),"RETRY_REFUND",sale,null);
        return toResult(requireSale(no));
    }
    @Override @Transactional public AfterSaleResult reconcileRefund(AuthenticatedAdminResult admin,String no){
        authorization.requireSuperAdmin(admin);OrderAfterSale sale=requireSale(no);RefundOrder refund=refundMapper.selectByAfterSaleIdForUpdate(sale.getId());
        if(refund==null||blank(refund.getProviderRefundNo()))conflict();PaymentOrder payment=paymentMapper.selectByIdForUpdate(refund.getPaymentOrderId());
        ProviderRefundResult result=providers.require(refund.getProviderCode()).queryRefund(toCommand(refund,payment,refund.getAttemptCount()),refund.getProviderRefundNo());
        applyRefundResult(sale,refund,result,admin.id(),refund.getAttemptCount());audit(admin.id(),"RECONCILE_REFUND",sale,null);
        return toResult(requireSale(no));
    }

    private void executeNewRefund(OrderAfterSale sale,TradeOrder order,Long operatorId){
        PaymentOrderTradeOrder link=paymentLinkMapper.selectByTradeOrderIdForUpdate(order.getId());if(link==null)conflict();
        PaymentOrder payment=paymentMapper.selectByIdForUpdate(link.getPaymentOrderId());
        if(payment==null||payment.getStatus()!=PaymentOrderStatus.SUCCEEDED.code()||!sale.getAmountFen().equals(link.getOrderAmountFen()))conflict();
        Long id=IdWorker.getId();Instant now=Instant.now();RefundOrder refund=new RefundOrder();refund.setId(id);refund.setRefundNo("RF"+DATE.format(now.atZone(ZONE))+id);
        refund.setAfterSaleId(sale.getId());refund.setOrderId(order.getId());refund.setPaymentOrderId(payment.getId());refund.setMemberId(sale.getMemberId());
        refund.setProviderCode(payment.getProviderCode());refund.setCurrencyCode(sale.getCurrencyCode());refund.setAmountFen(sale.getAmountFen());refund.setStatus(RefundOrderStatus.PENDING.code());
        refund.setAttemptCount(1);refund.setVersion(0);refund.setCreatedAt(now);refund.setCreatedBy(operatorId);refund.setUpdatedAt(now);refund.setUpdatedBy(operatorId);refundMapper.insert(refund);
        ProviderRefundResult result=providers.require(payment.getProviderCode()).createRefund(toCommand(refund,payment,1));
        applyRefundResult(sale,refund,result,operatorId,1);
    }
    private void applyRefundResult(OrderAfterSale sale,RefundOrder refund,ProviderRefundResult result,Long operatorId,int attempts){
        if(result==null||result.amountFen()!=refund.getAmountFen()||!refund.getCurrencyCode().equals(result.currencyCode()))conflict();
        Instant now=Instant.now();short status=result.status()==ProviderRefundStatus.SUCCEEDED?RefundOrderStatus.SUCCEEDED.code():result.status()==ProviderRefundStatus.FAILED?RefundOrderStatus.FAILED.code():RefundOrderStatus.PENDING.code();
        int updated=refundMapper.update(null,Wrappers.lambdaUpdate(RefundOrder.class).eq(RefundOrder::getId,refund.getId()).eq(RefundOrder::getVersion,refund.getVersion())
                .set(RefundOrder::getProviderRefundNo,result.providerRefundNo()).set(RefundOrder::getStatus,status).set(RefundOrder::getAttemptCount,attempts)
                .set(RefundOrder::getLastQueriedAt,now).set(RefundOrder::getSucceededAt,status==1?result.occurredAt():null)
                .set(RefundOrder::getFailedAt,status==2?result.occurredAt():null).set(RefundOrder::getFailureCode,result.failureCode())
                .set(RefundOrder::getFailureMessage,result.failureMessage()).set(RefundOrder::getUpdatedAt,now).set(RefundOrder::getUpdatedBy,operatorId).setSql("version = version + 1"));
        if(updated!=1)conflict();
        short saleStatus=status==1?AfterSaleStatus.COMPLETED.code():status==2?AfterSaleStatus.FAILED.code():AfterSaleStatus.REFUNDING.code();
        saleMapper.update(null,Wrappers.lambdaUpdate(OrderAfterSale.class).eq(OrderAfterSale::getId,sale.getId())
                .set(OrderAfterSale::getStatus,saleStatus).set(OrderAfterSale::getCompletedAt,status==1?result.occurredAt():null)
                .set(OrderAfterSale::getUpdatedAt,now).set(OrderAfterSale::getUpdatedBy,operatorId).setSql("version = version + 1"));
        if(status==1){TradeOrder order=orderMapper.selectByOrderNoForUpdate(orderMapper.selectById(sale.getOrderId()).getOrderNo());
            int orderUpdated=orderMapper.update(null,Wrappers.lambdaUpdate(TradeOrder.class).eq(TradeOrder::getId,order.getId()).eq(TradeOrder::getVersion,order.getVersion())
                    .in(TradeOrder::getStatus,TradeOrderStatus.PENDING_FULFILLMENT.code(),TradeOrderStatus.FULFILLING.code(),TradeOrderStatus.COMPLETED.code())
                    .set(TradeOrder::getStatus,TradeOrderStatus.REFUNDED.code()).set(TradeOrder::getRefundedAt,result.occurredAt())
                    .set(TradeOrder::getUpdatedAt,now).set(TradeOrder::getUpdatedBy,operatorId).setSql("version = version + 1"));if(orderUpdated!=1)conflict();}
    }
    private ProviderRefundCommand toCommand(RefundOrder r,PaymentOrder p,int attempt){return new ProviderRefundCommand(r.getRefundNo(),p.getPaymentNo(),p.getProviderTransactionNo(),r.getAmountFen(),r.getCurrencyCode(),attempt);}
    private OrderAfterSale requireSale(String no){if(blank(no))notFound();OrderAfterSale s=saleMapper.selectByNoForUpdate(no.trim());if(s==null)notFound();return s;}
    private AfterSaleResult toResult(OrderAfterSale s){TradeOrder o=orderMapper.selectById(s.getOrderId());RefundOrder r=refundMapper.selectOne(Wrappers.lambdaQuery(RefundOrder.class).eq(RefundOrder::getAfterSaleId,s.getId()));return new AfterSaleResult(s.getAfterSaleNo(),o.getOrderNo(),AfterSaleStatus.fromCode(s.getStatus()),s.getAmountFen(),s.getCurrencyCode(),s.getReasonCode(),s.getReason(),s.getReviewReason(),r==null?null:r.getRefundNo(),r==null?null:RefundOrderStatus.fromCode(r.getStatus()),s.getVersion(),s.getAppliedAt(),s.getCompletedAt());}
    private void audit(Long operator,String action,OrderAfterSale s,String reason){audit.record(new RecordAdminAuditCommand(operator,"AFTER_SALE",action,"ORDER_AFTER_SALE",s.getAfterSaleNo(),null,norm(reason),null,null));}
    private static void validateApply(ApplyAfterSaleCommand c){if(c==null||c.memberId()==null||c.memberId()<=0||blank(c.orderNo())||blank(c.requestKey())||c.requestKey().length()>64||c.reasonCode()==null||c.reasonCode()<1||c.reasonCode()>5||(c.reason()!=null&&c.reason().trim().length()>500))invalid();}
    private static boolean blank(String v){return v==null||v.isBlank();}private static String norm(String v){return blank(v)?null:v.trim();}
    private static void invalid(){throw new BusinessException(AfterSaleErrorCode.INVALID_REQUEST);}private static void conflict(){throw new BusinessException(AfterSaleErrorCode.STATE_CONFLICT);}private static void notFound(){throw new BusinessException(AfterSaleErrorCode.NOT_FOUND);}
}
