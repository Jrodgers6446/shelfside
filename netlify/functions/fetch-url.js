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

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, headers: corsHeaders(), body: "Method not allowed" };
  }

  const url = event.queryStringParameters?.url;
  if (!url) {
    return { statusCode: 400, headers: corsHeaders(), body: "Missing url parameter" };
  }

  let target;
  try {
    target = new URL(url);
  } catch {
    return { statusCode: 400, headers: corsHeaders(), body: "Invalid url" };
  }

  if (!/^https?:$/i.test(target.protocol)) {
    return { statusCode: 400, headers: corsHeaders(), body: "Only http(s) urls allowed" };
  }
  if (blockedHost(target.hostname)) {
    return { statusCode: 403, headers: corsHeaders(), body: "Blocked host" };
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
    return {
      statusCode: r.ok ? 200 : Math.min(r.status, 599),
      headers: { ...corsHeaders(), "Content-Type": ct },
      body
    };
  } catch (err) {
    return { statusCode: 502, headers: corsHeaders(), body: "Upstream fetch failed" };
  }
};
