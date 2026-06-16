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

function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export async function onRequest(context) {
  const { request } = context;
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }
  if (request.method !== "GET") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders() });
  }

  const reqUrl = new URL(request.url);
  const url = reqUrl.searchParams.get("url");
  const wantBin = reqUrl.searchParams.get("bin") === "1";
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
    const accept = wantBin
      ? "image/*,application/octet-stream,*/*"
      : "text/html,text/plain,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
    const r = await fetch(target.href, {
      headers: {
        "User-Agent": UA,
        Accept: accept,
        "Accept-Language": "en-US,en;q=0.9"
      },
      redirect: "follow"
    });
    const ct = r.headers.get("content-type") || "";
    const isImage = /^image\//i.test(ct);

    if (wantBin || isImage) {
      const buf = await r.arrayBuffer();
      if (wantBin) {
        return new Response(JSON.stringify({
          base64: bufToB64(buf),
          type: (ct.split(";")[0] || "application/octet-stream").trim()
        }), {
          status: r.ok ? 200 : Math.min(r.status, 599),
          headers: { ...corsHeaders(), "Content-Type": "application/json" }
        });
      }
      return new Response(buf, {
        status: r.ok ? 200 : Math.min(r.status, 599),
        headers: { ...corsHeaders(), "Content-Type": ct || "application/octet-stream" }
      });
    }

    const body = await r.text();
    return new Response(body, {
      status: r.ok ? 200 : Math.min(r.status, 599),
      headers: { ...corsHeaders(), "Content-Type": ct || "text/html; charset=utf-8" }
    });
  } catch {
    return new Response("Upstream fetch failed", { status: 502, headers: corsHeaders() });
  }
}
