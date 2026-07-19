export type MemberAuthenticationMode = "login" | "register";

export interface CurrentMember {
  id: string;
  memberNo: string;
  nickname: string;
  avatarUrl: string | null;
}

export interface AuthenticationFormValues {
  identifier: string;
  username: string;
  nickname: string;
  password: string;
  confirmPassword: string;
}

export interface LoginMemberInput {
  identifier: string;
  password: string;
}

export interface RegisterMemberInput {
  username: string;
  nickname: string;
  password: string;
  confirmPassword: string;
}
