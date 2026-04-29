const corsHeaders = {
  "access-control-allow-origin": "*",
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

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  const apiBase = process.env.HELENA_VIDEO_API_URL || process.env.VITE_HELENA_VIDEO_API_URL;
  const apiKey = process.env.HELENA_VIDEO_API_KEY;

  if (!apiBase) {
    sendJson(response, 500, { error: "HELENA_VIDEO_API_URL is not configured" });
    return;
  }

  const route = normalizeRoute(request.query.path);
  const targetPath = routeMap[route];

  if (!targetPath) {
    sendJson(response, 404, { error: "Unsupported Helena Video API route", route });
    return;
  }

  if (request.method !== "GET" && request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (!value) continue;
    const lower = key.toLowerCase();
    if (["host", "content-length", "connection"].includes(lower)) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  if (apiKey) headers.set("X-API-Key", apiKey);

  const url = new URL(targetPath, apiBase);
  const incomingUrl = new URL(request.url, "https://helena-video.local");
  url.search = incomingUrl.search;

  const upstream = await fetch(url, {
    method: request.method,
    headers,
    body: request.method === "GET" ? undefined : await readBody(request)
  });

  response.statusCode = upstream.status;
  Object.entries(corsHeaders).forEach(([key, value]) => response.setHeader(key, value));
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

function normalizeRoute(path) {
  const parts = Array.isArray(path) ? path : path ? [path] : [];
  return `/${parts.join("/")}`.replace(/\/+/g, "/");
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function sendJson(response, status, payload) {
  response.statusCode = status;
  Object.entries(corsHeaders).forEach(([key, value]) => response.setHeader(key, value));
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(payload));
}
