package com.pinova.service.impl;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.pinova.common.error.BusinessException;
import com.pinova.common.error.CommonErrorCode;
import com.pinova.mapper.AdminOperationAuditMapper;
import com.pinova.pojo.entity.AdminOperationAudit;
import com.pinova.service.AdminOperationAuditService;
import com.pinova.service.command.RecordAdminAuditCommand;
import com.pinova.service.model.*;
import com.pinova.service.AdminAuthorizationService;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import org.springframework.stereotype.Service;
import java.time.Instant;

@Service
public class AdminOperationAuditServiceImpl implements AdminOperationAuditService {
    private final AdminOperationAuditMapper auditMapper;
    private final AdminAuthorizationService authorizationService;
    public AdminOperationAuditServiceImpl(AdminOperationAuditMapper auditMapper,AdminAuthorizationService authorizationService) { this.auditMapper = auditMapper;this.authorizationService=authorizationService; }

    @Override
    public void record(RecordAdminAuditCommand command) {
        if (command == null || command.operatorId() == null || command.operatorId() <= 0
                || blank(command.domainCode()) || blank(command.actionCode())
                || blank(command.targetType()) || blank(command.targetId())) {
            throw new BusinessException(CommonErrorCode.INVALID_REQUEST, "后台审计参数无效");
        }
        Instant now = Instant.now();
        AdminOperationAudit audit = new AdminOperationAudit();
        audit.setId(IdWorker.getId()); audit.setOperatorId(command.operatorId());
        audit.setDomainCode(command.domainCode().trim()); audit.setActionCode(command.actionCode().trim());
        audit.setTargetType(command.targetType().trim()); audit.setTargetId(command.targetId().trim());
        audit.setRequestId(normalize(command.requestId())); audit.setReason(normalize(command.reason()));
        audit.setBeforeSnapshot(normalize(command.beforeSnapshot())); audit.setAfterSnapshot(normalize(command.afterSnapshot()));
        audit.setOccurredAt(now); audit.setCreatedAt(now); audit.setCreatedBy(command.operatorId());
        audit.setUpdatedAt(now); audit.setUpdatedBy(command.operatorId());
        auditMapper.insert(audit);
    }
    @Override public java.util.List<AdminAuditResult> list(AuthenticatedAdminResult admin,String domain,String action){authorizationService.requireSuperAdmin(admin);return auditMapper.selectList(Wrappers.lambdaQuery(AdminOperationAudit.class).eq(domain!=null&&!domain.isBlank(),AdminOperationAudit::getDomainCode,domain).eq(action!=null&&!action.isBlank(),AdminOperationAudit::getActionCode,action).orderByDesc(AdminOperationAudit::getOccurredAt).last("LIMIT 500")).stream().map(a->new AdminAuditResult(a.getId(),a.getOperatorId(),a.getDomainCode(),a.getActionCode(),a.getTargetType(),a.getTargetId(),a.getRequestId(),a.getReason(),a.getBeforeSnapshot(),a.getAfterSnapshot(),a.getOccurredAt())).toList();}
    private static boolean blank(String value) { return value == null || value.isBlank(); }
    private static String normalize(String value) { return blank(value) ? null : value.trim(); }
}
