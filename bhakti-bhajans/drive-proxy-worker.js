/**
 * Cloudflare Worker — Drive media proxy for My Music
 *
 * Deploy: `npx wrangler deploy drive-proxy-worker.js` (or paste into Workers dashboard).
 * Then set Media proxy in Sources to:
 *   https://YOUR_SUBDOMAIN.workers.dev/?id={id}
 *
 * Why: browsers send Sec-Fetch-Site: cross-site to drive.usercontent.google.com,
 * which Google answers with 403. This worker fetches server-side (no Sec-Fetch)
 * and returns the bytes with ACAO for cliren.github.io.
 */
export default {
  async fetch(request) {
    const origin = request.headers.get("Origin") || "";
    const allow =
      origin === "https://cliren.github.io" ||
      origin === "http://127.0.0.1:8080" ||
      origin === "http://localhost:8080" ||
      origin === "";

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin, allow),
      });
    }

    const url = new URL(request.url);
    const fileId = (url.searchParams.get("id") || "").trim();
    const confirm = (url.searchParams.get("confirm") || "t").trim() || "t";
    const targetParam = url.searchParams.get("url");

    let target;
    if (targetParam) {
      try {
        const u = new URL(targetParam);
        if (
          u.hostname !== "drive.usercontent.google.com" &&
          u.hostname !== "drive.google.com" &&
          u.hostname !== "docs.google.com"
        ) {
          return json({ error: "host not allowed" }, 400, origin, allow);
        }
        target = u.toString();
      } catch {
        return json({ error: "bad url" }, 400, origin, allow);
      }
    } else if (/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) {
      target = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(
        fileId
      )}&export=download&confirm=${encodeURIComponent(confirm)}`;
    } else {
      return json(
        { error: "pass ?id=FILE_ID or ?url=https://drive.usercontent.google.com/..." },
        400,
        origin,
        allow
      );
    }

    const range = request.headers.get("Range");
    const upstream = await fetch(target, {
      method: "GET",
      redirect: "follow",
      headers: range ? { Range: range } : {},
    });

    // Virus-scan HTML: parse confirm and retry once
    const ct = (upstream.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("text/html") && fileId) {
      const html = await upstream.text();
      const m =
        html.match(/confirm=([0-9A-Za-z_-]+)/) ||
        html.match(/name=["']confirm["']\s+value=["']([^"']+)["']/);
      if (m && m[1] && m[1] !== confirm) {
        const retryUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(
          fileId
        )}&export=download&confirm=${encodeURIComponent(m[1])}`;
        const retry = await fetch(retryUrl, {
          method: "GET",
          redirect: "follow",
          headers: range ? { Range: range } : {},
        });
        return passThrough(retry, origin, allow);
      }
      return json({ error: "drive returned HTML", snippet: html.slice(0, 200) }, 502, origin, allow);
    }

    return passThrough(upstream, origin, allow);
  },
};

function corsHeaders(origin, allow) {
  const h = {
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    "Access-Control-Allow-Headers": "Range, Content-Type, Accept",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range, Content-Type, Accept-Ranges",
    "Access-Control-Max-Age": "86400",
  };
  if (allow) {
    h["Access-Control-Allow-Origin"] = origin || "*";
  }
  return h;
}

function passThrough(upstream, origin, allow) {
  const headers = new Headers(upstream.headers);
  const cors = corsHeaders(origin, allow);
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  headers.delete("content-security-policy");
  headers.delete("cross-origin-resource-policy");
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers,
  });
}

function json(obj, status, origin, allow) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin, allow),
    },
  });
}
