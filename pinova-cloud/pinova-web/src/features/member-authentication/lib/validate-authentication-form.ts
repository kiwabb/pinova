import type {
  AuthenticationFormValues,
  MemberAuthenticationMode,
} from "../types";

export type AuthenticationFieldErrors = Partial<
  Record<keyof AuthenticationFormValues, string>
>;

export function validateAuthenticationForm(
  mode: MemberAuthenticationMode,
  values: AuthenticationFormValues,
) {
  const errors: AuthenticationFieldErrors = {};
  if (mode === "login") {
    if (!values.identifier.trim()) errors.identifier = "请输入登录账号";
    if (!values.password) errors.password = "请输入密码";
    return errors;
  }

  const username = values.username.trim();
  if (!username) {
    errors.username = "请输入用户名";
  } else if (!/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(username)) {
    errors.username = "以字母开头，使用 4–32 位字母、数字或下划线";
  }
  if (values.nickname.trim().length > 64) {
    errors.nickname = "昵称不能超过 64 个字符";
  }
  if (!values.password) {
    errors.password = "请输入密码";
  } else if (Array.from(values.password).length < 8) {
    errors.password = "密码至少需要 8 个字符";
  } else if (new TextEncoder().encode(values.password).length > 72) {
    errors.password = "密码 UTF-8 编码后不能超过 72 字节";
  } else if (
    !/[\p{L}]/u.test(values.password) ||
    !/[\p{N}]/u.test(values.password)
  ) {
    errors.password = "密码需要同时包含字母和数字";
  }
  if (!values.confirmPassword) {
    errors.confirmPassword = "请再次输入密码";
  } else if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "两次输入的密码不一致";
  }
  return errors;
}
