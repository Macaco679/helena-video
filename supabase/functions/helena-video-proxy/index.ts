const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiBase = Deno.env.get("HELENA_VIDEO_API_URL");
  const apiKey = Deno.env.get("HELENA_VIDEO_API_KEY");

  if (!apiBase) {
    return json({ error: "HELENA_VIDEO_API_URL is not configured" }, 500);
  }

  const incomingUrl = new URL(request.url);
  const route = incomingUrl.pathname.split("/helena-video-proxy").pop() || "/";
  const targetPath = resolveTargetPath(route);

  if (!targetPath) {
    return json({ error: "Unsupported Helena Video proxy route" }, 404);
  }

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");
  if (apiKey) headers.set("X-API-Key", apiKey);

  const targetUrl = new URL(targetPath, apiBase);
  targetUrl.search = incomingUrl.search;

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: request.method === "GET" ? undefined : request.body
  });

  const responseHeaders = new Headers(corsHeaders);
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders
  });
});

function resolveTargetPath(route: string) {
  if (route === "/capabilities") return "/api/v1/capabilities";

  const jobMatch = route.match(/^\/job\/(module1|module2|autocut)$/);
  if (jobMatch) return `/api/v1/jobs/${jobMatch[1]}`;

  return null;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json"
    }
  });
}
