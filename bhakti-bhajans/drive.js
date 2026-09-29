/**
 * Google Drive folder import for My Music (static GitHub Pages).
 *
 * Listing: with unlock password (API key) → Drive files.list (complete + resourceKey).
 * Keyless fallback: embeddedfolderview via jina/allorigins — MERGE results (jina often
 * truncates mid-folder). Paste multi-line file links as last resort.
 *
 * Playback (browser): drive.usercontent.google.com rejects cross-site requests
 * (Sec-Fetch-Site: cross-site → 403). Use either:
 *   1) Drive API key → googleapis.com/.../files/ID?alt=media (CORS OK)
 *   2) Media proxy URL template (Cloudflare Worker — drive-proxy-worker.js)
 * Direct usercontent fetch is still attempted (virus-scan confirm retry) for
 * environments that are not blocked.
 *
 * localStorage:
 *   myMusic.drive.v1         — [{ id, url, name?, addedAt }]
 *   myMusic.driveCache.v1    — { refreshedAt, tracks: [...] }
 *   myMusic.drive.seeded     — "1" after example folder auto-add
 *   myMusic.driveApiKey      — unlock password (localStorage ONLY; never commit)
 *   Unlock screen writes this; getApiKey() reads it. Clear library does NOT remove it.
 *   myMusic.drive.mediaProxy — optional proxy template with {id} or {url}
 */
(function (global) {
  const FOLDERS_KEY = "myMusic.drive.v1";
  const CACHE_KEY = "myMusic.driveCache.v1";
  const SEEDED_KEY = "myMusic.drive.seeded";
  const API_KEY_STORAGE = "myMusic.driveApiKey";
  const MEDIA_PROXY_STORAGE = "myMusic.drive.mediaProxy";
  const EXAMPLE_FOLDER_ID = "1YT5oul30_jT5YoReVY9Snz9FS9KEhuAB";
  const EXAMPLE_FOLDER_NAME = "Songs-Surender";

  // NEVER commit a real key. getApiKey() reads localStorage only (set at unlock).

  const AUDIO_EXT_RE = /\.(mp3|m4a|wav|ogg|flac|aac)$/i;
  const CAT_MAP = { bhakti: "bhakti", folk: "folk", other: "other" };

  const extractFolderId = (urlOrId) => {
    const raw = String(urlOrId || "").trim();
    if (!raw) return null;
    if (/^[a-zA-Z0-9_-]{10,}$/.test(raw) && !/[\/\s]/.test(raw)) return raw;
    const m =
      raw.match(/\/folders\/([a-zA-Z0-9_-]+)/) ||
      raw.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  };

  const extractFileId = (urlOrId) => {
    const raw = String(urlOrId || "").trim();
    if (!raw) return null;
    if (/^[a-zA-Z0-9_-]{10,}$/.test(raw) && !/[\/\s]/.test(raw)) return raw;
    const m =
      raw.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      raw.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
      raw.match(/\/uc\?.*?id=([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  };

  /** Optional resourcekey= from a shared Drive link (needed for some link-only files). */
  const extractResourceKey = (urlOrId) => {
    const raw = String(urlOrId || "");
    const m = raw.match(/[?&]resourcekey=([a-zA-Z0-9_-]+)/i);
    return m ? m[1] : "";
  };

  /** Build X-Goog-Drive-Resource-Keys from [[id, key], ...]. */
  const resourceKeysHeaderValue = (pairs) => {
    const parts = [];
    (pairs || []).forEach((p) => {
      if (!p) return;
      const id = p[0] || p.id;
      const key = p[1] || p.resourceKey || p.key;
      if (id && key) parts.push(String(id) + "/" + String(key));
    });
    return parts.length ? parts.join(",") : "";
  };

  const loadFolders = () => {
    try {
      const raw = localStorage.getItem(FOLDERS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.filter((f) => f && f.id) : [];
    } catch (_) {
      return [];
    }
  };

  const saveFolders = (folders) => {
    try {
      localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
    } catch (_) { /* quota */ }
  };

  const loadCache = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return { refreshedAt: null, tracks: [] };
      const data = JSON.parse(raw);
      return {
        refreshedAt: data.refreshedAt || null,
        tracks: Array.isArray(data.tracks) ? data.tracks : [],
      };
    } catch (_) {
      return { refreshedAt: null, tracks: [] };
    }
  };

  const saveCache = (tracks) => {
    const payload = {
      refreshedAt: new Date().toISOString(),
      tracks: tracks || [],
    };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
    } catch (_) { /* quota */ }
    return payload;
  };

  const folderUrl = (id) => `https://drive.google.com/drive/folders/${id}`;
  const embeddedUrl = (id) =>
    `https://drive.google.com/embeddedfolderview?id=${encodeURIComponent(id)}`;

  const addFolder = (urlOrId, name) => {
    const id = extractFolderId(urlOrId);
    if (!id) throw new Error("Could not find a Drive folder id in that URL.");
    const folders = loadFolders();
    if (folders.some((f) => f.id === id)) {
      return { folders, folder: folders.find((f) => f.id === id), added: false };
    }
    const folder = {
      id,
      url: folderUrl(id),
      name: name || "",
      resourceKey: extractResourceKey(urlOrId) || "",
      addedAt: new Date().toISOString(),
    };
    folders.push(folder);
    saveFolders(folders);
    return { folders, folder, added: true };
  };

  const removeFolder = (id) => {
    const folders = loadFolders().filter((f) => f.id !== id);
    saveFolders(folders);
    return folders;
  };

  const updateFolderName = (id, name) => {
    const folders = loadFolders().map((f) =>
      f.id === id ? { ...f, name: name || f.name || "" } : f
    );
    saveFolders(folders);
    return folders;
  };

  /** Ensure the public example folder is linked once (can still be removed). */
  const ensureExampleFolder = () => {
    try {
      if (localStorage.getItem(SEEDED_KEY) === "1") {
        return { seeded: false, folders: loadFolders() };
      }
    } catch (_) { /* ignore */ }
    const result = addFolder(EXAMPLE_FOLDER_ID, EXAMPLE_FOLDER_NAME);
    try {
      localStorage.setItem(SEEDED_KEY, "1");
    } catch (_) { /* ignore */ }
    return { seeded: result.added, folders: result.folders, folder: result.folder };
  };

  /** API key from localStorage only — never from a committed default. */
  const getStoredApiKey = () => {
    try {
      return (localStorage.getItem(API_KEY_STORAGE) || "").trim();
    } catch (_) {
      return "";
    }
  };

  /** No embedded default (secrets must not be committed). Kept for API compat. */
  const hasDefaultApiKey = () => false;

  const hasApiKeyOverride = () => Boolean(getStoredApiKey());

  /** localStorage only (myMusic.driveApiKey — written by unlock screen). */
  const getApiKey = () => getStoredApiKey();

  const setApiKey = (value) => {
    const v = String(value || "").trim();
    try {
      if (v) localStorage.setItem(API_KEY_STORAGE, v);
      else localStorage.removeItem(API_KEY_STORAGE);
    } catch (_) { /* quota */ }
    return getApiKey();
  };

  /**
   * Prove the unlock password is accepted by Google Drive without needing
   * private library listing (API-key-only files.list often 403s with
   * insufficientFilePermissions even for a valid key — that must unlock).
   * Uses files.get on a sentinel id: 404 = key accepted; never logs the key.
   * User-facing messages stay password-only (never say "API key").
   */
  const validateApiKey = async (rawKey) => {
    const key = String(rawKey || "").trim();
    if (!key) {
      const err = new Error("Enter your password.");
      err.code = "empty";
      throw err;
    }
    // Soft shape check only — real proof is the API response.
    if (!/^AIza[0-9A-Za-z_-]{20,}$/.test(key)) {
      const err = new Error("Wrong password.");
      err.code = "shape";
      throw err;
    }
    // Sentinel files.get: valid key → 404 (or 200); invalid → 400 API_KEY_INVALID.
    // Keep default referrer so HTTP-referrer-restricted passwords work on this origin.
    const url =
      "https://www.googleapis.com/drive/v3/files/__my_music_key_check__?fields=id&key=" +
      encodeURIComponent(key);
    let res;
    try {
      res = await fetch(url, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        referrerPolicy: "no-referrer-when-downgrade",
      });
    } catch (_) {
      const err = new Error(
        "Could not check the password. Check your connection and try again."
      );
      err.code = "network";
      throw err;
    }
    // Auth worked: file missing is expected; empty/private library must still unlock.
    if (res.ok || res.status === 404) return true;

    let apiMsg = "";
    let apiReason = "";
    try {
      const body = await res.json();
      const errObj = body && body.error ? body.error : null;
      if (errObj) {
        apiMsg = String(errObj.message || "");
        const first =
          errObj.errors && errObj.errors[0] && errObj.errors[0].reason
            ? String(errObj.errors[0].reason)
            : "";
        apiReason = first || String(errObj.status || "");
        const details = Array.isArray(errObj.details) ? errObj.details : [];
        for (const d of details) {
          if (d && d.reason) {
            apiReason = String(d.reason);
            break;
          }
        }
      }
    } catch (_) { /* ignore parse */ }

    const combined = (apiMsg + " " + apiReason).trim();

    // Key accepted: sentinel missing, or list denied without OAuth (empty/private Drive).
    if (
      /insufficientFilePermissions|insufficientPermissions/i.test(combined) ||
      (/notFound/i.test(apiReason) || /File not found/i.test(apiMsg))
    ) {
      return true;
    }

    let message = "Wrong password.";
    let code = "http_" + res.status;

    if (/API key expired|API_KEY_EXPIRED/i.test(combined)) {
      message = "Password expired. Ask the admin for a new password.";
      code = "expired";
    } else if (
      /API_KEY_INVALID|API key not valid/i.test(combined) ||
      (res.status === 400 && /INVALID_ARGUMENT|badRequest/i.test(combined))
    ) {
      message = "Wrong password.";
      code = "invalid";
    } else if (/API_KEY_HTTP_REFERRER_BLOCKED|referer|referrer/i.test(combined)) {
      message =
        "Password check was blocked by site settings. Ask the admin to allow this site.";
      code = "referrer";
    } else if (
      /has not been used|not enabled|accessNotConfigured|SERVICE_DISABLED|API_KEY_SERVICE_BLOCKED/i.test(
        combined
      )
    ) {
      message = "Password service isn’t ready yet. Try again later.";
      code = "not_enabled";
    } else if (/API_KEY_IP_ADDRESS_BLOCKED|ip address/i.test(combined)) {
      message =
        "Password check was blocked from this network. Try another connection.";
      code = "ip_blocked";
    } else if (res.status === 403) {
      message =
        "Password check was blocked. Check connection or site settings and try again.";
      code = "forbidden";
    } else if (res.status >= 500) {
      message = "Could not check the password right now. Try again in a moment.";
      code = "server";
    } else if (res.status === 400) {
      message = "Wrong password.";
      code = "invalid";
    }

    const err = new Error(message);
    err.code = code;
    throw err;
  };

  /** Template e.g. https://proxy.example/?id={id} or .../?url={url} */
  const getMediaProxy = () => {
    try {
      return (localStorage.getItem(MEDIA_PROXY_STORAGE) || "").trim();
    } catch (_) {
      return "";
    }
  };

  const setMediaProxy = (value) => {
    const v = String(value || "").trim();
    try {
      if (v) localStorage.setItem(MEDIA_PROXY_STORAGE, v);
      else localStorage.removeItem(MEDIA_PROXY_STORAGE);
    } catch (_) { /* quota */ }
    return getMediaProxy();
  };

  /** Direct usercontent URL (cookie-less). Browsers often 403 this cross-site. */
  const usercontentUrl = (fileId, confirm) => {
    let u =
      `https://drive.usercontent.google.com/download?id=${encodeURIComponent(
        fileId
      )}&export=download`;
    if (confirm) u += `&confirm=${encodeURIComponent(confirm)}`;
    return u;
  };

  /** Preferred playable URL for track.file metadata (API key when set). */
  const playbackUrl = (fileId) => {
    const key = getApiKey();
    if (key) {
      return (
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
          fileId
        )}?alt=media&key=${encodeURIComponent(key)}`
      );
    }
    const proxy = getMediaProxy();
    if (proxy && proxy.includes("{id}")) {
      return proxy.split("{id}").join(encodeURIComponent(fileId));
    }
    if (proxy && proxy.includes("{url}")) {
      return proxy
        .split("{url}")
        .join(encodeURIComponent(usercontentUrl(fileId, "t")));
    }
    return usercontentUrl(fileId, "t");
  };

  /** In-memory blob: URL cache keyed by Drive file id (LRU-ish, max 4). */
  const blobUrlCache = new Map(); // fileId -> { url, ts }
  const BLOB_CACHE_MAX = 4;

  const revokeBlobUrl = (url) => {
    if (!url || !String(url).startsWith("blob:")) return;
    try {
      URL.revokeObjectURL(url);
    } catch (_) { /* ignore */ }
  };

  const trimBlobCache = () => {
    while (blobUrlCache.size > BLOB_CACHE_MAX) {
      let oldestKey = null;
      let oldestTs = Infinity;
      for (const [k, v] of blobUrlCache) {
        if (v.ts < oldestTs) {
          oldestTs = v.ts;
          oldestKey = k;
        }
      }
      if (oldestKey == null) break;
      const entry = blobUrlCache.get(oldestKey);
      blobUrlCache.delete(oldestKey);
      if (entry) revokeBlobUrl(entry.url);
    }
  };

  const getCachedBlobUrl = (fileId) => {
    const entry = blobUrlCache.get(fileId);
    if (!entry) return null;
    entry.ts = Date.now();
    return entry.url;
  };

  const clearBlobCache = () => {
    for (const entry of blobUrlCache.values()) revokeBlobUrl(entry.url);
    blobUrlCache.clear();
  };

  const clearBlobForFile = (fileId) => {
    if (!fileId || !blobUrlCache.has(fileId)) return;
    const entry = blobUrlCache.get(fileId);
    blobUrlCache.delete(fileId);
    if (entry) revokeBlobUrl(entry.url);
  };

  /** Wipe cached Drive track metadata + in-memory blobs. Keeps folder URL list and unlock password. */
  const clearTrackCache = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch (_) { /* ignore */ }
    clearBlobCache();
    return { refreshedAt: null, tracks: [] };
  };

  const looksLikeAudio = (type, buf) => {
    const t = (type || "").split(";")[0].trim().toLowerCase();
    if (/^audio\//.test(t) || t === "application/octet-stream") return true;
    if (!buf || buf.byteLength < 4) return false;
    const u8 = new Uint8Array(buf.slice(0, 4));
    // ID3 or MPEG frame sync
    if (u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) return true;
    if (u8[0] === 0xff && (u8[1] & 0xe0) === 0xe0) return true;
    // fLaC / OggS
    const ascii = String.fromCharCode(u8[0], u8[1], u8[2], u8[3]);
    if (ascii === "fLaC" || ascii === "OggS" || ascii === "RIFF") return true;
    return false;
  };

  const looksLikeHtml = (type, buf) => {
    const t = (type || "").toLowerCase();
    if (t.includes("text/html")) return true;
    if (!buf || buf.byteLength < 12) return false;
    const head = new TextDecoder("utf-8", { fatal: false })
      .decode(buf.slice(0, 64))
      .trimStart()
      .toLowerCase();
    return head.startsWith("<!doctype") || head.startsWith("<html");
  };

  /**
   * Parse Google virus-scan / confirm interstitial HTML for a confirm token.
   */
  const parseConfirmToken = (html) => {
    const s = String(html || "");
    let m =
      s.match(/confirm=([0-9A-Za-z_-]+)/) ||
      s.match(/name=["']confirm["']\s+value=["']([^"']+)["']/) ||
      s.match(/value=["']([^"']+)["']\s+name=["']confirm["']/) ||
      s.match(/download_warning_[^=]+=([0-9A-Za-z_-]+)/) ||
      s.match(/&amp;confirm=([0-9A-Za-z_-]+)/);
    if (m) return m[1];
    m = s.match(/\/uc\?export=download[^"'\s]*confirm=([0-9A-Za-z_-]+)/i);
    return m ? m[1] : null;
  };

  const bufferToObjectUrl = (buf, type) => {
    const mime = /^audio\//i.test((type || "").split(";")[0])
      ? (type || "").split(";")[0].trim()
      : "audio/mpeg";
    const blob = new Blob([buf], { type: mime });
    return URL.createObjectURL(blob);
  };

  const storeBlob = (fileId, objectUrl) => {
    blobUrlCache.set(fileId, { url: objectUrl, ts: Date.now() });
    trimBlobCache();
    return objectUrl;
  };

  const fetchArrayBuffer = async (url, { signal, stripReferrer, fullReferrer, headers } = {}) => {
    // googleapis: send a full HTTPS referrer so HTTP-referrer restrictions like
    // https://cliren.github.io/* match (browser default often sends origin only).
    // usercontent: strip referrer (no key auth).
    const opts = {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      signal,
    };
    if (headers && typeof headers === "object") opts.headers = headers;
    if (stripReferrer) opts.referrerPolicy = "no-referrer";
    else if (fullReferrer) opts.referrerPolicy = "no-referrer-when-downgrade";
    const res = await fetch(url, opts);
    return res;
  };

  /** Parse Drive JSON error body into { message, reason, status }. */
  const parseDriveApiError = (buf, httpStatus) => {
    let message = "";
    let reason = "";
    let status = "";
    try {
      const text = new TextDecoder("utf-8", { fatal: false })
        .decode(buf.slice(0, 800))
        .replace(/\s+/g, " ")
        .trim();
      const body = JSON.parse(text);
      const errObj = body && body.error ? body.error : null;
      if (errObj) {
        message = String(errObj.message || "");
        status = String(errObj.status || "");
        const first =
          errObj.errors && errObj.errors[0] && errObj.errors[0].reason
            ? String(errObj.errors[0].reason)
            : "";
        reason = first;
        const details = Array.isArray(errObj.details) ? errObj.details : [];
        for (const d of details) {
          if (d && d.reason) {
            reason = String(d.reason);
            break;
          }
        }
      } else {
        message = text.slice(0, 160);
      }
    } catch (_) { /* ignore */ }
    return { message, reason, status, httpStatus: httpStatus || 0 };
  };

  /**
   * Map Drive API failure to password-language Error (never says "API key").
   * Sets err.code / err.driveReason for UI.
   */
  const playErrorFromDriveApi = (parsed) => {
    const combined = (
      (parsed.message || "") + " " + (parsed.reason || "") + " " + (parsed.status || "")
    ).trim();
    let message = "Could not play this song.";
    let code = "DRIVE_API_HTTP";
    if (/insufficientFilePermissions|insufficientPermissions|notFound|File not found/i.test(combined)) {
      message =
        "This song isn’t shared for playback. In Drive, set Anyone with the link · Viewer on the file (or its folder).";
      code = "DRIVE_NOT_SHARED";
    } else if (/API_KEY_HTTP_REFERRER_BLOCKED|referer|referrer/i.test(combined)) {
      message =
        "Playback was blocked by site settings. Ask the admin to allow this site for the password.";
      code = "DRIVE_REFERRER";
    } else if (/API key expired|API_KEY_EXPIRED/i.test(combined)) {
      message = "Password expired. Lock, then unlock with a new password.";
      code = "DRIVE_PASSWORD_EXPIRED";
    } else if (/API_KEY_INVALID|API key not valid|INVALID_ARGUMENT/i.test(combined)) {
      message = "Password isn’t valid for playback. Lock and unlock again.";
      code = "DRIVE_BAD_PASSWORD";
    } else if (
      /has not been used|not enabled|accessNotConfigured|SERVICE_DISABLED|API_KEY_SERVICE_BLOCKED/i.test(
        combined
      )
    ) {
      message = "Playback service isn’t ready. Try again later.";
      code = "DRIVE_NOT_ENABLED";
    } else if (/API_KEY_IP_ADDRESS_BLOCKED|ip address/i.test(combined)) {
      message = "Playback was blocked from this network. Try another connection.";
      code = "DRIVE_IP_BLOCKED";
    } else if (parsed.httpStatus === 403) {
      message =
        "Could not open this song. Check Drive link sharing (Anyone with the link · Viewer).";
      code = "DRIVE_FORBIDDEN";
    } else if (parsed.httpStatus >= 500) {
      message = "Drive is temporarily unavailable. Try again in a moment.";
      code = "DRIVE_SERVER";
    }
    const err = new Error(message);
    err.code = code;
    err.status = parsed.httpStatus;
    err.driveReason = parsed.reason || "";
    return err;
  };

  /**
   * Direct usercontent download with virus-scan confirm retry.
   * In real browsers this usually fails with 403 (Sec-Fetch-Site: cross-site).
   */
  const fetchViaUsercontent = async (fileId, { signal } = {}) => {
    let confirm = "t";
    for (let attempt = 0; attempt < 3; attempt++) {
      const url = usercontentUrl(fileId, confirm);
      let res;
      try {
        res = await fetchArrayBuffer(url, { signal, stripReferrer: true });
      } catch (err) {
        const e = new Error(
          `Drive usercontent fetch failed (${err && err.message ? err.message : "network"}). Google blocks cross-site browser downloads.`
        );
        e.code = "DRIVE_FETCH_FAILED";
        e.cause = err;
        throw e;
      }
      const type = (res.headers.get("content-type") || "").split(";")[0].trim();
      const buf = await res.arrayBuffer();

      if (res.ok && looksLikeAudio(type, buf) && buf.byteLength >= 64) {
        return { buf, type };
      }

      if (looksLikeHtml(type, buf) || (!res.ok && looksLikeHtml(type, buf))) {
        const html = new TextDecoder("utf-8", { fatal: false }).decode(
          buf.slice(0, Math.min(buf.byteLength, 120000))
        );
        if (/Error 403|Forbidden/i.test(html) && !/confirm=/i.test(html)) {
          const e = new Error(
            "Could not play this item. Check your password or media proxy."
          );
          e.code = "DRIVE_CROSS_SITE_BLOCK";
          e.status = res.status;
          throw e;
        }
        const token = parseConfirmToken(html);
        if (token && token !== confirm) {
          confirm = token;
          continue;
        }
        const e = new Error(
          "Drive returned an HTML interstitial (virus-scan/confirm) and no confirm token was found."
        );
        e.code = "DRIVE_VIRUS_SCAN";
        e.status = res.status;
        throw e;
      }

      if (!res.ok) {
        const e = new Error(`Drive download failed (HTTP ${res.status})`);
        e.code = "DRIVE_HTTP";
        e.status = res.status;
        throw e;
      }

      const e = new Error(
        `Unexpected Drive content-type: ${type || "unknown"} (${buf.byteLength} bytes)`
      );
      e.code = "DRIVE_BAD_TYPE";
      throw e;
    }
    const e = new Error("Drive confirm retry exhausted");
    e.code = "DRIVE_VIRUS_SCAN";
    throw e;
  };

  const fetchViaGoogleApis = async (fileId, apiKey, { signal, resourceKey } = {}) => {
    const url =
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        fileId
      )}?alt=media&key=${encodeURIComponent(apiKey)}&supportsAllDrives=true`;
    const headers = {};
    const rk = resourceKeysHeaderValue([[fileId, resourceKey]]);
    if (rk) headers["X-Goog-Drive-Resource-Keys"] = rk;
    let res;
    try {
      res = await fetchArrayBuffer(url, {
        signal,
        fullReferrer: true,
        headers: Object.keys(headers).length ? headers : undefined,
      });
    } catch (err) {
      const e = new Error(
        "Could not reach Drive to play this song. Check your connection."
      );
      e.code = "DRIVE_API_FETCH";
      throw e;
    }
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    const buf = await res.arrayBuffer();
    if (!res.ok) {
      throw playErrorFromDriveApi(parseDriveApiError(buf, res.status));
    }
    if (!looksLikeAudio(type, buf) || buf.byteLength < 64) {
      const e = new Error("Drive returned something that isn’t audio.");
      e.code = "DRIVE_API_BAD_TYPE";
      throw e;
    }
    return { buf, type };
  };

  const resolveProxyUrl = (fileId, template) => {
    const tpl = String(template || "").trim();
    if (!tpl) return null;
    const direct = usercontentUrl(fileId, "t");
    if (tpl.includes("{id}") || tpl.includes("{url}")) {
      return tpl
        .split("{id}")
        .join(encodeURIComponent(fileId))
        .split("{url}")
        .join(encodeURIComponent(direct));
    }
    // Bare base: append id= query
    const join = tpl.includes("?") ? "&" : "?";
    return `${tpl}${join}id=${encodeURIComponent(fileId)}`;
  };

  const fetchViaProxy = async (fileId, template, { signal } = {}) => {
    const url = resolveProxyUrl(fileId, template);
    if (!url) throw new Error("Media proxy URL is empty");
    let res;
    try {
      res = await fetchArrayBuffer(url, { signal });
    } catch (err) {
      const e = new Error(
        `Media proxy fetch failed (${err && err.message ? err.message : "network"})`
      );
      e.code = "DRIVE_PROXY_FETCH";
      throw e;
    }
    const type = (res.headers.get("content-type") || "").split(";")[0].trim();
    const buf = await res.arrayBuffer();
    if (!res.ok) {
      const e = new Error(`Media proxy HTTP ${res.status}`);
      e.code = "DRIVE_PROXY_HTTP";
      e.status = res.status;
      throw e;
    }
    if (looksLikeHtml(type, buf)) {
      // Proxy may have forwarded virus-scan HTML — try confirm parse once via proxy of confirmed URL
      const html = new TextDecoder("utf-8", { fatal: false }).decode(
        buf.slice(0, Math.min(buf.byteLength, 120000))
      );
      const token = parseConfirmToken(html);
      if (token) {
        const retryTpl = String(template || "");
        const confirmed = usercontentUrl(fileId, token);
        let retryUrl;
        if (retryTpl.includes("{url}")) {
          retryUrl = retryTpl.split("{url}").join(encodeURIComponent(confirmed));
        } else if (retryTpl.includes("{id}")) {
          // Proxy that only takes id should add confirm itself; fall through
          retryUrl = null;
        } else {
          retryUrl = `${url}${url.includes("?") ? "&" : "?"}confirm=${encodeURIComponent(token)}`;
        }
        if (retryUrl) {
          const res2 = await fetchArrayBuffer(retryUrl, { signal });
          const type2 = (res2.headers.get("content-type") || "")
            .split(";")[0]
            .trim();
          const buf2 = await res2.arrayBuffer();
          if (res2.ok && looksLikeAudio(type2, buf2) && buf2.byteLength >= 64) {
            return { buf: buf2, type: type2 };
          }
        }
      }
      const e = new Error("Media proxy returned HTML instead of audio");
      e.code = "DRIVE_PROXY_HTML";
      throw e;
    }
    if (!looksLikeAudio(type, buf) || buf.byteLength < 64) {
      const e = new Error(
        `Media proxy unexpected body (${type || "unknown"}, ${buf.byteLength} bytes)`
      );
      e.code = "DRIVE_PROXY_BAD_TYPE";
      throw e;
    }
    return { buf, type };
  };

  const lookupCachedResourceKey = (fileId) => {
    try {
      const tracks = (loadCache().tracks || []);
      const t = tracks.find((x) => x && x.driveFileId === fileId);
      return (t && t.driveResourceKey) || "";
    } catch (_) {
      return "";
    }
  };

  /**
   * CORS-fetch a Drive file into a blob: URL usable by <audio>.
   * Order: unlock password → googleapis alt=media (with resource key when known)
   * → media proxy → direct usercontent (+ confirm).
   * For "Anyone with the link" files, alt=media + password works with no Google
   * account signed in (browser must send referrer if the password is referrer-restricted).
   */
  const fetchPlayableUrl = async (fileId, { signal, resourceKey } = {}) => {
    if (!fileId) throw new Error("Missing Drive file id");
    const cached = getCachedBlobUrl(fileId);
    if (cached) return cached;

    const rk = resourceKey || lookupCachedResourceKey(fileId) || "";
    const errors = [];
    let primaryErr = null;
    const tryPath = async (label, fn) => {
      try {
        const { buf, type } = await fn();
        const objectUrl = bufferToObjectUrl(buf, type);
        return storeBlob(fileId, objectUrl);
      } catch (err) {
        if (err && err.name === "AbortError") throw err;
        if (!primaryErr) primaryErr = err;
        errors.push(`${label}: ${err && err.message ? err.message : err}`);
        return null;
      }
    };

    const key = getApiKey();
    if (key) {
      const ok = await tryPath("api-key", () =>
        fetchViaGoogleApis(fileId, key, { signal, resourceKey: rk })
      );
      if (ok) return ok;
      // Share / password / referrer failures won't be fixed by usercontent (Sec-Fetch 403).
      if (
        primaryErr &&
        /DRIVE_NOT_SHARED|DRIVE_REFERRER|DRIVE_BAD_PASSWORD|DRIVE_PASSWORD_EXPIRED|DRIVE_NOT_ENABLED|DRIVE_FORBIDDEN|DRIVE_IP_BLOCKED/.test(
          String(primaryErr.code || "")
        )
      ) {
        throw primaryErr;
      }
    }

    const proxy = getMediaProxy();
    if (proxy) {
      const ok = await tryPath("proxy", () =>
        fetchViaProxy(fileId, proxy, { signal })
      );
      if (ok) return ok;
    }

    const ok = await tryPath("usercontent", () =>
      fetchViaUsercontent(fileId, { signal })
    );
    if (ok) return ok;

    if (primaryErr && primaryErr.message) throw primaryErr;

    const err = new Error(
      "Could not play this song. Unlock with your password, check Drive link sharing, or set a media proxy."
    );
    err.code = "DRIVE_PLAYBACK_FAILED";
    err.details = errors;
    throw err;
  };

  const categoryFromFolderName = (name) => {
    const key = String(name || "")
      .trim()
      .toLowerCase();
    return CAT_MAP[key] || null;
  };

  // Root-level files do not have a folder category, so use their filename/title.
  // Keep the keyword order stable: a Bhakti match wins if a title contains both.
  const categoryFromTrackName = (name) => {
    const value = String(name || "").toLowerCase();
    if (["bhakti", "bhajan", "krishna", "shiva", "govind", "mantra"].some((word) => value.includes(word))) {
      return "bhakti";
    }
    if (["folk", "village"].some((word) => value.includes(word))) {
      return "folk";
    }
    return "other";
  };

  const titleFromName = (name) => {
    let t = String(name || "Untitled").trim();
    t = t.replace(AUDIO_EXT_RE, "");
    t = t.replace(/^Copy of\s+/i, "");
    return t.trim() || "Untitled";
  };

  const cleanEntryName = (raw) => {
    let n = String(raw || "").trim();
    n = n.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
    n = n.replace(/\([^)]*drive-thirdparty[^)]*\)/gi, "");
    n = n.replace(/https?:\/\/\S+/gi, "");
    n = n.replace(/^[\s\)\]\[\(]+/, "");
    n = n.replace(/[\s\)\]\[\(]+$/, "");
    n = n.replace(/\s+/g, " ").trim();
    return n;
  };

  /**
   * Parse embeddedfolderview HTML (server-rendered entries).
   * @returns {{ title: string, files: {id,name}[], folders: {id,name}[] }}
   */
  const parseEmbeddedHtml = (html) => {
    const files = [];
    const folders = [];
    const seen = new Set();
    const titleMatch = String(html || "").match(/<title>\s*([^<]*?)\s*<\/title>/i);
    let title = titleMatch ? titleMatch[1].replace(/\s*-\s*Google Drive\s*$/i, "").trim() : "";

    const entryRe =
      /id="entry-([a-zA-Z0-9_-]+)"([\s\S]*?)(?=id="entry-|<\/div><\/div><\/body>|$)/gi;
    let m;
    const src = String(html || "");
    while ((m = entryRe.exec(src))) {
      const id = m[1];
      if (seen.has(id)) continue;
      const block = m[2] || "";
      const nameMatch = block.match(/flip-entry-title">([^<]*)<\/div>/i);
      const name = cleanEntryName(nameMatch ? nameMatch[1] : id);
      const hrefMatch = block.match(
        /href="(https:\/\/drive\.google\.com\/(?:file\/d\/|drive\/folders\/)[^"]+)"/i
      );
      const href = hrefMatch ? hrefMatch[1] : "";
      seen.add(id);
      if (/\/folders\//i.test(href)) {
        folders.push({ id, name });
      } else if (AUDIO_EXT_RE.test(name) || /type\/audio\//i.test(block)) {
        files.push({ id, name: name || id });
      } else if (/\/file\/d\//i.test(href) && AUDIO_EXT_RE.test(name)) {
        files.push({ id, name });
      }
    }

    // Fallback: href + title pairs
    if (!files.length && !folders.length) {
      const pairRe =
        /href="https:\/\/drive\.google\.com\/(file\/d\/|drive\/folders\/)([a-zA-Z0-9_-]+)[^"]*"[\s\S]{0,800}?flip-entry-title">([^<]*)<\/div>/gi;
      while ((m = pairRe.exec(src))) {
        const kind = m[1].indexOf("folders") >= 0 ? "folder" : "file";
        const id = m[2];
        const name = cleanEntryName(m[3]);
        if (seen.has(id)) continue;
        seen.add(id);
        if (kind === "folder") folders.push({ id, name });
        else if (AUDIO_EXT_RE.test(name)) files.push({ id, name });
      }
    }

    return { title, files, folders };
  };

  /**
   * Parse jina.ai markdown / text of embeddedfolderview.
   */
  const parseReaderMarkdown = (text, pageTitle) => {
    const files = [];
    const folders = [];
    const seen = new Set();
    let body = String(text || "");
    // Strip markdown images so [Name.mp3](file url) is easier to match
    body = body.replace(/!\[[^\]]*\]\([^)]*\)/g, "");

    const fileRe =
      /([^\]\n]{1,240}?\.(?:mp3|m4a|wav|ogg|flac|aac))\s*\]\(\s*https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/gi;
    let m;
    while ((m = fileRe.exec(body))) {
      const name = cleanEntryName(m[1]);
      const id = m[2];
      if (seen.has(id)) continue;
      seen.add(id);
      files.push({ id, name: name || id });
    }

    // Any remaining file/d links without a captured name
    const bareFile = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/gi;
    while ((m = bareFile.exec(body))) {
      const id = m[1];
      if (seen.has(id)) continue;
      const before = body.slice(Math.max(0, m.index - 240), m.index);
      const names = before.match(/([^\n\[\]]{1,200}\.(?:mp3|m4a|wav|ogg|flac|aac))/gi);
      const name = names ? cleanEntryName(names[names.length - 1]) : id;
      if (!AUDIO_EXT_RE.test(name) && name === id) continue;
      seen.add(id);
      files.push({ id, name: AUDIO_EXT_RE.test(name) ? name : id });
    }

    const folderRe =
      /([^\]\n]{1,120}?)\s*\]\(\s*https:\/\/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/gi;
    while ((m = folderRe.exec(body))) {
      const name = cleanEntryName(m[1]);
      const id = m[2];
      if (seen.has(id)) continue;
      seen.add(id);
      folders.push({ id, name: name || id });
    }

    const bareFolder = /https:\/\/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/gi;
    while ((m = bareFolder.exec(body))) {
      const id = m[1];
      if (seen.has(id)) continue;
      seen.add(id);
      folders.push({ id, name: id });
    }

    return { title: pageTitle || "", files, folders };
  };

  /** Parse pasted multi-line file links / "Name | url" / bare ids. */
  const parseFileLinkList = (text) => {
    const files = [];
    const seen = new Set();
    const lines = String(text || "").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      let name = "";
      let urlPart = trimmed;
      const pipe = trimmed.split("|");
      if (pipe.length >= 2) {
        name = pipe[0].trim();
        urlPart = pipe.slice(1).join("|").trim();
      } else {
        const tab = trimmed.split(/\t/);
        if (tab.length >= 2) {
          name = tab[0].trim();
          urlPart = tab.slice(1).join("\t").trim();
        }
      }
      const id = extractFileId(urlPart) || extractFileId(trimmed);
      if (!id || seen.has(id)) continue;
      if (!name) {
        const fromLine = trimmed.match(/([^\/\s|]+\.(?:mp3|m4a|wav|ogg|flac|aac))/i);
        name = fromLine ? fromLine[1] : `Drive file ${id.slice(0, 8)}`;
      }
      seen.add(id);
      files.push({
        id,
        name,
        resourceKey: extractResourceKey(urlPart) || extractResourceKey(trimmed) || "",
      });
    }
    return files;
  };

  const fetchText = async (url, opts) => {
    const res = await fetch(url, opts);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} fetching listing`);
      err.status = res.status;
      throw err;
    }
    return res.text();
  };

  const mergeListings = (parts) => {
    const filesById = new Map();
    const foldersById = new Map();
    let title = "";
    const methods = [];
    for (const p of parts) {
      if (!p) continue;
      if (p.method) methods.push(p.method);
      if (p.title && !title) title = p.title;
      (p.files || []).forEach((f) => {
        if (!f || !f.id) return;
        const prev = filesById.get(f.id);
        // Prefer richer names / resource keys
        if (!prev) {
          filesById.set(f.id, { ...f });
        } else {
          filesById.set(f.id, {
            ...prev,
            ...f,
            name: (f.name && f.name !== f.id ? f.name : prev.name) || prev.name || f.name,
            resourceKey: f.resourceKey || prev.resourceKey || "",
            mimeType: f.mimeType || prev.mimeType || "",
          });
        }
      });
      (p.folders || []).forEach((f) => {
        if (!f || !f.id) return;
        const prev = foldersById.get(f.id);
        if (!prev) foldersById.set(f.id, { ...f });
        else {
          foldersById.set(f.id, {
            ...prev,
            ...f,
            name: (f.name && f.name !== f.id ? f.name : prev.name) || prev.name || f.name,
            resourceKey: f.resourceKey || prev.resourceKey || "",
          });
        }
      });
    }
    return {
      title,
      files: Array.from(filesById.values()),
      folders: Array.from(foldersById.values()),
      method: methods.join("+") || null,
    };
  };

  const isAudioMimeOrName = (name, mimeType) => {
    const mime = String(mimeType || "").toLowerCase();
    if (mime.startsWith("audio/")) return true;
    if (AUDIO_EXT_RE.test(name || "")) return true;
    return false;
  };

  /**
   * Complete folder listing via Drive API (unlock password). Paginated.
   * Returns resourceKey for link-only files when Google provides one.
   */
  const fetchFolderListingViaApi = async (folderId, apiKey, folderResourceKey) => {
    const files = [];
    const folders = [];
    let pageToken = "";
    const headers = {};
    const rk = resourceKeysHeaderValue([[folderId, folderResourceKey]]);
    if (rk) headers["X-Goog-Drive-Resource-Keys"] = rk;

    // Escape single quotes in id for q= clause (Drive ids are normally safe).
    const safeId = String(folderId).replace(/'/g, "\\'");
    do {
      const params = new URLSearchParams({
        q: `'${safeId}' in parents and trashed = false`,
        fields: "nextPageToken,files(id,name,mimeType,resourceKey,size)",
        pageSize: "100",
        key: apiKey,
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true",
      });
      if (pageToken) params.set("pageToken", pageToken);
      const url = "https://www.googleapis.com/drive/v3/files?" + params.toString();
      let res;
      try {
        res = await fetch(url, {
          method: "GET",
          mode: "cors",
          credentials: "omit",
          referrerPolicy: "no-referrer-when-downgrade",
          headers: Object.keys(headers).length ? headers : undefined,
        });
      } catch (err) {
        const e = new Error("Could not reach Drive to list this folder.");
        e.code = "LISTING_NETWORK";
        throw e;
      }
      if (!res.ok) {
        const buf = await res.arrayBuffer();
        const parsed = parseDriveApiError(buf, res.status);
        const combined = (parsed.message + " " + parsed.reason).trim();
        const e = new Error(
          /insufficientFilePermissions|notFound/i.test(combined)
            ? "Could not list this folder with the password. Share it as Anyone with the link · Viewer."
            : "Could not list this Drive folder (password check failed)."
        );
        e.code = "LISTING_API";
        e.status = res.status;
        e.driveReason = parsed.reason || "";
        throw e;
      }
      const json = await res.json();
      for (const f of json.files || []) {
        if (!f || !f.id) continue;
        const mime = f.mimeType || "";
        const entry = {
          id: f.id,
          name: f.name || f.id,
          resourceKey: f.resourceKey || "",
          mimeType: mime,
          size: f.size != null ? Number(f.size) : null,
        };
        if (mime === "application/vnd.google-apps.folder") {
          folders.push(entry);
        } else if (isAudioMimeOrName(entry.name, mime)) {
          files.push(entry);
        }
      }
      pageToken = json.nextPageToken || "";
    } while (pageToken);

    return { title: "", files, folders, method: "drive-api" };
  };

  const fetchKeylessListingPart = async (folderId) => {
    const emb = embeddedUrl(folderId);
    const parts = [];
    const errors = [];

    // 1) jina.ai — often truncates mid-folder; still useful as a partial source
    try {
      const jinaUrl = `https://r.jina.ai/${emb}`;
      const res = await fetch(jinaUrl, {
        headers: { Accept: "application/json, text/plain;q=0.9, */*;q=0.8" },
      });
      if (!res.ok) throw new Error(`jina HTTP ${res.status}`);
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      let parsed;
      if (ct.includes("application/json")) {
        const json = await res.json();
        const data = json && json.data ? json.data : json;
        const content = (data && (data.content || data.text)) || "";
        const title = (data && data.title) || "";
        parsed = parseReaderMarkdown(content, title);
        if (
          !parsed.files.length &&
          !parsed.folders.length &&
          typeof content === "string" &&
          content.includes("flip-entry")
        ) {
          parsed = parseEmbeddedHtml(content);
        }
      } else {
        const body = await res.text();
        if (body.includes("flip-entry") || body.includes('id="entry-')) {
          parsed = parseEmbeddedHtml(body);
        } else {
          const titleMatch = body.match(/^Title:\s*(.+)$/m);
          parsed = parseReaderMarkdown(body, titleMatch ? titleMatch[1].trim() : "");
        }
      }
      if (parsed.files.length || parsed.folders.length) {
        parts.push({ ...parsed, method: "jina" });
      } else {
        errors.push("jina: no audio entries found");
      }
    } catch (err) {
      errors.push(`jina: ${err.message || err}`);
    }

    // 2) allorigins raw HTML (full embeddedfolderview when healthy)
    try {
      const ao = `https://api.allorigins.win/raw?url=${encodeURIComponent(emb)}`;
      const html = await fetchText(ao);
      const parsed = parseEmbeddedHtml(html);
      if (parsed.files.length || parsed.folders.length) {
        parts.push({ ...parsed, method: "allorigins" });
      } else {
        errors.push("allorigins: no audio entries found");
      }
    } catch (err) {
      errors.push(`allorigins: ${err.message || err}`);
    }

    // 3) allorigins get JSON wrapper
    try {
      const ao = `https://api.allorigins.win/get?url=${encodeURIComponent(emb)}`;
      const res = await fetch(ao);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const html = json && json.contents ? json.contents : "";
      const parsed = parseEmbeddedHtml(html);
      if (parsed.files.length || parsed.folders.length) {
        parts.push({ ...parsed, method: "allorigins-json" });
      } else {
        errors.push("allorigins-json: no audio entries found");
      }
    } catch (err) {
      errors.push(`allorigins-json: ${err.message || err}`);
    }

    // 4) corsproxy.io fallback for full HTML (when allorigins is empty/down)
    try {
      const cp = `https://corsproxy.io/?${encodeURIComponent(emb)}`;
      const html = await fetchText(cp);
      const parsed = parseEmbeddedHtml(html);
      if (parsed.files.length || parsed.folders.length) {
        parts.push({ ...parsed, method: "corsproxy" });
      } else {
        errors.push("corsproxy: no audio entries found");
      }
    } catch (err) {
      errors.push(`corsproxy: ${err.message || err}`);
    }

    const merged = mergeListings(parts);
    if (merged.files.length || merged.folders.length) {
      return merged;
    }
    const err = new Error(
      "Could not list this Drive folder (page readers failed). Paste file links instead, or try Refresh later. " +
        errors.slice(0, 2).join("; ")
    );
    err.code = "LISTING_FAILED";
    err.details = errors;
    throw err;
  };

  /**
   * Folder listing: Drive API when unlocked (complete), else merged keyless proxies.
   * Never trust a single truncated jina response as the full folder.
   */
  const fetchFolderListing = async (folderId, opts) => {
    const options = opts || {};
    const apiKey = options.apiKey != null ? options.apiKey : getApiKey();
    const folderResourceKey = options.resourceKey || "";
    if (apiKey) {
      try {
        return await fetchFolderListingViaApi(folderId, apiKey, folderResourceKey);
      } catch (err) {
        // Fall through to keyless merge — still better than failing hard.
        if (err && err.name === "AbortError") throw err;
      }
    }
    return fetchKeylessListingPart(folderId);
  };

  const fileToTrack = (file, category, folderId) => {
    return {
      id: `drive_${file.id}`,
      title: titleFromName(file.name),
      artist: "",
      file: playbackUrl(file.id),
      // An explicit parent folder category takes precedence over title heuristics.
      category: categoryFromFolderName(category) || category || categoryFromTrackName(file.name),
      dateAdded: new Date().toISOString().slice(0, 10),
      source: "drive",
      driveFileId: file.id,
      driveFolderId: folderId || null,
      driveResourceKey: file.resourceKey || "",
      mimeType: file.mimeType || "",
      size: file.size != null ? file.size : null,
    };
  };

  /**
   * List one linked folder: categorize root audio from filename/title heuristics;
   * recurse one level into Bhakti / Folk / Other subfolders, whose category wins.
   * Trust listing.files (already audio-filtered); do not drop extension-less names.
   */
  const listFolderTracks = async (folder) => {
    const listing = await fetchFolderListing(folder.id, {
      resourceKey: folder.resourceKey || "",
    });
    if (listing.title) {
      const cleaned = listing.title.replace(/\s+$/, "").trim();
      if (cleaned) folder.name = cleaned;
    }

    const tracks = [];
    for (const f of listing.files) {
      tracks.push(fileToTrack(f, null, folder.id));
    }

    for (const sub of listing.folders) {
      const cat = categoryFromFolderName(sub.name);
      if (!cat) continue;
      try {
        const nested = await fetchFolderListing(sub.id, {
          resourceKey: sub.resourceKey || folder.resourceKey || "",
        });
        for (const f of nested.files) {
          tracks.push(fileToTrack(f, cat, folder.id));
        }
      } catch (_) {
        /* skip failed subfolder */
      }
    }

    return { tracks, listing };
  };

  /**
   * Import pasted file links into the Drive cache (no folder listing needed).
   * @returns {{ tracks, added }}
   */
  const importFileLinks = (text, category) => {
    const files = parseFileLinkList(text);
    if (!files.length) {
      throw new Error(
        "No Drive file links found. Paste lines like https://drive.google.com/file/d/FILE_ID/view"
      );
    }
    const cat = categoryFromFolderName(category) || category || "bhakti";
    const cache = loadCache();
    const map = new Map((cache.tracks || []).map((t) => [t.id, t]));
    let added = 0;
    for (const f of files) {
      const track = fileToTrack(f, cat, null);
      if (!map.has(track.id)) added += 1;
      map.set(track.id, track);
    }
    const tracks = Array.from(map.values());
    saveCache(tracks);
    return { tracks, added, total: files.length };
  };

  /**
   * Re-list all configured folders and rebuild Drive track list.
   */
  const refreshAll = async () => {
    const folders = loadFolders();
    const errors = [];
    const allTracks = [];
    const seen = new Set();

    if (!folders.length) {
      saveCache([]);
      return { tracks: [], folders, errors, method: null };
    }

    for (const folder of folders) {
      try {
        const { tracks, listing } = await listFolderTracks(folder);
        if (listing && listing.title) {
          folder.name = listing.title || folder.name;
        }
        for (const t of tracks) {
          if (seen.has(t.id)) continue;
          seen.add(t.id);
          t.file = playbackUrl(t.driveFileId);
          allTracks.push(t);
        }
      } catch (err) {
        errors.push({
          folderId: folder.id,
          name: folder.name || folder.id,
          message: err.message || String(err),
          code: err.code || null,
        });
      }
    }

    saveFolders(folders);
    // Keep manually pasted file-link tracks (driveFolderId null) across refresh
    const prev = loadCache().tracks || [];
    for (const t of prev) {
      if (t && t.source === "drive" && !t.driveFolderId && t.driveFileId) {
        if (seen.has(t.id)) continue;
        seen.add(t.id);
        t.file = playbackUrl(t.driveFileId);
        allTracks.push(t);
      }
    }
    saveCache(allTracks);
    return { tracks: allTracks, folders, errors, method: "keyless-proxy" };
  };

  const mergeLibraries = (seedTracks, driveTracks) => {
    const map = new Map();
    (seedTracks || []).forEach((t) => {
      if (!t || !t.id) return;
      map.set(t.id, {
        ...t,
        source: t.source || "local",
      });
    });
    (driveTracks || []).forEach((t) => {
      if (!t || !t.id) return;
      map.set(t.id, { ...t, source: "drive" });
    });
    return Array.from(map.values());
  };

  global.DriveMusic = {
    FOLDERS_KEY,
    CACHE_KEY,
    API_KEY_STORAGE,
    MEDIA_PROXY_STORAGE,
    EXAMPLE_FOLDER_ID,
    EXAMPLE_FOLDER_NAME,
    extractFolderId,
    extractFileId,
    extractResourceKey,
    loadFolders,
    saveFolders,
    addFolder,
    removeFolder,
    updateFolderName,
    ensureExampleFolder,
    loadCache,
    saveCache,
    getStoredApiKey,
    hasDefaultApiKey,
    hasApiKeyOverride,
    getApiKey,
    setApiKey,
    validateApiKey,
    getMediaProxy,
    setMediaProxy,
    playbackUrl,
    usercontentUrl,
    fetchPlayableUrl,
    getCachedBlobUrl,
    clearBlobCache,
    clearBlobForFile,
    clearTrackCache,
    parseConfirmToken,
    refreshAll,
    importFileLinks,
    parseFileLinkList,
    fetchFolderListing,
    mergeLibraries,
    folderUrl,
  };
})(typeof window !== "undefined" ? window : globalThis);
