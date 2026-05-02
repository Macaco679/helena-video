const baseCorsHeaders = {
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "access-control-allow-methods": "GET, POST, OPTIONS"
};

const routeMap = {
  "/health": "/health",
  "/capabilities": "/api/v1/capabilities",
  "/jobs/module1": "/api/v1/jobs/module1",
  "/jobs/module2": "/api/v1/jobs/module2",
  "/jobs/autocut": "/api/v1/jobs/autocut"
};

const allowedForwardHeaders = new Set(["accept", "content-type", "user-agent", "x-client-info"]);

export default async function handler(request, response) {
  const corsHeaders = resolveCorsHeaders(request);

  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  const apiBase = process.env.HELENA_VIDEO_API_URL;
  const apiKey = process.env.HELENA_VIDEO_API_KEY;

  if (!apiBase) {
    sendJson(response, 500, { error: "HELENA_VIDEO_API_URL is not configured" }, corsHeaders);
    return;
  }

  const incomingUrl = new URL(request.url, "https://helena-video.local");
  const route = normalizeRoute(request.query?.path, incomingUrl.pathname);
  const targetPath = routeMap[route];

  if (!targetPath) {
    sendJson(response, 404, { error: "Unsupported Helena Video API route", route }, corsHeaders);
    return;
  }

  if (request.method !== "GET" && request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" }, corsHeaders);
    return;
  }

  const headers = forwardHeaders(request.headers);
  if (apiKey) headers.set("X-API-Key", apiKey);

  const url = new URL(targetPath, apiBase);
  url.search = incomingUrl.search;

  let upstream;
  try {
    upstream = await fetch(url, {
      method: request.method,
      headers,
      body: request.method === "GET" ? undefined : await readBody(request)
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

  const body = Buffer.from(await upstream.arrayBuffer());
  response.end(body);
}

export const config = {
  api: {
    bodyParser: false
  }
};

function normalizeRoute(path, pathname) {
  const parts = Array.isArray(path) ? path : path ? [path] : [];
  const queryRoute = `/${parts.join("/")}`.replace(/\/+/g, "/");
  if (queryRoute !== "/") return queryRoute;
  return pathname.replace(/^\/api\/helena/, "") || "/";
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
