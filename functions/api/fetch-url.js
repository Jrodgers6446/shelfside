const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept"
  };
}

function blockedHost(hostname) {
  const h = (hostname || "").toLowerCase();
  if (!h || h === "localhost") return true;
  if (h.endsWith(".local")) return true;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return true;
  if (/^169\.254\./.test(h) || /^0\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true;
  return false;
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders() });
  }

  const url = new URL(request.url).searchParams.get("url");
  if (!url) {
    return new Response("Missing url parameter", { status: 400, headers: corsHeaders() });
  }

  let target;
  try {
    target = new URL(url);
  } catch {
    return new Response("Invalid url", { status: 400, headers: corsHeaders() });
  }

  if (!/^https?:$/i.test(target.protocol)) {
    return new Response("Only http(s) urls allowed", { status: 400, headers: corsHeaders() });
  }
  if (blockedHost(target.hostname)) {
    return new Response("Blocked host", { status: 403, headers: corsHeaders() });
  }

  try {
    const r = await fetch(target.href, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,text/plain,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9"
      },
      redirect: "follow"
    });
    const body = await r.text();
    const ct = r.headers.get("content-type") || "text/html; charset=utf-8";
    return new Response(body, {
      status: r.ok ? 200 : Math.min(r.status, 599),
      headers: { ...corsHeaders(), "Content-Type": ct }
    });
  } catch {
    return new Response("Upstream fetch failed", { status: 502, headers: corsHeaders() });
  }
}
