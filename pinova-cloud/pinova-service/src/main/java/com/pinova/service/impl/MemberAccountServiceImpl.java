package com.pinova.service.impl;

import com.pinova.pojo.entity.MemberAccount;
import com.pinova.mapper.MemberAccountMapper;
import com.pinova.service.MemberAccountService;
import com.baomidou.mybatisplus.spring.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;

/**
 * <p>
 * 商城会员账户 服务实现类
 * </p>
 *
 * @author Pinova
 * @since 2026-07-14
 */
@Service
public class MemberAccountServiceImpl extends ServiceImpl<MemberAccountMapper, MemberAccount> implements MemberAccountService {

}
