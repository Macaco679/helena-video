const baseCorsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

const allowedForwardHeaders = new Set(["accept", "content-type", "user-agent", "x-client-info"]);

Deno.serve(async (request) => {
  const corsHeaders = resolveCorsHeaders(request);

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, corsHeaders);
  }

  const apiBase = Deno.env.get("HELENA_VIDEO_API_URL");
  const apiKey = Deno.env.get("HELENA_VIDEO_API_KEY");

  if (!apiBase) {
    return json({ error: "HELENA_VIDEO_API_URL is not configured" }, 500, corsHeaders);
  }

  const incomingUrl = new URL(request.url);
  const route = incomingUrl.pathname.split("/helena-video-proxy").pop() || "/";
  const targetPath = resolveTargetPath(route);

  if (!targetPath) {
    return json({ error: "Unsupported Helena Video proxy route" }, 404, corsHeaders);
  }

  const headers = forwardHeaders(request.headers);
  if (apiKey) headers.set("X-API-Key", apiKey);

  const targetUrl = new URL(targetPath, apiBase);
  targetUrl.search = incomingUrl.search;

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method === "GET" ? undefined : request.body
    });
  } catch {
    return json({ error: "Helena upstream is unavailable" }, 502, corsHeaders);
  }

  const responseHeaders = new Headers(corsHeaders);
  responseHeaders.set("cache-control", "no-store");
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders
  });
});

function resolveTargetPath(route: string) {
  if (route === "/health") return "/health";
  if (route === "/capabilities") return "/api/v1/capabilities";

  const jobMatch = route.match(/^\/jobs\/(module1|module2|autocut)$/);
  if (jobMatch) return `/api/v1/jobs/${jobMatch[1]}`;

  return null;
}

function forwardHeaders(source: Headers) {
  const headers = new Headers();
  for (const [key, value] of source.entries()) {
    if (!allowedForwardHeaders.has(key.toLowerCase())) continue;
    headers.set(key, value);
  }
  return headers;
}

function resolveCorsHeaders(request: Request) {
  const origin = request.headers.get("origin") || "";
  const allowed = (Deno.env.get("HELENA_VIDEO_ALLOWED_ORIGINS") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowOrigin = allowed.length === 0 || allowed.includes(origin) ? origin || "*" : "null";

  return {
    ...baseCorsHeaders,
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin"
  };
}

function json(payload: unknown, status = 200, corsHeaders = { ...baseCorsHeaders, "Access-Control-Allow-Origin": "*" }) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
      "cache-control": "no-store"
    }
  });
}
