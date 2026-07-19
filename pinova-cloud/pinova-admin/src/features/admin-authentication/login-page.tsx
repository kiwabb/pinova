import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Typography } from "antd";
import { Controller, useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

import { AdminApiError } from "../../lib/admin-api-client";
import { ADMIN_SESSION_QUERY_KEY, loginAdmin } from "./lib/admin-auth-api";
import styles from "./authentication.module.css";

const schema = z.object({
  username: z.string().trim().min(1, "请输入用户名").max(32, "用户名长度不能超过 32"),
  password: z.string().min(1, "请输入密码").max(72, "密码长度超出限制"),
});

type LoginValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { control, handleSubmit } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });
  const login = useMutation({
    mutationFn: loginAdmin,
    onSuccess: (admin) => {
      queryClient.setQueryData(ADMIN_SESSION_QUERY_KEY, admin);
      const requestedPath = getRequestedPath(location.state);
      navigate(admin.mustChangePassword ? "/change-password" : requestedPath, { replace: true });
    },
  });

  return (
    <main className={styles.authPage}>
      <section className={styles.authPanel} aria-labelledby="login-title">
        <div className={styles.brandLine}>
          <span className={styles.brandMark} aria-hidden="true">P</span>
          <span>Pinova 管理后台</span>
        </div>
        <Typography.Title id="login-title" level={1}>管理员登录</Typography.Title>
        {login.error ? <AuthenticationError error={login.error} /> : null}
        <Form layout="vertical" onFinish={() => void handleSubmit((values) => login.mutate(values))()}>
          <Controller
            control={control}
            name="username"
            render={({ field, fieldState }) => (
              <Form.Item
                label="用户名"
                validateStatus={fieldState.error ? "error" : undefined}
                help={fieldState.error?.message}
              >
                <Input {...field} autoComplete="username" size="large" />
              </Form.Item>
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <Form.Item
                label="密码"
                validateStatus={fieldState.error ? "error" : undefined}
                help={fieldState.error?.message}
              >
                <Input.Password {...field} autoComplete="current-password" size="large" />
              </Form.Item>
            )}
          />
          <Button block htmlType="submit" loading={login.isPending} size="large" type="primary">
            登录
          </Button>
        </Form>
      </section>
    </main>
  );
}

function AuthenticationError({ error }: { error: Error }) {
  const traceId = error instanceof AdminApiError ? error.traceId : null;
  return (
    <Alert
      className={styles.authAlert}
      message={error.message}
      description={traceId ? `追踪编号：${traceId}` : undefined}
      showIcon
      type="error"
    />
  );
}

function getRequestedPath(state: unknown) {
  if (typeof state === "object" && state !== null && "from" in state && typeof state.from === "string") {
    return state.from.startsWith("/") ? state.from : "/orders";
  }
  return "/orders";
}

