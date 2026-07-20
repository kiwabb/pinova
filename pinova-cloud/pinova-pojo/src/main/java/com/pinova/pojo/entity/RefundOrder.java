package com.pinova.pojo.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.time.Instant;

@TableName("refund_order")
public class RefundOrder implements Serializable {
    @TableId(value="id",type=IdType.ASSIGN_ID) private Long id;
    @TableField("refund_no") private String refundNo; @TableField("after_sale_id") private Long afterSaleId;
    @TableField("order_id") private Long orderId; @TableField("payment_order_id") private Long paymentOrderId;
    @TableField("member_id") private Long memberId; @TableField("provider_code") private String providerCode;
    @TableField("provider_refund_no") private String providerRefundNo; @TableField("currency_code") private String currencyCode;
    @TableField("amount_fen") private Long amountFen; private Short status;
    @TableField("attempt_count") private Integer attemptCount; @TableField("last_queried_at") private Instant lastQueriedAt;
    @TableField("succeeded_at") private Instant succeededAt; @TableField("failed_at") private Instant failedAt;
    @TableField("review_required_at") private Instant reviewRequiredAt; @TableField("failure_code") private String failureCode;
    @TableField("failure_message") private String failureMessage; @Version private Integer version;
    @TableField("created_at") private Instant createdAt; @TableField("created_by") private Long createdBy;
    @TableField("updated_at") private Instant updatedAt; @TableField("updated_by") private Long updatedBy;
    public Long getId(){return id;} public void setId(Long v){id=v;}
    public String getRefundNo(){return refundNo;} public void setRefundNo(String v){refundNo=v;}
    public Long getAfterSaleId(){return afterSaleId;} public void setAfterSaleId(Long v){afterSaleId=v;}
    public Long getOrderId(){return orderId;} public void setOrderId(Long v){orderId=v;}
    public Long getPaymentOrderId(){return paymentOrderId;} public void setPaymentOrderId(Long v){paymentOrderId=v;}
    public Long getMemberId(){return memberId;} public void setMemberId(Long v){memberId=v;}
    public String getProviderCode(){return providerCode;} public void setProviderCode(String v){providerCode=v;}
    public String getProviderRefundNo(){return providerRefundNo;} public void setProviderRefundNo(String v){providerRefundNo=v;}
    public String getCurrencyCode(){return currencyCode;} public void setCurrencyCode(String v){currencyCode=v;}
    public Long getAmountFen(){return amountFen;} public void setAmountFen(Long v){amountFen=v;}
    public Short getStatus(){return status;} public void setStatus(Short v){status=v;}
    public Integer getAttemptCount(){return attemptCount;} public void setAttemptCount(Integer v){attemptCount=v;}
    public Instant getLastQueriedAt(){return lastQueriedAt;} public void setLastQueriedAt(Instant v){lastQueriedAt=v;}
    public Instant getSucceededAt(){return succeededAt;} public void setSucceededAt(Instant v){succeededAt=v;}
    public Instant getFailedAt(){return failedAt;} public void setFailedAt(Instant v){failedAt=v;}
    public Instant getReviewRequiredAt(){return reviewRequiredAt;} public void setReviewRequiredAt(Instant v){reviewRequiredAt=v;}
    public String getFailureCode(){return failureCode;} public void setFailureCode(String v){failureCode=v;}
    public String getFailureMessage(){return failureMessage;} public void setFailureMessage(String v){failureMessage=v;}
    public Integer getVersion(){return version;} public void setVersion(Integer v){version=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Long getCreatedBy(){return createdBy;} public void setCreatedBy(Long v){createdBy=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
    public Long getUpdatedBy(){return updatedBy;} public void setUpdatedBy(Long v){updatedBy=v;}
}
