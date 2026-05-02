const allowedModules = new Set(["module1", "module2", "autocut"]);
const allowedForwardHeaders = new Set(["accept", "content-type", "user-agent", "x-client-info"]);

const baseCorsHeaders = {
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "access-control-allow-methods": "POST, OPTIONS"
};

export default async function handler(request, response) {
  const corsHeaders = resolveCorsHeaders(request);

  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" }, corsHeaders);
    return;
  }

  const module = resolveModule(request);
  if (!allowedModules.has(module)) {
    sendJson(response, 404, { error: "Unsupported Helena Video module", module }, corsHeaders);
    return;
  }

  const apiBase = process.env.HELENA_VIDEO_API_URL;
  const apiKey = process.env.HELENA_VIDEO_API_KEY;

  if (!apiBase) {
    sendJson(response, 500, { error: "HELENA_VIDEO_API_URL is not configured" }, corsHeaders);
    return;
  }

  const headers = forwardHeaders(request.headers);
  if (apiKey) headers.set("X-API-Key", apiKey);

  let upstream;
  try {
    upstream = await fetch(new URL(`/api/v1/jobs/${module}`, apiBase), {
      method: "POST",
      headers,
      body: await readBody(request)
    });
  } catch {
    sendJson(response, 502, { error: "Helena upstream is unavailable" }, corsHeaders);
    return;
  }

  response.statusCode = upstream.status;
  Object.entries(corsHeaders).forEach(([key, value]) => response.setHeader(key, value));
  response.setHeader("cache-control", "no-store");
  const contentType = upstream.headers.get("content-type");
  if (contentType) response.setHeader("content-type", contentType);
  response.end(Buffer.from(await upstream.arrayBuffer()));
}

export const config = {
  api: {
    bodyParser: false
  }
};

function resolveModule(request) {
  if (typeof request.query?.module === "string") return request.query.module;
  const url = new URL(request.url, "https://helena-video.local");
  return url.pathname.split("/").filter(Boolean).pop() || "";
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function forwardHeaders(source) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(source)) {
    if (!value) continue;
    if (!allowedForwardHeaders.has(key.toLowerCase())) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  return headers;
}

function resolveCorsHeaders(request) {
  const origin = request.headers.origin || "";
  const allowed = (process.env.HELENA_VIDEO_ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowOrigin = allowed.length === 0 || allowed.includes(origin) ? origin || "*" : "null";

  return {
    ...baseCorsHeaders,
    "access-control-allow-origin": allowOrigin,
    vary: "Origin"
  };
}

function sendJson(response, status, payload, corsHeaders) {
  response.statusCode = status;
  Object.entries(corsHeaders ?? resolveCorsHeaders({ headers: {} })).forEach(([key, value]) =>
    response.setHeader(key, value)
  );
  response.setHeader("content-type", "application/json");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(payload));
}
