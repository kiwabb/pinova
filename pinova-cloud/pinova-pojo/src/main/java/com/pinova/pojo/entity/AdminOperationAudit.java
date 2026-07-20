package com.pinova.pojo.entity;

import com.baomidou.mybatisplus.annotation.*;
import com.pinova.pojo.typehandler.PostgreSqlJsonbStringTypeHandler;
import java.io.Serializable;
import java.time.Instant;

@TableName(value="admin_operation_audit",autoResultMap=true)
public class AdminOperationAudit implements Serializable {
    @TableId(value="id",type=IdType.ASSIGN_ID) private Long id;
    @TableField("operator_id") private Long operatorId; @TableField("domain_code") private String domainCode;
    @TableField("action_code") private String actionCode; @TableField("target_type") private String targetType;
    @TableField("target_id") private String targetId; @TableField("request_id") private String requestId;
    private String reason;
    @TableField(value="before_snapshot",typeHandler=PostgreSqlJsonbStringTypeHandler.class) private String beforeSnapshot;
    @TableField(value="after_snapshot",typeHandler=PostgreSqlJsonbStringTypeHandler.class) private String afterSnapshot;
    @TableField("occurred_at") private Instant occurredAt; @TableField("created_at") private Instant createdAt;
    @TableField("created_by") private Long createdBy; @TableField("updated_at") private Instant updatedAt;
    @TableField("updated_by") private Long updatedBy;
    public Long getId(){return id;} public void setId(Long v){id=v;}
    public Long getOperatorId(){return operatorId;} public void setOperatorId(Long v){operatorId=v;}
    public String getDomainCode(){return domainCode;} public void setDomainCode(String v){domainCode=v;}
    public String getActionCode(){return actionCode;} public void setActionCode(String v){actionCode=v;}
    public String getTargetType(){return targetType;} public void setTargetType(String v){targetType=v;}
    public String getTargetId(){return targetId;} public void setTargetId(String v){targetId=v;}
    public String getRequestId(){return requestId;} public void setRequestId(String v){requestId=v;}
    public String getReason(){return reason;} public void setReason(String v){reason=v;}
    public String getBeforeSnapshot(){return beforeSnapshot;} public void setBeforeSnapshot(String v){beforeSnapshot=v;}
    public String getAfterSnapshot(){return afterSnapshot;} public void setAfterSnapshot(String v){afterSnapshot=v;}
    public Instant getOccurredAt(){return occurredAt;} public void setOccurredAt(Instant v){occurredAt=v;}
    public Instant getCreatedAt(){return createdAt;} public void setCreatedAt(Instant v){createdAt=v;}
    public Long getCreatedBy(){return createdBy;} public void setCreatedBy(Long v){createdBy=v;}
    public Instant getUpdatedAt(){return updatedAt;} public void setUpdatedAt(Instant v){updatedAt=v;}
    public Long getUpdatedBy(){return updatedBy;} public void setUpdatedBy(Long v){updatedBy=v;}
}
