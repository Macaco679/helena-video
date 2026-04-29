const allowedModules = new Set(["module1", "module2", "autocut"]);

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "access-control-allow-methods": "POST, OPTIONS"
};

export default async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders);
    response.end();
    return;
  }

  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const module = resolveModule(request);
  if (!allowedModules.has(module)) {
    sendJson(response, 404, { error: "Unsupported Helena Video module", module });
    return;
  }

  const apiBase = process.env.HELENA_VIDEO_API_URL || process.env.VITE_HELENA_VIDEO_API_URL;
  const apiKey = process.env.HELENA_VIDEO_API_KEY;

  if (!apiBase) {
    sendJson(response, 500, { error: "HELENA_VIDEO_API_URL is not configured" });
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

  const upstream = await fetch(new URL(`/api/v1/jobs/${module}`, apiBase), {
    method: "POST",
    headers,
    body: await readBody(request)
  });

  response.statusCode = upstream.status;
  Object.entries(corsHeaders).forEach(([key, value]) => response.setHeader(key, value));
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

function sendJson(response, status, payload) {
  response.statusCode = status;
  Object.entries(corsHeaders).forEach(([key, value]) => response.setHeader(key, value));
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(payload));
}
