const MAX_BYTES = 20 * 1024 * 1024;
const TTL_SEC = 7 * 24 * 60 * 60;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Content-Encoding"
  };
}

function makeId() {
  const chars = "abcdefghijklmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let id = "";
  for (let i = 0; i < 10; i++) id += chars[bytes[i] % chars.length];
  return id;
}

async function readBodyText(request) {
  const ce = (request.headers.get("Content-Encoding") || "").toLowerCase();
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return "";
  if (ce.includes("gzip")) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("nogzip");
    }
    return await new Response(
      new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))
    ).text();
  }
  return new TextDecoder().decode(buf);
}

function validShelfJson(text) {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed?.books) || !parsed.books.length) {
    throw new Error("invalid");
  }
  return parsed;
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  const kv = env.SHELFSIDE_SHARE;
  if (!kv) {
    return new Response("Share storage not configured (bind SHELFSIDE_SHARE KV)", {
      status: 503,
      headers: corsHeaders()
    });
  }

  const url = new URL(request.url);

  if (request.method === "GET") {
    const id = (url.searchParams.get("id") || "").toLowerCase();
    if (!/^[a-z0-9]{6,12}$/.test(id)) {
      return new Response("Bad id", { status: 400, headers: corsHeaders() });
    }
    try {
      const data = await kv.get(id);
      if (!data) {
        return new Response("Shelf not found or expired", { status: 404, headers: corsHeaders() });
      }
      const download = url.searchParams.get("download") === "1";
      const headers = {
        ...corsHeaders(),
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      };
      if (download) {
        headers["Content-Disposition"] = `attachment; filename="shelfside-share-${id}.json"`;
      }
      return new Response(data, { status: 200, headers });
    } catch {
      return new Response("Storage error", { status: 500, headers: corsHeaders() });
    }
  }

  if (request.method === "POST") {
    let bodyText;
    try {
      bodyText = await readBodyText(request);
    } catch (err) {
      if (err?.message === "nogzip") {
        return new Response("Gzip not supported", { status: 415, headers: corsHeaders() });
      }
      return new Response("Bad body", { status: 400, headers: corsHeaders() });
    }
    if (!bodyText) {
      return new Response("Empty body", { status: 400, headers: corsHeaders() });
    }
    if (bodyText.length > MAX_BYTES) {
      return new Response("Shelf too large (max 20MB)", { status: 413, headers: corsHeaders() });
    }
    try {
      validShelfJson(bodyText);
    } catch {
      return new Response("Not a valid shelf file", { status: 400, headers: corsHeaders() });
    }

    const id = makeId();
    try {
      await kv.put(id, bodyText, { expirationTtl: TTL_SEC });
    } catch {
      return new Response("Upload failed", { status: 500, headers: corsHeaders() });
    }

    const shareUrl = `${url.origin}/?share=${id}`;
    const downloadUrl = `${url.origin}/api/share-shelf?id=${id}&download=1`;
    return new Response(JSON.stringify({ id, shareUrl, downloadUrl, expiresDays: 7 }), {
      status: 200,
      headers: { ...corsHeaders(), "Content-Type": "application/json" }
    });
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders() });
}
