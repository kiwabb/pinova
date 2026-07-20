package com.pinova.pojo.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.time.Instant;

@TableName("order_after_sale")
public class OrderAfterSale implements Serializable {
    @TableId(value="id",type=IdType.ASSIGN_ID) private Long id;
    @TableField("after_sale_no") private String afterSaleNo;
    @TableField("order_id") private Long orderId;
    @TableField("member_id") private Long memberId;
    @TableField("request_key") private String requestKey;
    private Short type;
    @TableField("reason_code") private Short reasonCode;
    private String reason;
    @TableField("amount_fen") private Long amountFen;
    @TableField("currency_code") private String currencyCode;
    private Short status;
    @TableField("applied_at") private Instant appliedAt;
    @TableField("reviewed_at") private Instant reviewedAt;
    @TableField("reviewed_by") private Long reviewedBy;
    @TableField("review_reason") private String reviewReason;
    @TableField("completed_at") private Instant completedAt;
    @Version private Integer version;
    @TableField("created_at") private Instant createdAt; @TableField("created_by") private Long createdBy;
    @TableField("updated_at") private Instant updatedAt; @TableField("updated_by") private Long updatedBy;
    public Long getId(){return id;} public void setId(Long v){id=v;}
    public String getAfterSaleNo(){return afterSaleNo;} public void setAfterSaleNo(String v){afterSaleNo=v;}
    public Long getOrderId(){return orderId;} public void setOrderId(Long v){orderId=v;}
    public Long getMemberId(){return memberId;} public void setMemberId(Long v){memberId=v;}
    public String getRequestKey(){return requestKey;} public void setRequestKey(String v){requestKey=v;}
    public Short getType(){return type;} public void setType(Short v){type=v;}
    public Short getReasonCode(){return reasonCode;} public void setReasonCode(Short v){reasonCode=v;}
    public String getReason(){return reason;} public void setReason(String v){reason=v;}
    public Long getAmountFen(){return amountFen;} public void setAmountFen(Long v){amountFen=v;}
    public String getCurrencyCode(){return currencyCode;} public void setCurrencyCode(String v){currencyCode=v;}
    public Short getStatus(){return status;} public void setStatus(Short v){status=v;}
    public Instant getAppliedAt(){return appliedAt;} public void setAppliedAt(Instant v){appliedAt=v;}
    public Instant getReviewedAt(){return reviewedAt;} public void setReviewedAt(Instant v){reviewedAt=v;}
    public Long getReviewedBy(){return reviewedBy;} public void setReviewedBy(Long v){reviewedBy=v;}
    public String getReviewReason(){return reviewReason;} public void setReviewReason(String v){reviewReason=v;}
    public Instant getCompletedAt(){return completedAt;} public void setCompletedAt(Instant v){completedAt=v;}
    public Integer getVersion(){return version;} public void setVersion(Integer v){version=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Long getCreatedBy(){return createdBy;} public void setCreatedBy(Long v){createdBy=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
    public Long getUpdatedBy(){return updatedBy;} public void setUpdatedBy(Long v){updatedBy=v;}
}
