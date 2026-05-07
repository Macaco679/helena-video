import type { GenerationForm } from "./types";

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

export type HelenaUser = {
  id: string;
  email: string;
  name: string;
  plan: string;
  role: string;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  bio?: string | null;
};

export type HelenaProject = {
  id: string;
  title: string;
  status: string;
  aspectRatio: string;
  durationSeconds: number;
  creativeProfile: string;
  description?: string | null;
  templateId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type HelenaTemplate = {
  id: string;
  name: string;
  aspectRatio: string;
  durationSeconds: number;
  description: string;
};

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`/api/app${path}`, {
    method: options.method ?? "GET",
    credentials: "include",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const payload = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `Falha na API Helena (${response.status})`);
  }

  return payload;
}

export const helenaBackend = {
  health: () => apiRequest<{ status: string; database: string }>("/health"),
  me: () => apiRequest<{ user: HelenaUser | null }>("/auth/me"),
  login: (email: string, password: string) =>
    apiRequest<{ user: HelenaUser }>("/auth/login", { method: "POST", body: { email, password } }),
  register: (name: string, email: string, password: string) =>
    apiRequest<{ user: HelenaUser }>("/auth/register", { method: "POST", body: { name, email, password } }),
  logout: () => apiRequest<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  recover: (email: string) => apiRequest<{ ok: boolean; message: string }>("/auth/recover", { method: "POST", body: { email } }),
  account: () => apiRequest<{ user: HelenaUser; workspace: unknown }>("/account"),
  saveAccount: (data: Partial<HelenaUser>) =>
    apiRequest<{ user: HelenaUser }>("/account", { method: "PUT", body: data }),
  projects: () => apiRequest<{ projects: HelenaProject[] }>("/projects"),
  createProject: (data: Partial<HelenaProject>) =>
    apiRequest<{ project: HelenaProject }>("/projects", { method: "POST", body: data }),
  updateProject: (id: string, data: Partial<HelenaProject>) =>
    apiRequest<{ project: HelenaProject }>(`/projects/${id}`, { method: "PATCH", body: data }),
  templates: () => apiRequest<{ templates: HelenaTemplate[] }>("/templates"),
  useTemplate: (id: string) =>
    apiRequest<{ project: HelenaProject }>(`/templates/${id}/use`, { method: "POST" }),
  chat: (message: string) =>
    apiRequest<{ sessionId: string; message: string }>("/chat", { method: "POST", body: { message } }),
  savePublication: (data: { status: string; caption?: string; platforms?: string[]; scheduledAt?: string | null }) =>
    apiRequest<{ publication: unknown }>("/publications", { method: "POST", body: data }),
  recordJob: (form: GenerationForm, result: Record<string, unknown>) =>
    apiRequest<{ job: unknown }>("/jobs", {
      method: "POST",
      body: {
        externalJobId: String(result.job_id ?? result.id ?? ""),
        module: form.module,
        provider: form.preferredModel,
        status: String(result.status ?? "queued"),
        prompt: form.prompt,
        params: form,
        result
      }
    }),
  billing: () => apiRequest<{ plan: string; events: unknown[] }>("/billing"),
  createBillingEvent: (kind: string, amountCents = 0, metadata: Record<string, unknown> = {}) =>
    apiRequest<{ event: unknown }>("/billing", { method: "POST", body: { kind, amountCents, metadata } }),
  wallet: () => apiRequest<{ balanceCents: number; credits: number; transactions: unknown[] }>("/wallet"),
  walletAction: (kind: "credit" | "withdrawal", amountCents: number, description: string) =>
    apiRequest<{ transaction: unknown }>("/wallet", { method: "POST", body: { kind, amountCents, description } }),
  integrations: () => apiRequest<{ integrations: unknown[] }>("/integrations"),
  connectIntegration: (provider: string) =>
    apiRequest<{ integration: unknown }>("/integrations", {
      method: "POST",
      body: { provider, status: "pending", metadata: { requestedAt: new Date().toISOString() } }
    }),
  createApiKey: (label = "Production key") =>
    apiRequest<{ key: unknown; secret: string }>("/api-keys", { method: "POST", body: { label } }),
  recordAction: (area: string, action: string, metadata: Record<string, unknown> = {}) =>
    apiRequest<{ action: unknown }>("/actions", { method: "POST", body: { area, action, metadata } })
};
