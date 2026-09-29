/**
 * Google Drive folder import for My Music (static GitHub Pages).
 *
 * Keyless listing: fetch Google's public embeddedfolderview via a CORS-friendly
 * reader proxy (jina.ai), parse file ids + names. Playback uses
 * drive.usercontent.google.com (no key). API keys are not required.
 *
 * Fallbacks: allorigins proxy of the same HTML; paste multi-line file links.
 *
 * localStorage:
 *   myMusic.drive.v1      — [{ id, url, name?, addedAt }]
 *   myMusic.driveCache.v1 — { refreshedAt, tracks: [...] }
 *   myMusic.drive.seeded  — "1" after example folder auto-add
 */
(function (global) {
  const FOLDERS_KEY = "myMusic.drive.v1";
  const CACHE_KEY = "myMusic.driveCache.v1";
  const SEEDED_KEY = "myMusic.drive.seeded";
  const EXAMPLE_FOLDER_ID = "1YT5oul30_jT5YoReVY9Snz9FS9KEhuAB";
  const EXAMPLE_FOLDER_NAME = "Songs-Surender";

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

  /** Playback URL for publicly shared files — no API key. */
  const playbackUrl = (fileId) =>
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(
      fileId
    )}&export=download`;

  const categoryFromFolderName = (name) => {
    const key = String(name || "")
      .trim()
      .toLowerCase();
    return CAT_MAP[key] || null;
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
      files.push({ id, name });
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

  /**
   * Keyless folder listing via CORS-friendly proxies of embeddedfolderview.
   */
  const fetchFolderListing = async (folderId) => {
    const emb = embeddedUrl(folderId);
    const errors = [];

    // 1) jina.ai reader (CORS reflects Origin; returns markdown or JSON)
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
        if (!parsed.files.length && !parsed.folders.length && typeof content === "string" && content.includes("flip-entry")) {
          parsed = parseEmbeddedHtml(content);
        }
      } else {
        const text = await res.text();
        if (text.includes("flip-entry") || text.includes("id=\"entry-")) {
          parsed = parseEmbeddedHtml(text);
        } else {
          const titleMatch = text.match(/^Title:\s*(.+)$/m);
          parsed = parseReaderMarkdown(text, titleMatch ? titleMatch[1].trim() : "");
        }
      }
      if (parsed.files.length || parsed.folders.length) {
        return { ...parsed, method: "jina" };
      }
      errors.push("jina: no audio entries found");
    } catch (err) {
      errors.push(`jina: ${err.message || err}`);
    }

    // 2) allorigins raw HTML (fragile; may 5xx)
    try {
      const ao = `https://api.allorigins.win/raw?url=${encodeURIComponent(emb)}`;
      const html = await fetchText(ao);
      const parsed = parseEmbeddedHtml(html);
      if (parsed.files.length || parsed.folders.length) {
        return { ...parsed, method: "allorigins" };
      }
      errors.push("allorigins: no audio entries found");
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
        return { ...parsed, method: "allorigins-json" };
      }
      errors.push("allorigins-json: no audio entries found");
    } catch (err) {
      errors.push(`allorigins-json: ${err.message || err}`);
    }

    const err = new Error(
      "Could not list this Drive folder (keyless proxy listing failed). Paste file links instead, or try Refresh later. " +
        errors.slice(0, 2).join("; ")
    );
    err.code = "LISTING_FAILED";
    err.details = errors;
    throw err;
  };

  const fileToTrack = (file, category, folderId) => {
    return {
      id: `drive_${file.id}`,
      title: titleFromName(file.name),
      artist: "",
      file: playbackUrl(file.id),
      category: category || "bhakti",
      dateAdded: new Date().toISOString().slice(0, 10),
      source: "drive",
      driveFileId: file.id,
      driveFolderId: folderId || null,
      mimeType: "",
      size: null,
    };
  };

  /**
   * List one linked folder: root audio → bhakti; recurse one level into
   * Bhakti / Folk / Other subfolders for category.
   */
  const listFolderTracks = async (folder) => {
    const listing = await fetchFolderListing(folder.id);
    if (listing.title) {
      const cleaned = listing.title.replace(/\s+$/, "").trim();
      if (cleaned) folder.name = cleaned;
    }

    const tracks = [];
    for (const f of listing.files) {
      if (!AUDIO_EXT_RE.test(f.name)) continue;
      tracks.push(fileToTrack(f, "bhakti", folder.id));
    }

    for (const sub of listing.folders) {
      const cat = categoryFromFolderName(sub.name);
      if (!cat) continue;
      try {
        const nested = await fetchFolderListing(sub.id);
        for (const f of nested.files) {
          if (!AUDIO_EXT_RE.test(f.name)) continue;
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
    EXAMPLE_FOLDER_ID,
    EXAMPLE_FOLDER_NAME,
    extractFolderId,
    extractFileId,
    loadFolders,
    saveFolders,
    addFolder,
    removeFolder,
    updateFolderName,
    ensureExampleFolder,
    loadCache,
    saveCache,
    playbackUrl,
    refreshAll,
    importFileLinks,
    parseFileLinkList,
    fetchFolderListing,
    mergeLibraries,
    folderUrl,
  };
})(typeof window !== "undefined" ? window : globalThis);
