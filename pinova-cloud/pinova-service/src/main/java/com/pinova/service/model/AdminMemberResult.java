package com.pinova.service.model;
import java.time.Instant;
public record AdminMemberResult(Long id,String memberNo,String username,String mobile,String email,String nickname,
                                String avatarUrl,short status,int version,Instant lastLoginAt,Instant createdAt) {}
