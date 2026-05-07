import crypto from "node:crypto";
import { Pool } from "pg";

const sessionCookie = "helena_session";
const sessionDays = 14;
const jsonHeaders = { "content-type": "application/json", "cache-control": "no-store" };

let pool;

function getPool() {
  if (!process.env.DATABASE_URL) {
    const error = new Error("DATABASE_URL is not configured");
    error.statusCode = 503;
    throw error;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 4,
      ssl: process.env.DATABASE_URL.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined
    });
  }

  return pool;
}

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "access-control-allow-origin": request.headers.origin || "*",
      "access-control-allow-headers": "content-type, authorization",
      "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    });
    response.end();
    return;
  }

  try {
    const route = normalizeRoute(request);
    const body = ["POST", "PUT", "PATCH"].includes(request.method) ? await readJson(request) : {};
    const user = await currentUser(request);

    if (request.method === "GET" && route[0] === "health") {
      await query("select 1");
      send(response, 200, { status: "ok", service: "helena-app-api", database: "online" });
      return;
    }

    if (route[0] === "auth") {
      await handleAuth(request, response, route, body, user);
      return;
    }

    if (!user) {
      send(response, 401, { error: "Unauthorized" });
      return;
    }

    if (route[0] === "account") return handleAccount(request, response, body, user);
    if (route[0] === "projects") return handleProjects(request, response, route, body, user);
    if (route[0] === "templates") return handleTemplates(request, response, route, body, user);
    if (route[0] === "chat") return handleChat(request, response, body, user);
    if (route[0] === "publications") return handlePublications(request, response, route, body, user);
    if (route[0] === "jobs") return handleJobs(request, response, route, body, user);
    if (route[0] === "billing") return handleBilling(request, response, body, user);
    if (route[0] === "wallet") return handleWallet(request, response, body, user);
    if (route[0] === "integrations") return handleIntegrations(request, response, route, body, user);
    if (route[0] === "api-keys") return handleApiKeys(request, response, body, user);
    if (route[0] === "actions") return handleActions(request, response, body, user);

    send(response, 404, { error: "Route not found", route: route.join("/") });
  } catch (error) {
    const status = error.statusCode || 500;
    send(response, status, { error: status === 500 ? "Internal server error" : error.message });
  }
}

export const config = {
  api: {
    bodyParser: false
  }
};

async function handleAuth(request, response, route, body, user) {
  if (request.method === "GET" && route[1] === "me") {
    send(response, 200, { user: user ? publicUser(user) : null });
    return;
  }

  if (request.method === "POST" && route[1] === "register") {
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    if (!email || !password || password.length < 8) {
      send(response, 400, { error: "Informe e-mail e senha com pelo menos 8 caracteres." });
      return;
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(password, salt);
    const result = await query(
      `insert into public.helena_users (email, name, password_hash, password_salt)
       values ($1, $2, $3, $4)
       on conflict (email) do nothing
       returning id, email, name, plan, role, phone, company, job_title, bio`,
      [email, name || email.split("@")[0], passwordHash, salt]
    );

    if (!result.rows[0]) {
      send(response, 409, { error: "Este e-mail ja esta cadastrado." });
      return;
    }

    await ensureWorkspace(result.rows[0].id);
    await createSession(response, result.rows[0].id);
    send(response, 201, { user: publicUser(result.rows[0]) });
    return;
  }

  if (request.method === "POST" && route[1] === "login") {
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    const result = await query(
      `select id, email, name, plan, role, phone, company, job_title, bio, password_hash, password_salt
       from public.helena_users where email = $1`,
      [email]
    );
    const account = result.rows[0];
    if (!account || hashPassword(password, account.password_salt) !== account.password_hash) {
      send(response, 401, { error: "E-mail ou senha invalidos." });
      return;
    }

    await ensureWorkspace(account.id);
    await createSession(response, account.id);
    send(response, 200, { user: publicUser(account) });
    return;
  }

  if (request.method === "POST" && route[1] === "logout") {
    const token = readCookie(request, sessionCookie);
    if (token) await query("delete from public.helena_sessions where token_hash = $1", [hashToken(token)]);
    response.setHeader("set-cookie", clearCookie());
    send(response, 200, { ok: true });
    return;
  }

  if (request.method === "POST" && route[1] === "recover") {
    send(response, 200, { ok: true, message: "Se o e-mail existir, as instrucoes de recuperacao serao enviadas." });
    return;
  }

  send(response, 405, { error: "Method not allowed" });
}

async function handleAccount(request, response, body, user) {
  if (request.method === "GET") {
    send(response, 200, { user: publicUser(user), workspace: await workspaceFor(user.id) });
    return;
  }

  if (request.method === "PUT" || request.method === "PATCH") {
    const result = await query(
      `update public.helena_users
       set name = coalesce($2, name),
           phone = coalesce($3, phone),
           company = coalesce($4, company),
           job_title = coalesce($5, job_title),
           bio = coalesce($6, bio),
           updated_at = now()
       where id = $1
       returning id, email, name, plan, role, phone, company, job_title, bio`,
      [
        user.id,
        optionalText(body.name),
        optionalText(body.phone),
        optionalText(body.company),
        optionalText(body.jobTitle),
        optionalText(body.bio)
      ]
    );
    send(response, 200, { user: publicUser(result.rows[0]) });
    return;
  }

  send(response, 405, { error: "Method not allowed" });
}

async function handleProjects(request, response, route, body, user) {
  if (request.method === "GET") {
    const result = await query(
      `select id, title, status, aspect_ratio, duration_seconds, creative_profile, description, template_id, metadata, created_at, updated_at
       from public.helena_projects
       where app_user_id = $1
       order by updated_at desc
       limit 100`,
      [user.id]
    );
    send(response, 200, { projects: result.rows.map(projectDto) });
    return;
  }

  if (request.method === "POST") {
    const title = optionalText(body.title) || "Novo projeto Helena";
    const result = await query(
      `insert into public.helena_projects
       (app_user_id, title, status, aspect_ratio, duration_seconds, creative_profile, description, template_id, metadata)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
       returning id, title, status, aspect_ratio, duration_seconds, creative_profile, description, template_id, metadata, created_at, updated_at`,
      [
        user.id,
        title,
        optionalText(body.status) || "draft",
        optionalText(body.aspectRatio) || "9:16",
        Number(body.durationSeconds || 18),
        optionalText(body.creativeProfile) || "social-premium",
        optionalText(body.description),
        optionalText(body.templateId),
        JSON.stringify(body.metadata || {})
      ]
    );
    send(response, 201, { project: projectDto(result.rows[0]) });
    return;
  }

  if ((request.method === "PATCH" || request.method === "PUT") && route[1]) {
    const result = await query(
      `update public.helena_projects
       set title = coalesce($3, title),
           status = coalesce($4, status),
           aspect_ratio = coalesce($5, aspect_ratio),
           duration_seconds = coalesce($6, duration_seconds),
           description = coalesce($7, description),
           metadata = coalesce($8::jsonb, metadata),
           updated_at = now()
       where id = $2 and app_user_id = $1
       returning id, title, status, aspect_ratio, duration_seconds, creative_profile, description, template_id, metadata, created_at, updated_at`,
      [
        user.id,
        route[1],
        optionalText(body.title),
        optionalText(body.status),
        optionalText(body.aspectRatio),
        body.durationSeconds ? Number(body.durationSeconds) : null,
        optionalText(body.description),
        body.metadata ? JSON.stringify(body.metadata) : null
      ]
    );
    if (!result.rows[0]) return send(response, 404, { error: "Projeto nao encontrado." });
    send(response, 200, { project: projectDto(result.rows[0]) });
    return;
  }

  send(response, 405, { error: "Method not allowed" });
}

async function handleTemplates(request, response, route, body, user) {
  const templates = templateCatalog();
  if (request.method === "GET") return send(response, 200, { templates });

  if (request.method === "POST" && route[1] && route[2] === "use") {
    const template = templates.find((item) => item.id === route[1]);
    if (!template) return send(response, 404, { error: "Template nao encontrado." });
    const result = await query(
      `insert into public.helena_projects
       (app_user_id, title, status, aspect_ratio, duration_seconds, creative_profile, description, template_id, metadata)
       values ($1, $2, 'draft', $3, $4, 'template', $5, $6, $7::jsonb)
       returning id, title, status, aspect_ratio, duration_seconds, creative_profile, description, template_id, metadata, created_at, updated_at`,
      [user.id, template.name, template.aspectRatio, template.durationSeconds, template.description, template.id, JSON.stringify({ template })]
    );
    send(response, 201, { project: projectDto(result.rows[0]) });
    return;
  }

  send(response, 405, { error: "Method not allowed" });
}

async function handleChat(request, response, body, user) {
  if (request.method !== "POST") return send(response, 405, { error: "Method not allowed" });
  const message = optionalText(body.message);
  if (!message) return send(response, 400, { error: "Mensagem obrigatoria." });

  const sessionResult = await query(
    `insert into public.helena_chat_sessions (app_user_id, agent_name)
     values ($1, 'Helena IA')
     returning id`,
    [user.id]
  );
  const sessionId = sessionResult.rows[0].id;
  const assistant = buildAssistantReply(message);
  await query(
    `insert into public.helena_chat_messages (session_id, app_user_id, role, content)
     values ($1, $2, 'user', $3), ($1, $2, 'assistant', $4)`,
    [sessionId, user.id, message, assistant]
  );
  send(response, 201, { sessionId, message: assistant });
}

async function handlePublications(request, response, route, body, user) {
  if (request.method === "GET") {
    const result = await query(
      `select id, project_id, platform, platforms, status, caption, scheduled_at, result, created_at, updated_at
       from public.helena_publications
       where app_user_id = $1
       order by created_at desc
       limit 100`,
      [user.id]
    );
    send(response, 200, { publications: result.rows });
    return;
  }

  if (request.method === "POST") {
    const platforms = Array.isArray(body.platforms) ? body.platforms.map(String) : [optionalText(body.platform) || "draft"];
    const projectId = body.projectId || await ensureDefaultProject(user.id);
    const result = await query(
      `insert into public.helena_publications
       (app_user_id, project_id, platform, platforms, status, caption, scheduled_at, result)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
       returning id, project_id, platform, platforms, status, caption, scheduled_at, result, created_at, updated_at`,
      [
        user.id,
        projectId,
        platforms[0],
        platforms,
        optionalText(body.status) || "draft",
        optionalText(body.caption),
        body.scheduledAt || null,
        JSON.stringify(body.result || {})
      ]
    );
    send(response, 201, { publication: result.rows[0] });
    return;
  }

  send(response, 405, { error: "Method not allowed" });
}

async function handleJobs(request, response, route, body, user) {
  if (request.method === "GET") {
    const result = await query(
      `select id, external_job_id, module, provider, status, prompt, params, result, error, created_at, updated_at
       from public.helena_generation_jobs
       where app_user_id = $1
       order by created_at desc
       limit 100`,
      [user.id]
    );
    send(response, 200, { jobs: result.rows });
    return;
  }

  if (request.method === "POST") {
    const result = await query(
      `insert into public.helena_generation_jobs
       (app_user_id, external_job_id, module, provider, status, prompt, params, result)
       values ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
       returning id, external_job_id, module, provider, status, prompt, params, result, created_at, updated_at`,
      [
        user.id,
        optionalText(body.externalJobId),
        optionalText(body.module) || "module2",
        optionalText(body.provider) || "helena-native",
        optionalText(body.status) || "queued",
        optionalText(body.prompt) || "",
        JSON.stringify(body.params || {}),
        JSON.stringify(body.result || {})
      ]
    );
    send(response, 201, { job: result.rows[0] });
    return;
  }

  send(response, 405, { error: "Method not allowed" });
}

async function handleBilling(request, response, body, user) {
  if (request.method === "GET") {
    const events = await query(
      `select kind, amount_cents, status, metadata, created_at
       from public.helena_billing_events
       where app_user_id = $1
       order by created_at desc
       limit 25`,
      [user.id]
    );
    send(response, 200, { plan: user.plan, events: events.rows });
    return;
  }

  if (request.method === "POST") {
    const result = await query(
      `insert into public.helena_billing_events (app_user_id, kind, amount_cents, status, metadata)
       values ($1, $2, $3, 'pending', $4::jsonb)
       returning id, kind, amount_cents, status, metadata, created_at`,
      [user.id, optionalText(body.kind) || "checkout", Number(body.amountCents || 0), JSON.stringify(body.metadata || {})]
    );
    send(response, 201, { event: result.rows[0] });
    return;
  }

  send(response, 405, { error: "Method not allowed" });
}

async function handleWallet(request, response, body, user) {
  if (request.method === "GET") {
    const result = await query(
      `select kind, amount_cents, description, status, created_at
       from public.helena_wallet_ledger
       where app_user_id = $1
       order by created_at desc
       limit 50`,
      [user.id]
    );
    const balanceCents = result.rows.reduce((total, row) => total + (row.kind === "debit" || row.kind === "withdrawal" ? -row.amount_cents : row.amount_cents), 0);
    send(response, 200, { balanceCents, credits: Math.floor(balanceCents / 100), transactions: result.rows });
    return;
  }

  if (request.method === "POST") {
    const result = await query(
      `insert into public.helena_wallet_ledger (app_user_id, kind, amount_cents, description, status)
       values ($1, $2, $3, $4, 'pending')
       returning id, kind, amount_cents, description, status, created_at`,
      [user.id, optionalText(body.kind) || "credit", Number(body.amountCents || 0), optionalText(body.description) || "Solicitacao Helena"]
    );
    send(response, 201, { transaction: result.rows[0] });
    return;
  }

  send(response, 405, { error: "Method not allowed" });
}

async function handleIntegrations(request, response, route, body, user) {
  if (request.method === "GET") {
    const result = await query(
      `select provider, status, metadata, created_at, updated_at
       from public.helena_integrations
       where app_user_id = $1
       order by provider asc`,
      [user.id]
    );
    send(response, 200, { integrations: result.rows });
    return;
  }

  if (request.method === "POST") {
    const provider = optionalText(body.provider) || route[1];
    if (!provider) return send(response, 400, { error: "Provider obrigatorio." });
    const result = await query(
      `insert into public.helena_integrations (app_user_id, provider, status, metadata)
       values ($1, $2, $3, $4::jsonb)
       on conflict (app_user_id, provider)
       do update set status = excluded.status, metadata = excluded.metadata, updated_at = now()
       returning provider, status, metadata, created_at, updated_at`,
      [user.id, provider, optionalText(body.status) || "pending", JSON.stringify(body.metadata || {})]
    );
    send(response, 200, { integration: result.rows[0] });
    return;
  }

  send(response, 405, { error: "Method not allowed" });
}

async function handleApiKeys(request, response, body, user) {
  if (request.method === "GET") {
    const result = await query(
      `select id, label, key_prefix, created_at, revoked_at
       from public.helena_api_keys
       where app_user_id = $1
       order by created_at desc`,
      [user.id]
    );
    send(response, 200, { keys: result.rows });
    return;
  }

  if (request.method === "POST") {
    const raw = `hv_${crypto.randomBytes(24).toString("base64url")}`;
    const result = await query(
      `insert into public.helena_api_keys (app_user_id, label, key_prefix, key_hash)
       values ($1, $2, $3, $4)
       returning id, label, key_prefix, created_at`,
      [user.id, optionalText(body.label) || "Production key", raw.slice(0, 10), hashToken(raw)]
    );
    send(response, 201, { key: result.rows[0], secret: raw });
    return;
  }

  send(response, 405, { error: "Method not allowed" });
}

async function handleActions(request, response, body, user) {
  if (request.method === "GET") {
    const result = await query(
      `select area, action, metadata, created_at
       from public.helena_action_events
       where app_user_id = $1
       order by created_at desc
       limit 100`,
      [user.id]
    );
    send(response, 200, { actions: result.rows });
    return;
  }

  if (request.method === "POST") {
    const result = await query(
      `insert into public.helena_action_events (app_user_id, area, action, metadata)
       values ($1, $2, $3, $4::jsonb)
       returning id, area, action, metadata, created_at`,
      [
        user.id,
        optionalText(body.area) || "workspace",
        optionalText(body.action) || "action",
        JSON.stringify(body.metadata || {})
      ]
    );
    send(response, 201, { action: result.rows[0] });
    return;
  }

  send(response, 405, { error: "Method not allowed" });
}

function normalizeRoute(request) {
  const url = new URL(request.url || "/", `https://${request.headers.host || "localhost"}`);
  const fromUrl = url.pathname
    .replace(/^\/api\/app\/?/, "")
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean);

  if (fromUrl.length) return fromUrl;

  const path = request.query?.path;
  return (Array.isArray(path) ? path : path ? [path] : [])
    .join("/")
    .split("/")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function currentUser(request) {
  const token = readCookie(request, sessionCookie);
  if (!token) return null;
  const result = await query(
    `select u.id, u.email, u.name, u.plan, u.role, u.phone, u.company, u.job_title, u.bio
     from public.helena_sessions s
     join public.helena_users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()
     limit 1`,
    [hashToken(token)]
  );
  return result.rows[0] || null;
}

async function createSession(response, userId) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
  await query(
    "insert into public.helena_sessions (user_id, token_hash, expires_at) values ($1, $2, $3)",
    [userId, hashToken(token), expiresAt.toISOString()]
  );
  response.setHeader("set-cookie", serializeCookie(token, expiresAt));
}

async function ensureWorkspace(userId) {
  await query(
    `insert into public.helena_workspaces (owner_user_id, name)
     values ($1, 'Helena Studio')
     on conflict do nothing`,
    [userId]
  );
}

async function ensureDefaultProject(userId) {
  const existing = await query(
    `select id from public.helena_projects
     where app_user_id = $1
     order by updated_at desc
     limit 1`,
    [userId]
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const created = await query(
    `insert into public.helena_projects (app_user_id, title, status, aspect_ratio, duration_seconds, creative_profile)
     values ($1, 'Projeto Helena', 'draft', '9:16', 18, 'social-premium')
     returning id`,
    [userId]
  );
  return created.rows[0].id;
}

async function workspaceFor(userId) {
  const result = await query(
    `select id, name, settings, created_at, updated_at
     from public.helena_workspaces
     where owner_user_id = $1
     order by created_at asc
     limit 1`,
    [userId]
  );
  return result.rows[0] || null;
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function readCookie(request, name) {
  const cookie = request.headers.cookie || "";
  const match = cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function serializeCookie(token, expiresAt) {
  return `${sessionCookie}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure; Expires=${expiresAt.toUTCString()}`;
}

function clearCookie() {
  return `${sessionCookie}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function optionalText(value) {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    plan: user.plan,
    role: user.role,
    phone: user.phone,
    company: user.company,
    jobTitle: user.job_title,
    bio: user.bio
  };
}

function projectDto(row) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    aspectRatio: row.aspect_ratio,
    durationSeconds: row.duration_seconds,
    creativeProfile: row.creative_profile,
    description: row.description,
    templateId: row.template_id,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function templateCatalog() {
  return [
    { id: "launch-product", name: "Lancamento de Produto", aspectRatio: "9:16", durationSeconds: 30, description: "Campanha social para produto novo." },
    { id: "social-promo", name: "Promocao Social", aspectRatio: "9:16", durationSeconds: 20, description: "Oferta curta com CTA direto." },
    { id: "clean-institutional", name: "Institucional Clean", aspectRatio: "16:9", durationSeconds: 45, description: "Video de marca com ritmo premium." },
    { id: "tutorial", name: "Tutorial Passo a Passo", aspectRatio: "16:9", durationSeconds: 60, description: "Aula curta com capitulos e legenda." }
  ];
}

function buildAssistantReply(message) {
  const lower = message.toLowerCase();
  if (lower.includes("legenda")) return "Estruturei a legenda em abertura forte, quebra por cena e CTA final. Salvei a direcao para o projeto atual.";
  if (lower.includes("roteiro")) return "Montei um roteiro em 6 cenas: gancho, contexto, demonstracao, prova, oferta e chamada final.";
  if (lower.includes("music") || lower.includes("trilha")) return "Sugeri trilha moderna com cortes no beat, master em -14 LUFS e respiros para locucao.";
  return "Transformei sua ideia em direcao criativa, storyboard e checklist de producao para o proximo job Helena.";
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      if (!text) return resolve({});
      try {
        resolve(JSON.parse(text));
      } catch (error) {
        error.statusCode = 400;
        error.message = "JSON invalido.";
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

async function query(sql, params = []) {
  return getPool().query(sql, params);
}

function send(response, status, payload) {
  response.statusCode = status;
  Object.entries(jsonHeaders).forEach(([key, value]) => response.setHeader(key, value));
  response.end(JSON.stringify(payload));
}
