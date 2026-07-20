package com.pinova.service;
import com.pinova.service.command.RecordAdminAuditCommand;import com.pinova.service.model.*;import java.util.List;
public interface AdminOperationAuditService { void record(RecordAdminAuditCommand command); List<AdminAuditResult> list(AuthenticatedAdminResult admin,String domainCode,String actionCode); }
