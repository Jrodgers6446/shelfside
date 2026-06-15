const { getStore } = require("@netlify/blobs");

const MAX_BYTES = 5 * 1024 * 1024;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function makeId() {
  const chars = "abcdefghijklmnopqrstuvwxyz23456789";
  let id = "";
  for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod === "GET") {
    const id = (event.queryStringParameters?.id || "").toLowerCase();
    if (!/^[a-z0-9]{6,12}$/.test(id)) {
      return { statusCode: 400, headers: corsHeaders(), body: "Bad id" };
    }
    try {
      const store = getStore("shared-shelves");
      const data = await store.get(id, { type: "text" });
      if (!data) {
        return { statusCode: 404, headers: corsHeaders(), body: "Shelf not found or expired" };
      }
      return {
        statusCode: 200,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
        body: data
      };
    } catch (err) {
      return { statusCode: 500, headers: corsHeaders(), body: "Storage error" };
    }
  }

  if (event.httpMethod === "POST") {
    const body = event.body || "";
    if (!body) {
      return { statusCode: 400, headers: corsHeaders(), body: "Empty body" };
    }
    if (body.length > MAX_BYTES) {
      return { statusCode: 413, headers: corsHeaders(), body: "Shelf too large (max 5MB)" };
    }
    try {
      const parsed = JSON.parse(body);
      if (!Array.isArray(parsed?.books) || !parsed.books.length) {
        return { statusCode: 400, headers: corsHeaders(), body: "Not a valid shelf file" };
      }
    } catch (err) {
      return { statusCode: 400, headers: corsHeaders(), body: "Invalid JSON" };
    }

    const id = makeId();
    try {
      const store = getStore("shared-shelves");
      await store.set(id, body, { metadata: { created: String(Date.now()) } });
      const host = event.headers.host || event.headers.Host || "";
      const proto = event.headers["x-forwarded-proto"] || "https";
      const base = host ? `${proto}://${host}` : "";
      const shareUrl = `${base}/?friend=${id}`;
      return {
        statusCode: 200,
        headers: { ...corsHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id, shareUrl })
      };
    } catch (err) {
      return { statusCode: 500, headers: corsHeaders(), body: "Upload failed" };
    }
  }

  return { statusCode: 405, headers: corsHeaders(), body: "Method not allowed" };
};
