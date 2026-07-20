package com.pinova.pojo.entity;

import com.baomidou.mybatisplus.annotation.*;
import java.io.Serializable;
import java.time.Instant;

@TableName("trade_order_fulfillment_log")
public class TradeOrderFulfillmentLog implements Serializable {
    @TableId(value = "id", type = IdType.ASSIGN_ID) private Long id;
    @TableField("order_id") private Long orderId;
    @TableField("request_key") private String requestKey;
    @TableField("action_type") private Short actionType;
    @TableField("status_before") private Short statusBefore;
    @TableField("status_after") private Short statusAfter;
    @TableField("carrier_code") private String carrierCode;
    @TableField("carrier_name") private String carrierName;
    @TableField("tracking_no") private String trackingNo;
    private String reason;
    @TableField("operator_type") private Short operatorType;
    @TableField("operator_id") private Long operatorId;
    @TableField("occurred_at") private Instant occurredAt;
    @TableField("created_at") private Instant createdAt;
    @TableField("created_by") private Long createdBy;
    @TableField("updated_at") private Instant updatedAt;
    @TableField("updated_by") private Long updatedBy;
    public Long getId(){return id;} public void setId(Long v){id=v;}
    public Long getOrderId(){return orderId;} public void setOrderId(Long v){orderId=v;}
    public String getRequestKey(){return requestKey;} public void setRequestKey(String v){requestKey=v;}
    public Short getActionType(){return actionType;} public void setActionType(Short v){actionType=v;}
    public Short getStatusBefore(){return statusBefore;} public void setStatusBefore(Short v){statusBefore=v;}
    public Short getStatusAfter(){return statusAfter;} public void setStatusAfter(Short v){statusAfter=v;}
    public String getCarrierCode(){return carrierCode;} public void setCarrierCode(String v){carrierCode=v;}
    public String getCarrierName(){return carrierName;} public void setCarrierName(String v){carrierName=v;}
    public String getTrackingNo(){return trackingNo;} public void setTrackingNo(String v){trackingNo=v;}
    public String getReason(){return reason;} public void setReason(String v){reason=v;}
    public Short getOperatorType(){return operatorType;} public void setOperatorType(Short v){operatorType=v;}
    public Long getOperatorId(){return operatorId;} public void setOperatorId(Long v){operatorId=v;}
    public Instant getOccurredAt(){return occurredAt;} public void setOccurredAt(Instant v){occurredAt=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Long getCreatedBy(){return createdBy;} public void setCreatedBy(Long v){createdBy=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
    public Long getUpdatedBy(){return updatedBy;} public void setUpdatedBy(Long v){updatedBy=v;}
}
