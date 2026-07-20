interface ApiEnvelope<T> {
  code: string;
  message: string;
  data: T;
}

interface ProblemBody {
  status?: number;
  detail?: string;
  title?: string;
  code?: string;
  traceId?: string;
  errors?: Array<{ field: string; message: string }>;
}

interface CsrfData {
  token: string;
  headerName: string;
}

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly traceId: string | null;
  readonly fieldErrors: ReadonlyArray<{ field: string; message: string }>;

  constructor(message: string, status: number, body?: ProblemBody) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
    this.code = body?.code ?? null;
    this.traceId = body?.traceId ?? null;
    this.fieldErrors = body?.errors ?? [];
  }
}

let csrfData: CsrfData | null = null;

async function loadCsrf(): Promise<CsrfData> {
  const response = await fetch("/api/admin/auth/csrf", { credentials: "include" });
  if (!response.ok) {
    throw new AdminApiError("无法初始化请求安全校验，请刷新页面", response.status);
  }
  const body = (await response.json()) as ApiEnvelope<CsrfData>;
  csrfData = body.data;
  return body.data;
}

export function clearAdminCsrf() {
  csrfData = null;
}

export async function adminApiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = csrfData ?? (await loadCsrf());
    headers.set(csrf.headerName, csrf.token);
  }

  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...init, method, headers, credentials: "include" });
  } catch {
    throw new AdminApiError("网络连接失败，请检查服务后重试", 0);
  }

  if (!response.ok) {
    let problem: ProblemBody | undefined;
    try {
      problem = (await response.json()) as ProblemBody;
    } catch {
      problem = undefined;
    }
    if (problem?.code === "ADMIN_AUTH.CSRF_INVALID") {
      clearAdminCsrf();
    }
    throw new AdminApiError(
      problem?.detail ?? problem?.title ?? `请求失败（${response.status}）`,
      response.status,
      problem,
    );
  }

  const body = (await response.json()) as ApiEnvelope<T>;
  return body.data;
}
