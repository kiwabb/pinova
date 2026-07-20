package com.pinova.service;
import com.pinova.service.model.*;import java.util.List;
public interface AdminMemberService {
    List<AdminMemberResult> list(AuthenticatedAdminResult admin,String keyword,Short status);
    AdminMemberResult get(AuthenticatedAdminResult admin,String memberNo);
    AdminMemberResult changeStatus(AuthenticatedAdminResult admin,String memberNo,int version,short status,String reason);
    void revokeSessions(AuthenticatedAdminResult admin,String memberNo,String reason);
}
