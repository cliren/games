/**
 * Google Drive folder import for My Music (static GitHub Pages).
 *
 * Listing public folders requires a browser API key (Drive API enabled,
 * HTTP referrer restricted to cliren.github.io). Playback of publicly
 * shared files works without a key via the uc/usercontent download URLs.
 *
 * localStorage:
 *   myMusic.drive.v1      — [{ id, url, name?, addedAt }]
 *   myMusic.driveApiKey   — optional API key string
 *   myMusic.driveCache.v1 — { refreshedAt, tracks: [...] }
 */
(function (global) {
  const FOLDERS_KEY = "myMusic.drive.v1";
  const API_KEY_STORAGE = "myMusic.driveApiKey";
  const CACHE_KEY = "myMusic.driveCache.v1";

  const AUDIO_EXT_RE = /\.(mp3|m4a|wav|ogg|flac)$/i;
  const AUDIO_MIME_RE = /^audio\//i;
  const FOLDER_MIME = "application/vnd.google-apps.folder";
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

  const getApiKey = () => {
    try {
      return (localStorage.getItem(API_KEY_STORAGE) || "").trim();
    } catch (_) {
      return "";
    }
  };

  const setApiKey = (key) => {
    try {
      const v = String(key || "").trim();
      if (v) localStorage.setItem(API_KEY_STORAGE, v);
      else localStorage.removeItem(API_KEY_STORAGE);
    } catch (_) { /* quota */ }
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

  /** Playback URL that works for publicly shared files without an API key. */
  const playbackUrl = (fileId, apiKey) => {
    const key = apiKey != null ? apiKey : getApiKey();
    if (key) {
      return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        fileId
      )}?alt=media&key=${encodeURIComponent(key)}`;
    }
    // usercontent host allows CORS (ACAO *) and streams audio/mpeg for public files
    return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(
      fileId
    )}&export=download`;
  };

  const isAudioFile = (file) => {
    if (!file || !file.name) return false;
    if (file.mimeType && AUDIO_MIME_RE.test(file.mimeType)) return true;
    return AUDIO_EXT_RE.test(file.name);
  };

  const isFolder = (file) =>
    file && file.mimeType === FOLDER_MIME;

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

  const driveApiList = async (folderId, apiKey) => {
    const files = [];
    let pageToken = "";
    const keyParam = apiKey ? `&key=${encodeURIComponent(apiKey)}` : "";
    do {
      const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
      const fields = encodeURIComponent(
        "nextPageToken,files(id,name,mimeType,modifiedTime,size)"
      );
      const url =
        `https://www.googleapis.com/drive/v3/files?q=${q}` +
        `&supportsAllDrives=true&includeItemsFromAllDrives=true` +
        `&fields=${fields}&pageSize=1000${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}` +
        keyParam;

      const res = await fetch(url);
      let body = null;
      try {
        body = await res.json();
      } catch (_) {
        body = null;
      }
      if (!res.ok) {
        const msg =
          (body && body.error && body.error.message) ||
          `Drive API HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        err.body = body;
        throw err;
      }
      if (Array.isArray(body.files)) files.push(...body.files);
      pageToken = body.nextPageToken || "";
    } while (pageToken);
    return files;
  };

  const fetchFolderMeta = async (folderId, apiKey) => {
    const keyParam = apiKey ? `&key=${encodeURIComponent(apiKey)}` : "";
    const url =
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}` +
      `?fields=id,name,mimeType${keyParam}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    try {
      return await res.json();
    } catch (_) {
      return null;
    }
  };

  const fileToTrack = (file, category, folderId) => {
    const modified = (file.modifiedTime || "").slice(0, 10);
    return {
      id: `drive_${file.id}`,
      title: titleFromName(file.name),
      artist: "",
      file: playbackUrl(file.id),
      category: category || "bhakti",
      dateAdded: modified || new Date().toISOString().slice(0, 10),
      source: "drive",
      driveFileId: file.id,
      driveFolderId: folderId,
      mimeType: file.mimeType || "",
      size: file.size ? Number(file.size) : null,
    };
  };

  /**
   * List one linked folder: root audio → bhakti; recurse one level into
   * Bhakti / Folk / Other subfolders for category.
   */
  const listFolderTracks = async (folder, apiKey) => {
    const children = await driveApiList(folder.id, apiKey);
    const tracks = [];
    const subfolders = [];

    for (const child of children) {
      if (isFolder(child)) {
        const cat = categoryFromFolderName(child.name);
        if (cat) subfolders.push({ id: child.id, name: child.name, category: cat });
      } else if (isAudioFile(child)) {
        tracks.push(fileToTrack(child, "bhakti", folder.id));
      }
    }

    for (const sub of subfolders) {
      const nested = await driveApiList(sub.id, apiKey);
      for (const child of nested) {
        if (isAudioFile(child)) {
          tracks.push(fileToTrack(child, sub.category, folder.id));
        }
      }
    }

    return tracks;
  };

  /**
   * Re-list all configured folders and rebuild Drive track list.
   * @returns {{ tracks, folders, errors, apiKeyUsed: boolean }}
   */
  const refreshAll = async () => {
    const folders = loadFolders();
    const apiKey = getApiKey();
    const errors = [];
    const allTracks = [];
    const seen = new Set();

    if (!folders.length) {
      saveCache([]);
      return { tracks: [], folders, errors, apiKeyUsed: !!apiKey };
    }

    // Probe once without key if none set — expect failure; message guides user.
    for (const folder of folders) {
      try {
        // Refresh folder display name when possible
        if (apiKey) {
          const meta = await fetchFolderMeta(folder.id, apiKey);
          if (meta && meta.name) {
            folder.name = meta.name;
          }
        }
        const tracks = await listFolderTracks(folder, apiKey);
        for (const t of tracks) {
          if (seen.has(t.id)) continue;
          seen.add(t.id);
          // Recompute playback URL with current key preference
          t.file = playbackUrl(t.driveFileId, apiKey);
          allTracks.push(t);
        }
      } catch (err) {
        const needsKey =
          !apiKey &&
          (err.status === 403 ||
            /API [Kk]ey|unregistered callers|PERMISSION_DENIED/i.test(
              err.message || ""
            ));
        errors.push({
          folderId: folder.id,
          name: folder.name || folder.id,
          message: needsKey
            ? "Drive listing needs a free Google Cloud API key (Drive API enabled, HTTP referrer restricted to cliren.github.io). Paste it under Drive API key below, then Refresh."
            : err.message || String(err),
          needsKey,
        });
      }
    }

    saveFolders(folders);
    saveCache(allTracks);
    return { tracks: allTracks, folders, errors, apiKeyUsed: !!apiKey };
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
    API_KEY_STORAGE,
    CACHE_KEY,
    extractFolderId,
    getApiKey,
    setApiKey,
    loadFolders,
    saveFolders,
    addFolder,
    removeFolder,
    updateFolderName,
    loadCache,
    saveCache,
    playbackUrl,
    refreshAll,
    mergeLibraries,
    folderUrl,
  };
})(typeof window !== "undefined" ? window : globalThis);
