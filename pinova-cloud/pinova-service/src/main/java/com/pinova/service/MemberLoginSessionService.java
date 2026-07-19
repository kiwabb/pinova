package com.pinova.service;

import com.pinova.pojo.entity.MemberLoginSession;
import com.baomidou.mybatisplus.spring.service.IService;
import com.pinova.service.command.LoginMemberCommand;
import com.pinova.service.command.RegisterMemberCommand;
import com.pinova.service.model.AuthenticatedMemberResult;
import com.pinova.service.model.MemberLoginResult;

/**
 * <p>
 * 会员不透明登录会话 服务类
 * </p>
 *
 * @author Pinova
 * @since 2026-07-17
 */
public interface MemberLoginSessionService extends IService<MemberLoginSession> {

    MemberLoginResult register(RegisterMemberCommand command);

    MemberLoginResult login(LoginMemberCommand command);

    AuthenticatedMemberResult authenticate(String rawToken);

    void logout(String rawToken);

}
