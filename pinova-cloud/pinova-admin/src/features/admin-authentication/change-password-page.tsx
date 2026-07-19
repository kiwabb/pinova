import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Typography } from "antd";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { AdminApiError } from "../../lib/admin-api-client";
import { changeAdminPassword, ADMIN_SESSION_QUERY_KEY } from "./lib/admin-auth-api";
import { useAdminSession } from "./use-admin-session";
import styles from "./authentication.module.css";

const schema = z.object({
  currentPassword: z.string().min(1, "请输入临时密码"),
  newPassword: z.string().min(12, "新密码至少需要 12 个字符")
    .refine((value) => /[A-Za-z]/.test(value) && /\d/.test(value), "新密码必须同时包含字母和数字"),
  confirmPassword: z.string().min(1, "请再次输入新密码"),
}).refine((values) => values.newPassword === values.confirmPassword, {
  path: ["confirmPassword"],
  message: "两次输入的新密码不一致",
});

type PasswordValues = z.infer<typeof schema>;

export function ChangePasswordPage() {
  const admin = useAdminSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { control, handleSubmit } = useForm<PasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const changePassword = useMutation({
    mutationFn: changeAdminPassword,
    onSuccess: async () => {
      await queryClient.removeQueries({ queryKey: ADMIN_SESSION_QUERY_KEY });
      navigate("/login", { replace: true });
    },
  });

  return (
    <main className={styles.authPage}>
      <section className={styles.authPanel} aria-labelledby="change-password-title">
        <div className={styles.brandLine}>
          <span className={styles.brandMark} aria-hidden="true">P</span>
          <span>{admin.displayName}</span>
        </div>
        <Typography.Title id="change-password-title" level={1}>设置新密码</Typography.Title>
        <Typography.Paragraph type="secondary">
          临时管理员必须修改密码后才能访问订单数据。
        </Typography.Paragraph>
        {changePassword.error ? (
          <Alert
            className={styles.authAlert}
            message={changePassword.error.message}
            description={changePassword.error instanceof AdminApiError && changePassword.error.traceId
              ? `追踪编号：${changePassword.error.traceId}` : undefined}
            showIcon
            type="error"
          />
        ) : null}
        <Form
          layout="vertical"
          onFinish={() => void handleSubmit((values) => changePassword.mutate(values))()}
        >
          <PasswordField control={control} name="currentPassword" label="临时密码" autoComplete="current-password" />
          <PasswordField control={control} name="newPassword" label="新密码" autoComplete="new-password" />
          <PasswordField control={control} name="confirmPassword" label="确认新密码" autoComplete="new-password" />
          <Button block htmlType="submit" loading={changePassword.isPending} size="large" type="primary">
            保存并重新登录
          </Button>
        </Form>
      </section>
    </main>
  );
}

interface PasswordFieldProps {
  control: ReturnType<typeof useForm<PasswordValues>>["control"];
  name: keyof PasswordValues;
  label: string;
  autoComplete: string;
}

function PasswordField({ control, name, label, autoComplete }: PasswordFieldProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Form.Item
          label={label}
          validateStatus={fieldState.error ? "error" : undefined}
          help={fieldState.error?.message}
        >
          <Input.Password {...field} autoComplete={autoComplete} size="large" />
        </Form.Item>
      )}
    />
  );
}

