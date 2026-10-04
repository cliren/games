(() => {
  const STORAGE_KEY = "myMusic.v1";
  const RECENT_MAX = 30;
  const CAT_LABELS = { bhakti: "Bhakti", folk: "Folk", other: "Other" };

  const audio = document.getElementById("audio");
  const miniBar = document.getElementById("miniBar");
  const miniTitle = document.getElementById("miniTitle");
  const miniArtist = document.getElementById("miniArtist");
  const miniPlay = document.getElementById("miniPlay");
  const miniIconPlay = document.getElementById("miniIconPlay");
  const miniIconPause = document.getElementById("miniIconPause");
  const miniProgressFill = document.getElementById("miniProgressFill");

  const npSheet = document.getElementById("nowPlayingSheet");
  const npBackdrop = document.getElementById("npBackdrop");
  const npClose = document.getElementById("npClose");
  const npTitle = document.getElementById("npTitle");
  const npArtist = document.getElementById("npArtist");
  const npCategory = document.getElementById("npCategory");
  const npArt = document.getElementById("npArt");

  const songListEl = document.getElementById("songList");
  const playlistListEl = document.getElementById("playlistList");
  const playlistTracksEl = document.getElementById("playlistTracks");
  const listTitle = document.getElementById("listTitle");
  const listCount = document.getElementById("listCount");
  const listEmpty = document.getElementById("listEmpty");
  const listToolbar = document.getElementById("listToolbar");
  const playlistsEmpty = document.getElementById("playlistsEmpty");
  const playlistEmpty = document.getElementById("playlistEmpty");
  const playlistDetailName = document.getElementById("playlistDetailName");
  const currentTimeEl = document.getElementById("currentTime");
  const durationEl = document.getElementById("duration");
  const seek = document.getElementById("seek");
  const volume = document.getElementById("volume");
  const btnPlay = document.getElementById("btnPlay");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnRepeat = document.getElementById("btnRepeat");
  const btnShuffle = document.getElementById("btnShuffle");
  const btnShuffleList = document.getElementById("btnShuffleList");
  const btnShufflePlaylist = document.getElementById("btnShufflePlaylist");
  const repeatBadge = document.getElementById("repeatBadge");
  const iconPlay = document.getElementById("iconPlay");
  const iconPause = document.getElementById("iconPause");
  const nameDialog = document.getElementById("nameDialog");
  const nameDialogTitle = document.getElementById("nameDialogTitle");
  const nameInput = document.getElementById("nameInput");
  const addTrackSelect = document.getElementById("addTrackSelect");
  const btnAddToPlaylist = document.getElementById("btnAddToPlaylist");
  const miniAddToPlaylist = document.getElementById("miniAddToPlaylist");
  const addToPlaylistDialog = document.getElementById("addToPlaylistDialog");
  const addToPlaylistList = document.getElementById("addToPlaylistList");
  const addToPlaylistStatus = document.getElementById("addToPlaylistStatus");
  const btnAddToPlaylistNew = document.getElementById("btnAddToPlaylistNew");
  const btnAddToPlaylistCancel = document.getElementById("btnAddToPlaylistCancel");
  const countBhakti = document.getElementById("countBhakti");
  const countFolk = document.getElementById("countFolk");
  const countOther = document.getElementById("countOther");
  const searchInput = document.getElementById("searchInput");
  const homeBrowse = document.getElementById("homeBrowse");
  const homeSearchResults = document.getElementById("homeSearchResults");
  const searchList = document.getElementById("searchList");
  const searchEmpty = document.getElementById("searchEmpty");
  const searchStatus = document.getElementById("searchStatus");
  const listSearchInput = document.getElementById("listSearchInput");
  const listSearchWrap = document.getElementById("listSearchWrap");

  const views = {
    home: document.getElementById("viewHome"),
    list: document.getElementById("viewList"),
    playlists: document.getElementById("viewPlaylists"),
    "playlist-detail": document.getElementById("viewPlaylistDetail"),
  };

  /** @type {Array<{id:string,title:string,artist?:string,file:string,category:string,dateAdded:string}>} */
  let library = [];
  let queue = [];
  let index = 0;
  let seeking = false;
  let shuffleOn = false;
  let repeatMode = "off";
  let sortBy = "name";
  /** @type {string|null} */
  let activePlaylistId = null;
  /** @type {Array<{id:string,name:string,trackIds:string[]}>} */
  let playlists = [];
  /** @type {string[]} */
  let recentlyPlayed = [];
  const durationCache = new Map();
  let nameDialogResolve = null;
  /** Current list context for Songs/category/recent */
  let listContext = { kind: "songs", category: null };
  /** Filter query for Songs/category list drill-in */
  let listFilterQuery = "";
  /** Tracks currently shown in list view (for shuffle play) */
  let currentListTracks = [];
  let hasTrack = false;
  /** User hit pause (UI / lock-screen / keyboard) — do not auto-resume after calls */
  let userPause = false;
  /** System paused us (call, other audio, OS) while we still wanted to play */
  let interruptedBySystem = false;
  /** Page hid while audio was still playing (outgoing call / leave-app) — order vs pause matters */
  let leftForegroundFirst = false;
  /** Timestamp when we hid while still playing (ms) */
  let hiddenWhilePlayingAt = 0;
  /** Do not auto-resume on next foreground (outgoing / user leave heuristic) */
  let skipAutoResume = false;
  /** True while an explicit Play forces pause→play (that pause is not a user pause) */
  let resumeKick = false;
  /** Ignore a stale system pause action in the same beat as explicit Play */
  let suppressSystemPause = false;
  /** ms timestamp of the last explicit Play (lock screen / in-app) */
  let explicitPlayAt = 0;
  /** Re-play attempts after a stale interruption pause following explicit Play */
  let explicitPlayRetries = 0;
  /** Cancels a deferred pagehide check when a newer one arrives */
  let pagehideToken = 0;
  /** Per-track loudness multiplier (from Drive blob decode); UI volume stays separate */
  let trackGain = 1;
  /** Autoplay requested but play() failed (common when locked) — retry on focus/MS play */
  let pendingAutoplay = false;
  /** Absolute URL currently assigned to <audio> (detect revoked blob / src loss) */
  let activeObjectUrl = "";

  /** iOS Safari / iPadOS (incl. iPad desktop UA) — Media Session quirks */
  const isIOS = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent || "") ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  // Keep background playback + lock-screen eligibility on iOS
  try {
    audio.setAttribute("playsinline", "");
    audio.setAttribute("webkit-playsinline", "");
    audio.playsInline = true;
    // auto: warmer buffer; metadata alone is fine for list probes
    audio.preload = "auto";
  } catch (_) { /* ignore */ }

  const applyVolume = () => {
    const ui = Number(volume && volume.value != null ? volume.value : 0.9);
    const v = ui * (Number.isFinite(trackGain) && trackGain > 0 ? trackGain : 1);
    // HTMLMediaElement.volume is capped at 1 — quiet tracks can only boost up to unity
    audio.volume = Math.min(1, Math.max(0, v));
  };

  const setTrackGainForFileId = (fileId) => {
    let g = 1;
    try {
      if (fileId && window.DriveMusic && DriveMusic.getCachedGain) {
        g = Number(DriveMusic.getCachedGain(fileId)) || 1;
      }
    } catch (_) {
      g = 1;
    }
    trackGain = g;
    applyVolume();
  };

  const pinPlaybackBlobs = () => {
    if (!window.DriveMusic || !DriveMusic.setPinnedFileIds || !queue.length) return;
    const ids = [];
    const pushId = (t) => {
      if (t && isDriveTrack(t) && t.driveFileId) ids.push(t.driveFileId);
    };
    pushId(queue[index]);
    if (queue.length > 1) {
      pushId(queue[(index + 1) % queue.length]);
      pushId(queue[(index - 1 + queue.length) % queue.length]);
    }
    try {
      DriveMusic.setPinnedFileIds(ids);
    } catch (_) { /* ignore */ }
  };

  /** Warm next (and prev) Drive blobs while current track plays — critical for lock-screen advance */
  let prefetchToken = 0;
  const prefetchNeighbors = () => {
    if (!window.DriveMusic || !DriveMusic.fetchPlayableUrl || !queue.length) return;
    pinPlaybackBlobs();
    const token = ++prefetchToken;
    const targets = [];
    if (queue.length > 1) {
      targets.push(queue[(index + 1) % queue.length]);
      targets.push(queue[(index - 1 + queue.length) % queue.length]);
    }
    targets.forEach((t) => {
      if (!t || !isDriveTrack(t) || !t.driveFileId) return;
      if (DriveMusic.getCachedBlobUrl && DriveMusic.getCachedBlobUrl(t.driveFileId)) return;
      DriveMusic.fetchPlayableUrl(t.driveFileId, {
        resourceKey: t.driveResourceKey || "",
      })
        .then(() => {
          if (token !== prefetchToken) return;
          pinPlaybackBlobs();
        })
        .catch(() => { /* best-effort warm cache */ });
    });
  };

  const uid = () =>
    "pl_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);


  // Unlock password stored in localStorage (myMusic.driveApiKey).
  // Legacy Hyd+YYYYMM gate key is cleared if present.
  try {
    localStorage.removeItem("myMusic.gate.v1");
  } catch (_) { /* ignore */ }

  const gateEl = document.getElementById("gate");
  const gateForm = document.getElementById("gateForm");
  const gateInput = document.getElementById("gateInput");
  const gateError = document.getElementById("gateError");
  const gateUnlockBtn = document.getElementById("gateUnlock");
  const gateTogglePw = document.getElementById("gateTogglePw");

  const hasRememberedApiKey = () =>
    !!(window.DriveMusic && DriveMusic.getApiKey && DriveMusic.getApiKey());

  const showGate = () => {
    document.body.classList.add("gated");
    if (gateEl) {
      gateEl.hidden = false;
    }
    if (gateError) {
      gateError.hidden = true;
      gateError.textContent = "";
    }
    if (gateUnlockBtn) {
      gateUnlockBtn.disabled = false;
      gateUnlockBtn.textContent = "Unlock";
    }
    if (gateInput) {
      gateInput.value = "";
      gateInput.disabled = false;
      gateInput.type = "password";
      setTimeout(() => gateInput.focus(), 50);
    }
    if (gateTogglePw) {
      gateTogglePw.setAttribute("aria-pressed", "false");
      gateTogglePw.setAttribute("aria-label", "Show password");
      gateTogglePw.title = "Show password";
      const showIcon = gateTogglePw.querySelector(".gate-eye-show");
      const hideIcon = gateTogglePw.querySelector(".gate-eye-hide");
      if (showIcon) showIcon.hidden = false;
      if (hideIcon) hideIcon.hidden = true;
    }
  };

  const hideGate = () => {
    document.body.classList.remove("gated");
    if (gateEl) gateEl.hidden = true;
    if (gateError) {
      gateError.hidden = true;
      gateError.textContent = "";
    }
  };

  const setGateError = (msg) => {
    if (!gateError) return;
    gateError.textContent = msg || "";
    gateError.hidden = !msg;
  };

  const lockApp = () => {
    try {
      if (window.DriveMusic) {
        DriveMusic.setApiKey("");
        if (DriveMusic.clearBlobCache) DriveMusic.clearBlobCache();
      }
    } catch (_) { /* ignore */ }
    userPause = true;
    interruptedBySystem = false;
    pendingAutoplay = false;
    audio.pause();
    showGate();
  };


  const loadState = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.playlists)) playlists = data.playlists;
      if (Array.isArray(data.recentlyPlayed)) recentlyPlayed = data.recentlyPlayed;
      if (data.prefs) {
        if (data.prefs.repeat) repeatMode = data.prefs.repeat;
        if (typeof data.prefs.shuffle === "boolean") shuffleOn = data.prefs.shuffle;
        if (data.prefs.sort === "name" || data.prefs.sort === "date") sortBy = data.prefs.sort;
        if (typeof data.prefs.volume === "number") volume.value = String(data.prefs.volume);
        if (data.prefs.activePlaylistId) activePlaylistId = data.prefs.activePlaylistId;
      }
    } catch (_) { /* ignore */ }
  };

  const saveState = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          playlists,
          recentlyPlayed,
          prefs: {
            repeat: repeatMode,
            shuffle: shuffleOn,
            sort: sortBy,
            volume: Number(volume.value),
            activePlaylistId,
            lastTrackId: queue[index] ? queue[index].id : null,
          },
        })
      );
    } catch (_) { /* quota */ }
  };

  const formatTime = (sec) => {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const updateSeekFill = () => {
    const pct = (Number(seek.value) / Number(seek.max)) * 100;
    seek.style.setProperty("--seek-pct", `${pct}%`);
    if (miniProgressFill) miniProgressFill.style.width = `${pct}%`;
  };

  const byId = (id) => library.find((t) => t.id === id);

  const compareTracks = (a, b) => {
    if (sortBy === "date") {
      const da = a.dateAdded || "";
      const db = b.dateAdded || "";
      if (da !== db) return db.localeCompare(da);
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    }
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  };

  const songsForContext = () => {
    let list;
    if (listContext.kind === "category" && listContext.category) {
      list = library.filter((t) => t.category === listContext.category);
    } else if (listContext.kind === "recent") {
      list = recentlyPlayed.map(byId).filter(Boolean);
      return list; // keep chronological order
    } else {
      list = library.slice();
    }
    list.sort(compareTracks);
    return list;
  };

  const countByCategory = (cat) => library.filter((t) => t.category === cat).length;

  const updateHomeCounts = () => {
    const set = (el, n) => {
      if (el) el.textContent = String(n);
    };
    set(countBhakti, countByCategory("bhakti"));
    set(countFolk, countByCategory("folk"));
    set(countOther, countByCategory("other"));
  };

  const shuffleArray = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const setQueueFrom = (sourceList, preferId) => {
    const currentId = preferId || (queue[index] && queue[index].id);
    let next = sourceList.slice();
    if (shuffleOn && next.length > 1) {
      next = shuffleArray(next);
      if (currentId) {
        const at = next.findIndex((t) => t.id === currentId);
        if (at > 0) {
          const [cur] = next.splice(at, 1);
          next.unshift(cur);
        }
      }
    }
    queue = next;
    if (currentId) {
      const i = queue.findIndex((t) => t.id === currentId);
      index = i >= 0 ? i : 0;
    } else {
      index = 0;
    }
  };

  const showView = (name) => {
    Object.entries(views).forEach(([key, el]) => {
      if (!el) return;
      const on = key === name;
      el.classList.toggle("hidden", !on);
      el.hidden = !on;
    });
  };

  const openSheet = () => {
    npSheet.hidden = false;
    npSheet.setAttribute("aria-hidden", "false");
    document.body.classList.add("sheet-open");
  };

  const closeSheet = () => {
    npSheet.hidden = true;
    npSheet.setAttribute("aria-hidden", "true");
    document.body.classList.remove("sheet-open");
  };

  const cacheAudio = (file) => {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return;
    try {
      const url = new URL(file, location.href).href;
      // Do not cache cross-origin Drive media (CORS / size / opaque responses).
      if (new URL(url).origin !== location.origin) return;
      navigator.serviceWorker.controller.postMessage({ type: "CACHE_AUDIO", url });
    } catch (_) { /* ignore */ }
  };

  const pushRecent = (track) => {
    if (!track || !track.id) return;
    recentlyPlayed = [track.id, ...recentlyPlayed.filter((id) => id !== track.id)].slice(0, RECENT_MAX);
    saveState();
    if (listContext.kind === "recent" && !views.list.hidden) renderList();
  };

  const setPlayingUI = (playing) => {
    iconPlay.classList.toggle("hidden", playing);
    iconPause.classList.toggle("hidden", !playing);
    miniIconPlay.classList.toggle("hidden", playing);
    miniIconPause.classList.toggle("hidden", !playing);
    btnPlay.setAttribute("aria-label", playing ? "Pause" : "Play");
    btnPlay.title = playing ? "Pause (Space)" : "Play (Space)";
    miniPlay.setAttribute("aria-label", playing ? "Pause" : "Play");
    npArt.classList.toggle("playing", playing);
    document.querySelectorAll(".track").forEach((el) => {
      const id = el.dataset.id;
      el.classList.toggle("is-playing", playing && id === (queue[index] && queue[index].id));
    });
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }
  };

  const highlight = () => {
    const curId = queue[index] && queue[index].id;
    document.querySelectorAll(".track").forEach((el) => {
      const on = el.dataset.id === curId;
      el.classList.toggle("active", on);
      el.classList.toggle("is-playing", on && !audio.paused);
      el.setAttribute("aria-current", on ? "true" : "false");
    });
  };

  let mediaArtworkCache = null;
  const mediaArtwork = () => {
    if (mediaArtworkCache) return mediaArtworkCache;
    const artwork = [];
    // iOS picks the first artwork entry and historically greys out images >128px.
    // Generate real per-size PNGs (data URLs / same-origin) — SVG is ignored on iOS.
    const sizes = isIOS() ? [96, 128, 256] : [96, 128, 192, 256, 384, 512];
    sizes.forEach((size) => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#f5e6ea";
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = "#fc3c44";
        const fontPx = Math.round(size * 0.43);
        ctx.font = `${fontPx}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("♪", size / 2, size * 0.55);
        artwork.push({
          src: canvas.toDataURL("image/png"),
          sizes: `${size}x${size}`,
          type: "image/png",
        });
      } catch (_) { /* ignore */ }
    });
    if (!artwork.length) {
      try {
        const abs = new URL(
          "data:image/svg+xml," +
            encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="64" fill="#f5e6ea"/><text x="256" y="310" text-anchor="middle" font-size="220" fill="#fc3c44">♪</text></svg>`
            ),
          location.href
        ).href;
        artwork.push({ src: abs, sizes: "512x512", type: "image/svg+xml" });
      } catch (_) { /* ignore */ }
    }
    mediaArtworkCache = artwork;
    return artwork;
  };

  let lastPositionStateAt = 0;
  const updatePositionState = (force = false) => {
    if (!("mediaSession" in navigator) || typeof navigator.mediaSession.setPositionState !== "function") {
      return;
    }
    try {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      // Throttle timeupdate spam — iOS is happier with ~0.5–1s ticks
      if (!force && now - lastPositionStateAt < 500) return;
      lastPositionStateAt = now;
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(Math.max(0, audio.currentTime), audio.duration),
      });
    } catch (_) { /* unsupported / invalid state */ }
  };

  const updateMediaSession = () => {
    if (!("mediaSession" in navigator) || !queue.length) return;
    const track = queue[index];
    // Keep one continuous Media Session: refresh metadata in place (no clear).
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || "My Music",
        album: "My Music",
        artwork: mediaArtwork(),
      });
    } catch (_) { /* ignore */ }
    navigator.mediaSession.playbackState = audio.paused ? "paused" : "playing";
    updatePositionState(true);
  };

  /**
   * Put a still-cached blob (or local file) on <audio> synchronously.
   * Lock-screen Play must not wait on a fetch — iOS drops the media-session
   * activation, and a later audio.play() is ignored while the screen is locked.
   * Returns true when play() can be called in this same turn.
   */
  const rehydrateSrcSync = () => {
    const track = queue[index];
    if (!track) return false;
    const saved = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
    const assign = (src) => {
      if (!src) return false;
      if (audio.src === src && !audio.error) {
        try {
          if (audio.networkState === 3) return false;
        } catch (_) { /* ignore */ }
        activeObjectUrl = src;
        return true;
      }
      try {
        audio.removeAttribute("crossorigin");
      } catch (_) { /* ignore */ }
      audio.src = src;
      activeObjectUrl = src;
      if (saved > 0.25) {
        const restore = () => {
          try {
            if (Number.isFinite(audio.duration) && saved < audio.duration) {
              audio.currentTime = saved;
            }
          } catch (_) { /* ignore */ }
        };
        audio.addEventListener("loadedmetadata", restore, { once: true });
      }
      return true;
    };

    if (isDriveTrack(track) && window.DriveMusic && track.driveFileId) {
      let cached = null;
      try {
        if (DriveMusic.getCachedBlobUrl) cached = DriveMusic.getCachedBlobUrl(track.driveFileId);
      } catch (_) { cached = null; }
      if (cached) return assign(cached);
      // Cache miss: still try the element src if it has not errored.
      if (audio.src && !audio.error) {
        try {
          if (audio.networkState !== 3) return true;
        } catch (_) {
          return true;
        }
      }
      return false;
    }
    if (track.file) return assign(track.file);
    return !!(audio.src && !audio.error);
  };

  /** pause-if-wedged then play(). Synthetic pause must not latch userPause / skipAutoResume. */
  const kickPlayback = () => {
    applyVolume();
    resumeKick = true;
    try {
      // After a distraction iOS often leaves paused===false with no audio.
      // play() is then a no-op until something pauses the element first.
      if (!audio.paused) audio.pause();
    } catch (_) { /* ignore */ }
    resumeKick = false;
    userPause = false;
    skipAutoResume = false;
    pendingAutoplay = true;
    try {
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
    } catch (_) { /* ignore */ }
    return playAudioElement();
  };

  const playAudioElement = () => {
    applyVolume();
    return audio.play().then(() => {
      pendingAutoplay = false;
      interruptedBySystem = false;
      setPlayingUI(true);
      setupMediaSessionHandlers();
      updateMediaSession();
    });
  };

  /** play() when ready; retries once via canplay — lock-screen advances need this */
  const playWhenReady = () => {
    pendingAutoplay = true;
    userPause = false;
    const attempt = () =>
      playAudioElement().catch(() => {
        pendingAutoplay = true;
        setPlayingUI(false);
      });
    if (audio.readyState >= 2 /* HAVE_CURRENT_DATA */) {
      return attempt();
    }
    const onReady = () => {
      audio.removeEventListener("canplay", onReady);
      audio.removeEventListener("loadeddata", onReady);
      if (userPause) return;
      attempt();
    };
    audio.addEventListener("canplay", onReady, { once: true });
    audio.addEventListener("loadeddata", onReady, { once: true });
    // Also poke play immediately — some WebKits fire neither while locked
    return attempt();
  };

  const reloadCurrentAndPlay = (wantPlay) => {
    if (!queue.length || !hasTrack) return Promise.resolve();
    const i = index;
    return new Promise((resolve) => {
      loadTrack(i, !!wantPlay);
      resolve();
    });
  };

  /**
   * Explicit Play (lock screen, Control Center, in-app).
   * Always clears skipAutoResume / userPause. Always calls play() in this turn
   * when a src can be restored from the blob cache. Never a no-op.
   */
  const mediaPlay = () => {
    userPause = false;
    interruptedBySystem = false;
    skipAutoResume = false;
    leftForegroundFirst = false;
    hiddenWhilePlayingAt = 0;
    pendingAutoplay = true;
    explicitPlayAt = Date.now();
    explicitPlayRetries = 0;
    suppressSystemPause = true;
    setTimeout(() => {
      suppressSystemPause = false;
    }, 80);
    // A previous stop/pagehide may have dropped handlers — put them back
    // before play so the session stays controllable while locked.
    setupMediaSessionHandlers();
    try {
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = "playing";
    } catch (_) { /* ignore */ }
    applyVolume();

    if (!rehydrateSrcSync()) {
      pendingAutoplay = true;
      loadTrack(index, true);
      return;
    }
    return kickPlayback().catch(() => {
      pendingAutoplay = true;
      setPlayingUI(false);
      const track = queue[index];
      if (
        track &&
        isDriveTrack(track) &&
        audio.error &&
        window.DriveMusic &&
        DriveMusic.clearBlobForFile
      ) {
        try {
          DriveMusic.clearBlobForFile(track.driveFileId);
        } catch (_) { /* ignore */ }
        activeObjectUrl = "";
      }
      reloadCurrentAndPlay(true);
    });
  };

  const mediaPause = () => {
    userPause = true;
    interruptedBySystem = false;
    pendingAutoplay = false;
    skipAutoResume = false;
    leftForegroundFirst = false;
    explicitPlayAt = 0;
    explicitPlayRetries = 0;
    suppressSystemPause = false;
    audio.pause();
  };

  /** Fully kill playback + Media Session (lock-screen swipe-dismiss / unload). */
  const hardStopPlayer = () => {
    userPause = true;
    interruptedBySystem = false;
    pendingAutoplay = false;
    skipAutoResume = true;
    leftForegroundFirst = false;
    hiddenWhilePlayingAt = 0;
    try {
      audio.pause();
    } catch (_) { /* ignore */ }
    try {
      audio.removeAttribute("src");
      audio.load();
    } catch (_) { /* ignore */ }
    activeObjectUrl = "";
    setPlayingUI(false);
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.playbackState = "none";
      } catch (_) { /* ignore */ }
      try {
        navigator.mediaSession.metadata = null;
      } catch (_) { /* ignore */ }
      const clear = (action) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (_) { /* ignore */ }
      };
      ["play", "pause", "stop", "previoustrack", "nexttrack", "seekto", "seekbackward", "seekforward"].forEach(clear);
    }
  };

  const tryResumeAfterInterruption = () => {
    if (userPause || !hasTrack) return;
    // Outgoing / leave: do not auto-play just because the page came back.
    // Explicit lock-screen Play does not go through here.
    if (skipAutoResume) {
      skipAutoResume = false;
      interruptedBySystem = false;
      return;
    }
    if (!interruptedBySystem && !pendingAutoplay) return;
    if (!rehydrateSrcSync()) {
      reloadCurrentAndPlay(true);
      return;
    }
    // Kick even if paused===false: a distraction can leave the element
    // "playing" but silent, and play() alone does nothing.
    kickPlayback().catch(() => {
      reloadCurrentAndPlay(true);
    });
  };

  const setupMediaSessionHandlers = () => {
    if (!("mediaSession" in navigator)) return;
    const bind = (action, handler) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (_) {
        /* action unsupported on this browser */
      }
    };
    bind("play", () => {
      // Must run synchronously: rehydrate, then play(). Never ignore this.
      mediaPlay();
    });
    bind("pause", () => {
      // iOS can deliver a stale interruption "pause" in the same beat as Play.
      if (suppressSystemPause || resumeKick) {
        userPause = false;
        skipAutoResume = false;
        pendingAutoplay = true;
        return;
      }
      mediaPause();
    });
    // Swipe-dismiss / Stop on lock screen (best-effort; iOS may not expose native swipe)
    bind("stop", () => {
      hardStopPlayer();
    });
    bind("previoustrack", () => {
      userPause = false;
      interruptedBySystem = false;
      skipAutoResume = false;
      pendingAutoplay = true;
      loadTrack(index - 1, true);
    });
    bind("nexttrack", () => {
      userPause = false;
      interruptedBySystem = false;
      skipAutoResume = false;
      pendingAutoplay = true;
      loadTrack(index + 1, true);
    });
    bind("seekto", (details) => {
      if (details && details.seekTime != null && Number.isFinite(audio.duration)) {
        audio.currentTime = details.seekTime;
        updatePositionState(true);
      }
    });
    // iOS: seekbackward/seekforward REPLACE next/prev transport buttons in Control
    // Center / lock screen. Prefer skip track; clear seek handlers on iOS.
    if (isIOS()) {
      bind("seekbackward", null);
      bind("seekforward", null);
    } else {
      bind("seekbackward", (details) => {
        const off = (details && details.seekOffset) || 10;
        audio.currentTime = Math.max(0, audio.currentTime - off);
        updatePositionState(true);
      });
      bind("seekforward", (details) => {
        const off = (details && details.seekOffset) || 10;
        if (Number.isFinite(audio.duration)) {
          audio.currentTime = Math.min(audio.duration, audio.currentTime + off);
          updatePositionState(true);
        }
      });
    }
  };

  const setRepeatUI = () => {
    btnRepeat.dataset.mode = repeatMode;
    const labels = {
      off: ["Repeat off", "Repeat: off"],
      all: ["Repeat all", "Repeat: all"],
      one: ["Repeat one", "Repeat: one"],
    };
    const [aria, title] = labels[repeatMode];
    btnRepeat.setAttribute("aria-label", aria);
    btnRepeat.title = title;
    repeatBadge.classList.toggle("hidden", repeatMode !== "one");
  };

  const setShuffleUI = () => {
    btnShuffle.setAttribute("aria-pressed", shuffleOn ? "true" : "false");
    btnShuffle.setAttribute("aria-label", shuffleOn ? "Shuffle on" : "Shuffle off");
    btnShuffle.title = shuffleOn ? "Shuffle: on" : "Shuffle: off";
  };

  const cycleRepeat = () => {
    repeatMode = repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
    setRepeatUI();
    saveState();
  };

  const toggleShuffle = () => {
    shuffleOn = !shuffleOn;
    setShuffleUI();
    if (queue.length) {
      const cur = queue[index];
      setQueueFrom(queue.slice().sort(compareTracks), cur && cur.id);
      // re-apply with shuffle preference using original order from currentListTracks if available
      if (currentListTracks.length) setQueueFrom(currentListTracks, cur && cur.id);
      highlight();
    }
    saveState();
  };

  const showMiniBar = () => {
    miniBar.hidden = false;
  };

  let loadToken = 0;
  let loadAbort = null;

  const isDriveTrack = (track) =>
    !!(track && (track.source === "drive" || track.driveFileId));

  const durationKey = (track) =>
    (track && (track.driveFileId || track.id || track.file)) || "";

  const loadTrack = (i, autoplay = false) => {
    if (!queue.length) return;
    index = ((i % queue.length) + queue.length) % queue.length;
    const track = queue[index];
    hasTrack = true;
    const token = ++loadToken;
    if (loadAbort) {
      try {
        loadAbort.abort();
      } catch (_) { /* ignore */ }
    }
    loadAbort = typeof AbortController !== "undefined" ? new AbortController() : null;

    miniTitle.textContent = track.title;
    miniArtist.textContent = track.artist || "";
    npTitle.textContent = track.title;
    npArtist.textContent = track.artist || "Unknown";
    npCategory.textContent = CAT_LABELS[track.category] || track.category || "";
    seek.value = 0;
    updateSeekFill();
    currentTimeEl.textContent = "0:00";
    const cached = durationCache.get(durationKey(track)) ?? durationCache.get(track.file);
    durationEl.textContent = cached != null ? formatTime(cached) : "0:00";
    highlight();
    document.title = `${track.title} · My Music`;
    updateMediaSession();
    showMiniBar();
    saveState();

    const startPlayback = (src) => {
      if (token !== loadToken) return;
      // Prefer continuous MediaSession: update handlers/metadata, then swap src
      // without clearing audio.src to empty first (keeps iOS session alive).
      audio.removeAttribute("crossorigin");
      setupMediaSessionHandlers();
      updateMediaSession();
      if (isDriveTrack(track) && track.driveFileId) {
        setTrackGainForFileId(track.driveFileId);
      } else {
        trackGain = 1;
        applyVolume();
      }
      // Always assign (never removeAttribute/empty first) so MediaSession stays continuous.
      audio.src = src;
      activeObjectUrl = src || "";
      pinPlaybackBlobs();
      if (autoplay) {
        userPause = false;
        interruptedBySystem = false;
        playWhenReady();
      }
      // Warm neighbors after current src is set (sync path for lock-screen next)
      try {
        prefetchNeighbors();
      } catch (_) { /* ignore */ }
    };

    // Drive: never set audio.src to the raw usercontent URL.
    // Those responses send CORP:same-site (blocks no-cors media) and
    // Content-Disposition:attachment. CORS fetch → blob: works (ACAO:*).
    if (isDriveTrack(track) && window.DriveMusic && track.driveFileId) {
      const fileId = track.driveFileId;
      pinPlaybackBlobs();
      const cachedBlob = DriveMusic.getCachedBlobUrl(fileId);
      if (cachedBlob) {
        startPlayback(cachedBlob);
        return;
      }
      miniArtist.textContent = "Loading from Drive…";
      setPlayingUI(false);
      // Keep pendingAutoplay so visibility/MS play can retry if fetch finishes late
      if (autoplay) pendingAutoplay = true;
      DriveMusic.fetchPlayableUrl(fileId, {
        signal: loadAbort ? loadAbort.signal : undefined,
        resourceKey: track.driveResourceKey || "",
      })
        .then((blobUrl) => {
          if (token !== loadToken) return;
          miniArtist.textContent = track.artist || "";
          startPlayback(blobUrl);
        })
        .catch((err) => {
          if (token !== loadToken) return;
          if (err && err.name === "AbortError") return;
          console.warn("Drive playback failed", err);
          const code = err && err.code ? String(err.code) : "";
          const msg = (err && err.message) || "Could not play this song.";
          // Mini-bar: short password-language line (never "API key").
          let short = "Could not play";
          if (code === "DRIVE_NOT_SHARED" || /isn’t shared|Anyone with the link/i.test(msg)) {
            short = "Not shared for playback";
          } else if (code === "DRIVE_REFERRER") {
            short = "Blocked by site settings";
          } else if (code === "DRIVE_PASSWORD_EXPIRED") {
            short = "Password expired — lock & unlock";
          } else if (code === "DRIVE_BAD_PASSWORD") {
            short = "Password issue — lock & unlock";
          } else if (code === "DRIVE_CROSS_SITE_BLOCK" || /Sec-Fetch|cross-site/i.test(msg)) {
            short = "Drive blocked (password/proxy)";
          } else if (code === "DRIVE_VIRUS_SCAN") {
            short = "Drive confirm page";
          } else if (code === "DRIVE_PROXY_FETCH" || code === "DRIVE_PROXY_HTTP") {
            short = "Media proxy failed";
          } else if (code === "DRIVE_API_HTTP" || code === "DRIVE_API_FETCH" || code === "DRIVE_FORBIDDEN") {
            short = "Couldn’t open song";
          } else if (msg.length < 48) {
            short = msg;
          }
          miniArtist.textContent = short;
          npArtist.textContent = msg.slice(0, 180);
          setDriveStatus(msg.slice(0, 220), true);
          setPlayingUI(false);
          audio.removeAttribute("src");
          try {
            audio.load();
          } catch (_) { /* ignore */ }
        });
      return;
    }

    // Local / same-origin paths only
    startPlayback(track.file);
  };

  const playTrackFromList = (track, sourceList) => {
    currentListTracks = sourceList.slice();
    setQueueFrom(sourceList, track.id);
    const i = queue.findIndex((t) => t.id === track.id);
    loadTrack(i >= 0 ? i : 0, true);
  };

  const playPause = () => {
    if (!queue.length) return;
    if (audio.paused) {
      mediaPlay();
    } else {
      mediaPause();
    }
  };

  const seekBy = (seconds) => {
    if (!Number.isFinite(audio.duration)) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
  };

  const writeRowDuration = (file, seconds) => {
    durationCache.set(file, seconds);
    document.querySelectorAll(`.track[data-file="${CSS.escape(file)}"] .track-dur`).forEach((el) => {
      el.textContent = formatTime(seconds);
    });
  };

  const prefetchDurations = () => {
    library.forEach((track) => {
      const key = durationKey(track);
      if (durationCache.has(key) || durationCache.has(track.file)) {
        const sec = durationCache.get(key) ?? durationCache.get(track.file);
        writeRowDuration(track.file, sec);
        return;
      }
      // Drive usercontent blocks no-cors media probes (CORP:same-site)
      if (isDriveTrack(track)) return;
      const probe = new Audio();
      probe.preload = "metadata";
      probe.src = track.file;
      const onMeta = () => {
        if (Number.isFinite(probe.duration)) {
          writeRowDuration(track.file, probe.duration);
        }
        probe.removeAttribute("src");
        probe.load();
      };
      probe.addEventListener("loadedmetadata", onMeta, { once: true });
      probe.addEventListener(
        "error",
        () => {
          probe.removeAttribute("src");
        },
        { once: true }
      );
    });
  };

  const makeTrackButton = (track, num, opts = {}) => {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "track-row";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "track";
    btn.dataset.id = track.id;
    btn.dataset.file = track.file;
    const cached = durationCache.get(track.file);
    btn.innerHTML = `
      <span class="track-num">${num}</span>
      <span class="track-info">
        <span class="track-title"></span>
        <span class="track-artist"></span>
      </span>
      <span class="track-side">
        <span class="track-dur">${cached != null ? formatTime(cached) : "–:––"}</span>
      </span>
    `;
    btn.querySelector(".track-title").textContent = track.title;
    btn.querySelector(".track-artist").textContent = track.artist || "";
    btn.addEventListener("click", () => {
      const source = opts.sourceList || currentListTracks;
      if (queue[index] && queue[index].id === track.id && !audio.paused) {
        mediaPause();
      } else if (queue[index] && queue[index].id === track.id) {
        mediaPlay();
      } else {
        userPause = false;
        interruptedBySystem = false;
        playTrackFromList(track, source);
      }
    });

    row.appendChild(btn);

    if (opts.onRemove || opts.onMoveUp || opts.onMoveDown) {
      const side = document.createElement("div");
      side.className = "track-side";
      if (opts.onMoveUp) {
        const up = document.createElement("button");
        up.type = "button";
        up.className = "row-btn";
        up.title = "Move up";
        up.setAttribute("aria-label", "Move up");
        up.textContent = "↑";
        up.addEventListener("click", (e) => {
          e.stopPropagation();
          opts.onMoveUp();
        });
        side.appendChild(up);
      }
      if (opts.onMoveDown) {
        const down = document.createElement("button");
        down.type = "button";
        down.className = "row-btn";
        down.title = "Move down";
        down.setAttribute("aria-label", "Move down");
        down.textContent = "↓";
        down.addEventListener("click", (e) => {
          e.stopPropagation();
          opts.onMoveDown();
        });
        side.appendChild(down);
      }
      if (opts.onRemove) {
        const rm = document.createElement("button");
        rm.type = "button";
        rm.className = "row-btn danger";
        const rmLabel = opts.removeLabel || "Remove";
        rm.title = rmLabel;
        rm.setAttribute("aria-label", rmLabel);
        rm.textContent = "×";
        rm.addEventListener("click", (e) => {
          e.stopPropagation();
          opts.onRemove();
        });
        side.appendChild(rm);
      }
      row.appendChild(side);
    }

    li.appendChild(row);
    return li;
  };


  const isAudioTrack = (t) => {
    if (!t) return false;
    if (t.source === "drive") return true;
    if (!t.file) return false;
    if (/\.(mp3|m4a|ogg|wav|aac|flac)(\?|$)/i.test(t.file)) return true;
    // Drive uc / usercontent URLs carry id= without an extension in the path
    if (/drive\.(google|usercontent)\.com/i.test(t.file) || /googleapis\.com\/drive\//i.test(t.file)) {
      return true;
    }
    return false;
  };

  const trackMatchesQuery = (track, q) => {
    if (!q) return true;
    const hay = [
      track.title || "",
      track.artist || "",
      CAT_LABELS[track.category] || track.category || "",
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  };

  const filterLibrary = (q) => {
    const query = (q || "").trim().toLowerCase();
    return library.filter((t) => isAudioTrack(t) && trackMatchesQuery(t, query));
  };

  const clearHomeSearch = () => {
    if (searchInput) searchInput.value = "";
    renderHomeSearch("");
  };

  const renderHomeSearch = (raw) => {
    const q = (raw || "").trim();
    const searching = q.length > 0;
    if (homeBrowse) {
      homeBrowse.classList.toggle("hidden", searching);
      homeBrowse.hidden = searching;
    }
    if (homeSearchResults) {
      homeSearchResults.classList.toggle("hidden", !searching);
      homeSearchResults.hidden = !searching;
    }
    if (!searching) {
      if (searchList) searchList.innerHTML = "";
      if (searchStatus) searchStatus.textContent = "";
      if (searchEmpty) {
        searchEmpty.classList.add("hidden");
        searchEmpty.hidden = true;
      }
      return;
    }
    const matches = filterLibrary(q).slice().sort(compareTracks);
    currentListTracks = matches;
    if (searchList) searchList.innerHTML = "";
    if (searchStatus) {
      searchStatus.textContent = matches.length
        ? `${matches.length} result${matches.length === 1 ? "" : "s"}`
        : "";
    }
    if (searchEmpty) {
      const empty = matches.length === 0;
      searchEmpty.classList.toggle("hidden", !empty);
      searchEmpty.hidden = !empty;
      searchEmpty.textContent = "No matching songs.";
    }
    matches.forEach((track, i) => {
      searchList.appendChild(makeTrackButton(track, i + 1, { sourceList: matches }));
    });
    highlight();
  };

  const setShuffleListVisible = (btn, n) => {
    const show = n >= 2;
    btn.classList.toggle("hidden", !show);
    btn.hidden = !show;
  };

  const renderList = () => {
    let list = songsForContext().filter(isAudioTrack);
    const isRecent = listContext.kind === "recent";
    const canFilter = !isRecent;
    if (listSearchWrap) {
      listSearchWrap.classList.toggle("hidden", !canFilter);
      listSearchWrap.hidden = !canFilter;
    }
    if (canFilter && listFilterQuery.trim()) {
      const q = listFilterQuery.trim().toLowerCase();
      list = list.filter((t) => trackMatchesQuery(t, q));
    }
    currentListTracks = list;
    songListEl.innerHTML = "";
    listToolbar.classList.toggle("hidden", isRecent);
    listToolbar.hidden = isRecent;
    listCount.textContent = list.length ? `${list.length} song${list.length === 1 ? "" : "s"}` : "";
    listEmpty.classList.toggle("hidden", list.length > 0);
    listEmpty.hidden = list.length > 0;
    if (!list.length) {
      if (canFilter && listFilterQuery.trim()) listEmpty.textContent = "No matching songs.";
      else listEmpty.textContent = isRecent ? "Play a track and it will show up here." : "No songs yet.";
    }
    list.forEach((track, i) => {
      const rowOpts = { sourceList: list };
      if (isRecent) {
        rowOpts.removeLabel = "Clear from recent";
        rowOpts.onRemove = () => removeFromRecentlyPlayed(track.id);
      } else {
        rowOpts.removeLabel = "Clear song";
        rowOpts.onRemove = () => removeTrackFromLibrary(track.id);
      }
      songListEl.appendChild(makeTrackButton(track, i + 1, rowOpts));
    });
    setShuffleListVisible(btnShuffleList, list.length);
    highlight();
  };

  const openList = (kind, category) => {
    listContext = { kind, category: category || null };
    listFilterQuery = "";
    if (listSearchInput) {
      listSearchInput.value = "";
      if (kind === "songs") listSearchInput.placeholder = "Find in Songs";
      else if (kind === "category") listSearchInput.placeholder = `Find in ${CAT_LABELS[category] || category}`;
      else listSearchInput.placeholder = "Find songs";
    }
    if (kind === "songs") listTitle.textContent = "Songs";
    else if (kind === "recent") listTitle.textContent = "Recently Played";
    else listTitle.textContent = CAT_LABELS[category] || category;
    document.querySelectorAll(".sort-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.sort === sortBy);
    });
    clearHomeSearch();
    showView("list");
    renderList();
  };

  const renderPlaylists = () => {
    playlistListEl.innerHTML = "";
    playlistsEmpty.classList.toggle("hidden", playlists.length > 0);
    playlistsEmpty.hidden = playlists.length > 0;
    playlists.forEach((pl) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "playlist-item";
      btn.innerHTML = `
        <span class="playlist-icon" aria-hidden="true">♫</span>
        <span class="playlist-meta">
          <span class="playlist-name"></span>
          <span class="playlist-count"></span>
        </span>
        <span class="playlist-chevron" aria-hidden="true">›</span>
      `;
      btn.querySelector(".playlist-name").textContent = pl.name;
      const n = pl.trackIds.filter((id) => byId(id)).length;
      btn.querySelector(".playlist-count").textContent = `${n} song${n === 1 ? "" : "s"}`;
      btn.addEventListener("click", () => showPlaylistDetail(pl.id));
      li.appendChild(btn);
      playlistListEl.appendChild(li);
    });
  };

  const populateAddSelect = (pl) => {
    addTrackSelect.innerHTML = '<option value="">Add track…</option>';
    library
      .slice()
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }))
      .forEach((t) => {
        if (pl.trackIds.includes(t.id)) return;
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.title;
        addTrackSelect.appendChild(opt);
      });
  };

  const renderPlaylistTracks = (pl) => {
    playlistTracksEl.innerHTML = "";
    const tracks = pl.trackIds.map(byId).filter(Boolean);
    currentListTracks = tracks;
    playlistEmpty.classList.toggle("hidden", tracks.length > 0);
    playlistEmpty.hidden = tracks.length > 0;
    setShuffleListVisible(btnShufflePlaylist, tracks.length);
    tracks.forEach((track, i) => {
      playlistTracksEl.appendChild(
        makeTrackButton(track, i + 1, {
          sourceList: tracks,
          removeLabel: "Remove from playlist",
          onRemove: () => {
            pl.trackIds = pl.trackIds.filter((id) => id !== track.id);
            saveState();
            renderPlaylistTracks(pl);
            populateAddSelect(pl);
          },
          onMoveUp: () => {
            if (i <= 0) return;
            const ids = pl.trackIds.slice();
            [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
            pl.trackIds = ids;
            saveState();
            renderPlaylistTracks(pl);
          },
          onMoveDown: () => {
            if (i >= pl.trackIds.length - 1) return;
            const ids = pl.trackIds.slice();
            [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
            pl.trackIds = ids;
            saveState();
            renderPlaylistTracks(pl);
          },
        })
      );
    });
    highlight();
  };

  const showPlaylistDetail = (plId) => {
    const pl = playlists.find((p) => p.id === plId);
    if (!pl) {
      showView("playlists");
      renderPlaylists();
      return;
    }
    activePlaylistId = plId;
    playlistDetailName.textContent = pl.name;
    showView("playlist-detail");
    renderPlaylistTracks(pl);
    populateAddSelect(pl);
    saveState();
  };

  const askName = (title, initial) =>
    new Promise((resolve) => {
      nameDialogTitle.textContent = title;
      nameInput.value = initial || "";
      nameDialogResolve = resolve;
      if (typeof nameDialog.showModal === "function") {
        nameDialog.showModal();
        nameInput.focus();
        nameInput.select();
      } else {
        const v = window.prompt(title, initial || "");
        resolve(v);
      }
    });

  const closeAddToPlaylistDialog = () => {
    if (!addToPlaylistDialog) return;
    try {
      if (addToPlaylistDialog.open) addToPlaylistDialog.close();
    } catch (_) { /* ignore */ }
  };

  const addTrackToPlaylist = (pl, trackId) => {
    if (!pl || !trackId) return { ok: false, reason: "missing" };
    if (pl.trackIds.includes(trackId)) return { ok: false, reason: "exists" };
    pl.trackIds.push(trackId);
    saveState();
    if (activePlaylistId === pl.id) {
      renderPlaylistTracks(pl);
      populateAddSelect(pl);
    }
    renderPlaylists();
    return { ok: true };
  };

  const renderAddToPlaylistPicker = () => {
    if (!addToPlaylistList) return;
    addToPlaylistList.innerHTML = "";
    if (addToPlaylistStatus) {
      addToPlaylistStatus.textContent = "";
      addToPlaylistStatus.hidden = true;
    }
    if (!playlists.length) {
      const li = document.createElement("li");
      li.className = "atp-empty";
      li.textContent = "No playlists yet. Create one below.";
      addToPlaylistList.appendChild(li);
      return;
    }
    playlists.forEach((pl) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "atp-item";
      const n = pl.trackIds.length;
      btn.innerHTML =
        '<span class="atp-name"></span><span class="atp-count"></span>';
      btn.querySelector(".atp-name").textContent = pl.name;
      btn.querySelector(".atp-count").textContent = `${n} song${n === 1 ? "" : "s"}`;
      btn.addEventListener("click", () => {
        const track = queue[index];
        if (!track) return;
        const res = addTrackToPlaylist(pl, track.id);
        if (addToPlaylistStatus) {
          addToPlaylistStatus.hidden = false;
          if (res.ok) {
            addToPlaylistStatus.textContent = `Added to “${pl.name}”`;
            setTimeout(() => closeAddToPlaylistDialog(), 450);
          } else if (res.reason === "exists") {
            addToPlaylistStatus.textContent = `Already in “${pl.name}”`;
          } else {
            addToPlaylistStatus.textContent = "Couldn’t add song.";
          }
        } else if (res.ok) {
          closeAddToPlaylistDialog();
        }
      });
      li.appendChild(btn);
      addToPlaylistList.appendChild(li);
    });
  };

  const openAddToPlaylist = () => {
    if (!hasTrack || !queue[index]) return;
    renderAddToPlaylistPicker();
    if (!addToPlaylistDialog) return;
    if (typeof addToPlaylistDialog.showModal === "function") {
      addToPlaylistDialog.showModal();
    } else {
      addToPlaylistDialog.setAttribute("open", "");
    }
  };

  const shufflePlayCurrentList = () => {
    const list = currentListTracks.slice();
    if (list.length < 2) return;
    shuffleOn = true;
    setShuffleUI();
    const shuffled = shuffleArray(list);
    currentListTracks = list;
    setQueueFrom(shuffled, shuffled[0].id);
    // Force order to shuffled start
    queue = shuffled;
    index = 0;
    loadTrack(0, true);
    saveState();
  };


  // ——— Search ———
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderHomeSearch(searchInput.value);
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.code === "Escape") {
        e.preventDefault();
        clearHomeSearch();
        searchInput.blur();
      }
    });
    searchInput.addEventListener("search", () => {
      // native clear button on type=search
      renderHomeSearch(searchInput.value);
    });
  }

  if (listSearchInput) {
    listSearchInput.addEventListener("input", () => {
      listFilterQuery = listSearchInput.value;
      renderList();
    });
    listSearchInput.addEventListener("keydown", (e) => {
      if (e.code === "Escape") {
        e.preventDefault();
        listFilterQuery = "";
        listSearchInput.value = "";
        renderList();
        listSearchInput.blur();
      }
    });
    listSearchInput.addEventListener("search", () => {
      listFilterQuery = listSearchInput.value;
      renderList();
    });
  }

  // ——— Navigation ———
  document.querySelectorAll(".dest-row").forEach((el) => {
    el.addEventListener("click", () => {
      const nav = el.dataset.nav;
      if (nav === "playlists") {
        clearHomeSearch();
        showView("playlists");
        renderPlaylists();
      } else if (nav === "songs") {
        openList("songs");
      } else if (nav === "recent") {
        openList("recent");
      } else if (nav === "category") {
        openList("category", el.dataset.category);
      }
    });
  });

  document.getElementById("btnBackLibrary").addEventListener("click", () => {
    listFilterQuery = "";
    if (listSearchInput) listSearchInput.value = "";
    showView("home");
    updateHomeCounts();
  });
  document.getElementById("btnBackFromPlaylists").addEventListener("click", () => {
    showView("home");
    updateHomeCounts();
  });
  document.getElementById("btnBackPlaylists").addEventListener("click", () => {
    activePlaylistId = null;
    saveState();
    showView("playlists");
    renderPlaylists();
  });

  document.querySelectorAll(".sort-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      sortBy = btn.dataset.sort === "date" ? "date" : "name";
      document.querySelectorAll(".sort-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.sort === sortBy);
      });
      renderList();
      saveState();
    });
  });

  btnShuffleList.addEventListener("click", shufflePlayCurrentList);
  btnShufflePlaylist.addEventListener("click", shufflePlayCurrentList);

  // ——— Playlists CRUD ———
  document.getElementById("nameForm").addEventListener("submit", (e) => {
    const submitter = e.submitter;
    const val = submitter && submitter.value === "ok" ? nameInput.value.trim() : null;
    if (nameDialogResolve) {
      const r = nameDialogResolve;
      nameDialogResolve = null;
      r(val);
    }
  });

  nameDialog.addEventListener("close", () => {
    if (nameDialogResolve) {
      const r = nameDialogResolve;
      nameDialogResolve = null;
      r(null);
    }
  });

  document.getElementById("btnNewPlaylist").addEventListener("click", async () => {
    const name = await askName("New playlist", "");
    if (!name) return;
    const pl = { id: uid(), name, trackIds: [] };
    playlists.push(pl);
    saveState();
    showPlaylistDetail(pl.id);
  });

  document.getElementById("btnRenamePlaylist").addEventListener("click", async () => {
    const pl = playlists.find((p) => p.id === activePlaylistId);
    if (!pl) return;
    const name = await askName("Rename playlist", pl.name);
    if (!name) return;
    pl.name = name;
    saveState();
    playlistDetailName.textContent = pl.name;
  });

  document.getElementById("btnDeletePlaylist").addEventListener("click", () => {
    const pl = playlists.find((p) => p.id === activePlaylistId);
    if (!pl) return;
    if (!window.confirm(`Delete playlist “${pl.name}”?`)) return;
    playlists = playlists.filter((p) => p.id !== pl.id);
    activePlaylistId = null;
    saveState();
    showView("playlists");
    renderPlaylists();
  });

  document.getElementById("btnAddTrack").addEventListener("click", () => {
    const pl = playlists.find((p) => p.id === activePlaylistId);
    if (!pl) return;
    const id = addTrackSelect.value;
    if (!id || pl.trackIds.includes(id)) return;
    pl.trackIds.push(id);
    saveState();
    renderPlaylistTracks(pl);
    populateAddSelect(pl);
    addTrackSelect.value = "";
  });

  if (btnAddToPlaylist) {
    btnAddToPlaylist.addEventListener("click", (e) => {
      e.stopPropagation();
      openAddToPlaylist();
    });
  }
  if (miniAddToPlaylist) {
    miniAddToPlaylist.addEventListener("click", (e) => {
      e.stopPropagation();
      openAddToPlaylist();
    });
  }
  if (btnAddToPlaylistNew) {
    btnAddToPlaylistNew.addEventListener("click", async () => {
      closeAddToPlaylistDialog();
      const name = await askName("New playlist", "");
      if (!name) return;
      const pl = { id: uid(), name, trackIds: [] };
      playlists.push(pl);
      const track = queue[index];
      if (track) addTrackToPlaylist(pl, track.id);
      else saveState();
      renderPlaylists();
    });
  }
  if (btnAddToPlaylistCancel) {
    btnAddToPlaylistCancel.addEventListener("click", () => closeAddToPlaylistDialog());
  }

  // ——— Mini-bar / sheet ———
  const onMiniActivate = (e) => {
    if (e.target.closest("#miniPlay") || e.target.closest("#miniAddToPlaylist")) return;
    if (!hasTrack) return;
    openSheet();
  };
  miniBar.addEventListener("click", onMiniActivate);
  miniBar.addEventListener("keydown", (e) => {
    if (e.code === "Enter" || e.code === "Space") {
      e.preventDefault();
      onMiniActivate(e);
    }
  });
  miniPlay.addEventListener("click", (e) => {
    e.stopPropagation();
    playPause();
  });
  npClose.addEventListener("click", closeSheet);
  npBackdrop.addEventListener("click", closeSheet);

  // ——— Transport ———
  btnPlay.addEventListener("click", playPause);
  btnPrev.addEventListener("click", () => loadTrack(index - 1, true));
  btnNext.addEventListener("click", () => loadTrack(index + 1, true));
  btnRepeat.addEventListener("click", cycleRepeat);
  btnShuffle.addEventListener("click", toggleShuffle);

  seek.addEventListener("pointerdown", () => {
    seeking = true;
  });
  seek.addEventListener("pointerup", () => {
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = (seek.value / 1000) * audio.duration;
    }
    seeking = false;
  });
  seek.addEventListener("input", () => {
    updateSeekFill();
    if (Number.isFinite(audio.duration)) {
      currentTimeEl.textContent = formatTime((seek.value / 1000) * audio.duration);
    }
  });
  seek.addEventListener("change", () => {
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = (seek.value / 1000) * audio.duration;
    }
    seeking = false;
    updateSeekFill();
  });

  volume.addEventListener("input", () => {
    applyVolume();
    saveState();
  });

  audio.addEventListener("play", () => {
    userPause = false;
    interruptedBySystem = false;
    skipAutoResume = false;
    leftForegroundFirst = false;
    pendingAutoplay = false;
    applyVolume();
    setPlayingUI(true);
    setupMediaSessionHandlers();
    updateMediaSession();
    updatePositionState(true);
    if (queue[index]) {
      pushRecent(queue[index]);
      cacheAudio(queue[index].file);
    }
    prefetchNeighbors();
  });
  // iOS often needs handlers re-bound once media is actually producing audio
  audio.addEventListener("playing", () => {
    pendingAutoplay = false;
    interruptedBySystem = false;
    applyVolume();
    setupMediaSessionHandlers();
    updateMediaSession();
    updatePositionState(true);
    prefetchNeighbors();
  });
  audio.addEventListener("pause", () => {
    // Synthetic pause inside kickPlayback — not a user pause and not "leave".
    if (resumeKick) return;
    setPlayingUI(false);
    updatePositionState(true);
    // Distinguish user pause from system interruption (incoming call, other audio, OS).
    if (userPause) {
      interruptedBySystem = false;
      leftForegroundFirst = false;
      return;
    }
    if (!hasTrack || !audio.src || audio.ended) return;
    // Distraction pause landed just after lock-screen Play — start again.
    // Does not run for an intentional pause (userPause already returned).
    if (explicitPlayAt && Date.now() - explicitPlayAt < 1200 && explicitPlayRetries < 2) {
      explicitPlayRetries += 1;
      skipAutoResume = false;
      interruptedBySystem = true;
      pendingAutoplay = true;
      userPause = false;
      playAudioElement().catch(() => {
        pendingAutoplay = true;
      });
      return;
    }
    // Screen was already locked (hid while playing) and a later distraction
    // paused us. That is NOT a hard stop. Skip auto-resume when they reopen
    // the app (outgoing/leave best-effort) but explicit Play must still work.
    if (document.visibilityState === "hidden" && leftForegroundFirst) {
      const hidFor = hiddenWhilePlayingAt ? Date.now() - hiddenWhilePlayingAt : 0;
      if (hidFor > 700) {
        interruptedBySystem = false;
        skipAutoResume = true;
        pendingAutoplay = false;
        return;
      }
    }
    interruptedBySystem = true;
    skipAutoResume = false;
  });
  audio.addEventListener("ended", () => {
    interruptedBySystem = false;
    if (repeatMode === "one") {
      audio.currentTime = 0;
      userPause = false;
      pendingAutoplay = true;
      playWhenReady();
      return;
    }
    if (repeatMode === "off" && index >= queue.length - 1) {
      pendingAutoplay = false;
      setPlayingUI(false);
      seek.value = 0;
      updateSeekFill();
      currentTimeEl.textContent = "0:00";
      return;
    }
    // Advance via ended (works while locked if next blob is prefetched)
    pendingAutoplay = true;
    userPause = false;
    loadTrack(index + 1, true);
  });
  audio.addEventListener("timeupdate", () => {
    if (seeking || !Number.isFinite(audio.duration)) return;
    seek.value = Math.round((audio.currentTime / audio.duration) * 1000) || 0;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    updateSeekFill();
    updatePositionState();
  });
  audio.addEventListener("loadedmetadata", () => {
    durationEl.textContent = formatTime(audio.duration);
    updatePositionState(true);
    if (queue[index] && Number.isFinite(audio.duration)) {
      const t = queue[index];
      durationCache.set(durationKey(t), audio.duration);
      writeRowDuration(t.file, audio.duration);
    }
  });
  audio.addEventListener("durationchange", () => {
    durationEl.textContent = formatTime(audio.duration);
    updatePositionState(true);
    if (queue[index] && Number.isFinite(audio.duration)) {
      const t = queue[index];
      durationCache.set(durationKey(t), audio.duration);
      writeRowDuration(t.file, audio.duration);
    }
  });

  audio.addEventListener("error", () => {
    if (resumeKick) return;
    // Do NOT revoke the blob here. Lock-screen Play must reassign the cached
    // blob URL synchronously inside the action handler. Revoking forces a
    // fetch, and the follow-up play() is no longer in the user activation,
    // so iOS ignores it until the page is opened.
    if (userPause || !hasTrack) return;
    pendingAutoplay = true;
    interruptedBySystem = true;
    skipAutoResume = false;
  });

  document.addEventListener("visibilitychange", () => {
    // Do NOT pause on hidden — keep background / lock-screen playback going.
    if (document.visibilityState === "visible") {
      leftForegroundFirst = false;
      hiddenWhilePlayingAt = 0;
      tryResumeAfterInterruption();
      if (!audio.paused && hasTrack) {
        setupMediaSessionHandlers();
        updateMediaSession();
        applyVolume();
      }
    } else if (hasTrack && !userPause) {
      // Mark leave-first if we hid while audio was still playing (outgoing heuristic)
      if (!audio.paused) {
        leftForegroundFirst = true;
        hiddenWhilePlayingAt = Date.now();
      }
      // Page hiding: ensure next blob is warm before iOS freezes network
      prefetchNeighbors();
      setupMediaSessionHandlers();
    }
  });
  window.addEventListener("focus", () => tryResumeAfterInterruption());
  window.addEventListener("pageshow", () => tryResumeAfterInterruption());
  // iOS fires pagehide when the screen locks, Control Center opens, or the
  // app is switched — the document is still alive and lock-screen Play must
  // keep working. Do NOT hard-stop there (that cleared src + action handlers,
  // so Play became a no-op until Safari was opened). A real navigation
  // destroys the document before this timer runs; the OS drops the session
  // with the <audio> element. Media Session "stop" still hard-stops.
  window.addEventListener("pagehide", (e) => {
    if (e && e.persisted) return; // bfcache — keep session
    const token = ++pagehideToken;
    setTimeout(() => {
      if (token !== pagehideToken) return;
      if (!hasTrack) return;
      setupMediaSessionHandlers();
      if (!audio.paused) updateMediaSession();
    }, 0);
  });

  // Loudness estimate finished for a Drive file — apply if it's the current track
  window.addEventListener("mymusic-loudness", (ev) => {
    const detail = ev && ev.detail;
    if (!detail || !detail.fileId) return;
    const cur = queue[index];
    if (!cur || !isDriveTrack(cur) || cur.driveFileId !== detail.fileId) return;
    trackGain = Number(detail.gain) || 1;
    applyVolume();
  });

  document.addEventListener("keydown", (e) => {
    if (document.body.classList.contains("gated")) return;
    if (e.target.matches("input, textarea, select")) return;
    if (nameDialog.open) return;
    if (addToPlaylistDialog && addToPlaylistDialog.open) {
      if (e.code === "Escape") {
        e.preventDefault();
        closeAddToPlaylistDialog();
      }
      return;
    }
    const driveDlg = document.getElementById("driveFolderDialog");
    if (driveDlg && driveDlg.open) return;
    const driveFilesDlg = document.getElementById("driveFilesDialog");
    if (driveFilesDlg && driveFilesDlg.open) return;
    if (e.code === "Escape" && !npSheet.hidden) {
      closeSheet();
      return;
    }
    if (e.code === "Escape" && searchInput && searchInput.value.trim() && !views.home.hidden) {
      clearHomeSearch();
      return;
    }
    if (e.code === "Space") {
      e.preventDefault();
      playPause();
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      if (e.shiftKey) loadTrack(index + 1, true);
      else seekBy(5);
    } else if (e.code === "ArrowLeft") {
      e.preventDefault();
      if (e.shiftKey) loadTrack(index - 1, true);
      else seekBy(-5);
    }
  });

  document.getElementById("btnLogout").addEventListener("click", () => {
    lockApp();
  });

  document.getElementById("btnRepair").addEventListener("click", async () => {
    // Never tear down the SW while audio is mid-play without stopping first.
    try {
      userPause = true;
      interruptedBySystem = false;
      pendingAutoplay = false;
      audio.pause();
    } catch (_) { /* ignore */ }
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (_) { /* ignore */ }
    location.reload();
  });


  // ——— Google Drive sources (keyless) ———
  const driveFolderListEl = document.getElementById("driveFolderList");
  const driveFoldersEmpty = document.getElementById("driveFoldersEmpty");
  const driveRefreshStatus = document.getElementById("driveRefreshStatus");
  const driveFolderDialog = document.getElementById("driveFolderDialog");
  const driveFolderInput = document.getElementById("driveFolderInput");
  const driveFolderForm = document.getElementById("driveFolderForm");
  const driveFilesDialog = document.getElementById("driveFilesDialog");
  const driveFilesInput = document.getElementById("driveFilesInput");
  const driveFilesForm = document.getElementById("driveFilesForm");
  let driveRefreshing = false;

  const setDriveStatus = (text, isError) => {
    if (!driveRefreshStatus) return;
    driveRefreshStatus.textContent = text || "";
    driveRefreshStatus.classList.toggle("is-error", !!isError && !!text);
  };

  const renderDriveFolders = () => {
    if (!window.DriveMusic || !driveFolderListEl) return;
    const folders = DriveMusic.loadFolders();
    driveFolderListEl.innerHTML = "";
    if (driveFoldersEmpty) {
      const empty = folders.length === 0;
      driveFoldersEmpty.classList.toggle("hidden", !empty);
      driveFoldersEmpty.hidden = !empty;
    }
    folders.forEach((folder) => {
      const li = document.createElement("li");
      li.className = "drive-folder-row";
      const meta = document.createElement("div");
      meta.className = "drive-folder-meta";
      const name = document.createElement("div");
      name.className = "drive-folder-name";
      name.textContent = folder.name || "Drive folder";
      const url = document.createElement("div");
      url.className = "drive-folder-url";
      url.textContent = folder.url || DriveMusic.folderUrl(folder.id);
      meta.appendChild(name);
      meta.appendChild(url);
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "btn-text danger drive-folder-remove";
      rm.textContent = "Remove";
      rm.setAttribute("aria-label", `Remove folder ${folder.name || folder.id}`);
      rm.addEventListener("click", () => {
        DriveMusic.removeFolder(folder.id);
        // Drop cached tracks that belonged only to this folder, then re-merge
        const cache = DriveMusic.loadCache();
        const remaining = (cache.tracks || []).filter(
          (t) => t.driveFolderId !== folder.id
        );
        DriveMusic.saveCache(remaining);
        applyDriveTracks(remaining);
        renderDriveFolders();
        setDriveStatus(`Removed folder. ${remaining.length} Drive track${remaining.length === 1 ? "" : "s"} left.`);
      });
      li.appendChild(meta);
      li.appendChild(rm);
      driveFolderListEl.appendChild(li);
    });
  };

  const applyDriveTracks = (driveTracks) => {
    const seed = library.filter((t) => t.source !== "drive");
    const merged = DriveMusic.mergeLibraries(seed, driveTracks || []);
    library = normalizeTracks(merged);
    // Refresh playback URLs for drive tracks (usercontent, keyless)
    library = library.map((t) => {
      if (t.source === "drive" && t.driveFileId) {
        return { ...t, file: DriveMusic.playbackUrl(t.driveFileId) };
      }
      return t;
    });
    updateHomeCounts();
    prefetchDurations();
    if (!views.home.hidden) {
      /* stay on home */
    } else if (!views.list.hidden) {
      renderList();
    } else if (!views["playlist-detail"].hidden && activePlaylistId) {
      const pl = playlists.find((p) => p.id === activePlaylistId);
      if (pl) {
        renderPlaylistTracks(pl);
        populateAddSelect(pl);
      }
    }
    // Keep queue ids valid
    if (queue.length) {
      const curId = queue[index] && queue[index].id;
      const refreshed = queue.map((t) => byId(t.id) || t).filter(Boolean);
      if (refreshed.length) {
        queue = refreshed;
        const i = queue.findIndex((t) => t.id === curId);
        index = i >= 0 ? i : 0;
      }
    }
  };

  const resetEmptyPlayer = () => {
    queue = [];
    index = 0;
    hasTrack = false;
    setPlayingUI(false);
    miniBar.hidden = true;
    miniTitle.textContent = "";
    miniArtist.textContent = "";
    npTitle.textContent = "";
    npArtist.textContent = "";
    npCategory.textContent = "";
    document.title = "My Music";
    highlight();
  };

  const stopIfTrackGone = (removedId) => {
    const playingId = queue[index] && queue[index].id;
    if (removedId && playingId === removedId) {
      userPause = true;
      interruptedBySystem = false;
      audio.pause();
      audio.removeAttribute("src");
      try {
        audio.load();
      } catch (_) { /* ignore */ }
    }
    queue = queue.filter((t) => t && t.id !== removedId);
    if (index >= queue.length) index = Math.max(0, queue.length - 1);
    if (!queue.length) {
      resetEmptyPlayer();
    } else if (playingId === removedId) {
      loadTrack(index, false);
    } else {
      highlight();
    }
  };

  const removeFromRecentlyPlayed = (trackId) => {
    if (!trackId) return;
    recentlyPlayed = recentlyPlayed.filter((id) => id !== trackId);
    saveState();
    if (!views.list.hidden && listContext.kind === "recent") renderList();
  };

  /** Remove one song from local library (Drive cache, playlists refs, recent, blob). Password kept. */
  const removeTrackFromLibrary = (trackId) => {
    if (!trackId) return;
    const track = byId(trackId);
    library = library.filter((t) => t.id !== trackId);
    recentlyPlayed = recentlyPlayed.filter((id) => id !== trackId);
    playlists.forEach((pl) => {
      pl.trackIds = (pl.trackIds || []).filter((id) => id !== trackId);
    });
    if (window.DriveMusic && track && track.source === "drive") {
      const cache = DriveMusic.loadCache();
      const remaining = (cache.tracks || []).filter((t) => t && t.id !== trackId);
      DriveMusic.saveCache(remaining);
      if (track.driveFileId && DriveMusic.clearBlobForFile) {
        DriveMusic.clearBlobForFile(track.driveFileId);
      }
    }
    saveState();
    stopIfTrackGone(trackId);
    updateHomeCounts();
    if (!views.list.hidden) renderList();
    else if (!views["playlist-detail"].hidden && activePlaylistId) {
      const pl = playlists.find((p) => p.id === activePlaylistId);
      if (pl) {
        renderPlaylistTracks(pl);
        populateAddSelect(pl);
      }
    } else if (!views.home.hidden) {
      /* home counts already updated */
    }
    if (!views.playlists.hidden) renderPlaylists();
  };

  /**
   * Wipe all imported songs / Drive track cache / recently played / playlist contents.
   * Keeps saved Drive folder URLs and unlock password. Playlists themselves remain (empty).
   */
  const clearLibraryAll = () => {
    const msg =
      "Clear all songs from this browser? This removes imported Drive tracks, recently played, and playlist song lists. Saved Drive folders and your unlock password are kept — use Refresh to re-import. Use Lock to clear the password.";
    if (!window.confirm(msg)) return;
    userPause = true;
    interruptedBySystem = false;
    audio.pause();
    try {
      audio.removeAttribute("src");
      audio.load();
    } catch (_) { /* ignore */ }
    if (window.DriveMusic) {
      if (DriveMusic.clearTrackCache) DriveMusic.clearTrackCache();
      else {
        DriveMusic.saveCache([]);
        if (DriveMusic.clearBlobCache) DriveMusic.clearBlobCache();
      }
    }
    // Drop all local/Drive library rows (no seed audio in this build)
    library = [];
    recentlyPlayed = [];
    playlists.forEach((pl) => {
      pl.trackIds = [];
    });
    currentListTracks = [];
    saveState();
    resetEmptyPlayer();
    updateHomeCounts();
    renderDriveFolders();
    setDriveStatus("Library cleared. Folders kept — tap Refresh library to re-import.");
    if (!views.list.hidden) renderList();
    else if (!views.playlists.hidden) renderPlaylists();
    else if (!views["playlist-detail"].hidden && activePlaylistId) {
      const pl = playlists.find((p) => p.id === activePlaylistId);
      if (pl) {
        renderPlaylistTracks(pl);
        populateAddSelect(pl);
      }
    } else {
      showView("home");
    }
  };

  const refreshDriveLibrary = async ({ silent } = {}) => {
    if (!window.DriveMusic) return;
    if (driveRefreshing) return;
    if (!DriveMusic.getApiKey || !DriveMusic.getApiKey()) {
      if (!silent) setDriveStatus("Unlock with your password first.", true);
      lockApp();
      return;
    }
    const folders = DriveMusic.loadFolders();
    if (!folders.length) {
      applyDriveTracks([]);
      if (!silent) setDriveStatus("Add a Drive folder first.");
      return;
    }
    driveRefreshing = true;
    setDriveStatus("Refreshing…");
    const btn = document.getElementById("btnRefreshDrive");
    if (btn) btn.disabled = true;
    try {
      const result = await DriveMusic.refreshAll();
      applyDriveTracks(result.tracks);
      renderDriveFolders();
      const n = result.tracks.length;
      const errN = result.errors.length;
      if (errN && !n) {
        setDriveStatus(result.errors[0].message, true);
      } else if (errN) {
        setDriveStatus(
          `Loaded ${n} Drive track${n === 1 ? "" : "s"}; ${errN} folder error${errN === 1 ? "" : "s"}.`,
          true
        );
      } else {
        setDriveStatus(
          `Loaded ${n} Drive track${n === 1 ? "" : "s"} from ${result.folders.length} folder${result.folders.length === 1 ? "" : "s"}.`
        );
      }
    } catch (err) {
      setDriveStatus(err.message || String(err), true);
    } finally {
      driveRefreshing = false;
      if (btn) btn.disabled = false;
    }
  };

  const openDriveFolderDialog = () => {
    if (!driveFolderDialog || !driveFolderInput) return;
    driveFolderInput.value = "";
    if (typeof driveFolderDialog.showModal === "function") {
      driveFolderDialog.showModal();
      driveFolderInput.focus();
    } else {
      const v = window.prompt("Paste a Google Drive folder URL");
      if (v) handleAddDriveFolder(v);
    }
  };

  const handleAddDriveFolder = async (raw) => {
    if (!window.DriveMusic) return;
    try {
      const { folder, added } = DriveMusic.addFolder(raw);
      renderDriveFolders();
      if (!added) {
        setDriveStatus("That folder is already in your list.");
        return;
      }
      setDriveStatus(`Added folder${folder.name ? ` “${folder.name}”` : ""}. Refreshing…`);
      await refreshDriveLibrary();
    } catch (err) {
      setDriveStatus(err.message || String(err), true);
    }
  };

  if (driveFolderForm) {
    driveFolderForm.addEventListener("submit", (e) => {
      const submitter = e.submitter;
      const ok = submitter && submitter.value === "ok";
      const val = ok && driveFolderInput ? driveFolderInput.value.trim() : "";
      // method=dialog closes automatically; handle after
      if (ok && val) {
        // defer until dialog closes
        setTimeout(() => handleAddDriveFolder(val), 0);
      }
    });
  }

  const openDriveFilesDialog = () => {
    if (!driveFilesDialog || !driveFilesInput) return;
    driveFilesInput.value = "";
    if (typeof driveFilesDialog.showModal === "function") {
      driveFilesDialog.showModal();
      driveFilesInput.focus();
    } else {
      const v = window.prompt("Paste Drive file links (one per line)");
      if (v) handleImportFileLinks(v);
    }
  };

  const handleImportFileLinks = (raw) => {
    if (!window.DriveMusic) return;
    try {
      const { tracks, added, total } = DriveMusic.importFileLinks(raw, "bhakti");
      applyDriveTracks(tracks);
      setDriveStatus(
        `Imported ${added} new file${added === 1 ? "" : "s"} (${total} in paste). ${tracks.length} Drive track${tracks.length === 1 ? "" : "s"} total.`
      );
    } catch (err) {
      setDriveStatus(err.message || String(err), true);
    }
  };

  if (driveFilesForm) {
    driveFilesForm.addEventListener("submit", (e) => {
      const submitter = e.submitter;
      const ok = submitter && submitter.value === "ok";
      const val = ok && driveFilesInput ? driveFilesInput.value.trim() : "";
      if (ok && val) {
        setTimeout(() => handleImportFileLinks(val), 0);
      }
    });
  }

  const btnAddDriveFolder = document.getElementById("btnAddDriveFolder");
  if (btnAddDriveFolder) btnAddDriveFolder.addEventListener("click", openDriveFolderDialog);
  const btnPasteFileLinks = document.getElementById("btnPasteFileLinks");
  if (btnPasteFileLinks) btnPasteFileLinks.addEventListener("click", openDriveFilesDialog);
  const btnRefreshDrive = document.getElementById("btnRefreshDrive");
  if (btnRefreshDrive) btnRefreshDrive.addEventListener("click", () => refreshDriveLibrary());
  const btnClearLibrary = document.getElementById("btnClearLibrary");
  if (btnClearLibrary) btnClearLibrary.addEventListener("click", () => clearLibraryAll());

  const driveProxyInput = document.getElementById("driveProxyInput");
  const driveKeyStatus = document.getElementById("driveKeyStatus");
  const btnSaveProxy = document.getElementById("btnSaveProxy");

  const updateDriveKeyStatus = () => {
    if (!driveKeyStatus || !window.DriveMusic) return;
    if (DriveMusic.getApiKey && DriveMusic.getApiKey()) {
      driveKeyStatus.textContent =
        "Ready to play · songs need Anyone with the link · Viewer (folder or each file).";
    } else {
      driveKeyStatus.textContent = "Locked — unlock with your password to play.";
    }
  };

  if (window.DriveMusic) {
    if (driveProxyInput) driveProxyInput.value = DriveMusic.getMediaProxy();
    updateDriveKeyStatus();
  }
  if (btnSaveProxy) {
    btnSaveProxy.addEventListener("click", () => {
      if (!window.DriveMusic) return;
      DriveMusic.setMediaProxy(driveProxyInput ? driveProxyInput.value : "");
      DriveMusic.clearBlobCache();
      setDriveStatus(
        DriveMusic.getMediaProxy()
          ? "Media proxy saved — try playing a Drive track."
          : "Media proxy cleared."
      );
    });
  }


  const initDriveUi = () => {
    if (!window.DriveMusic) return;
    const seed = DriveMusic.ensureExampleFolder();
    renderDriveFolders();
    const cache = DriveMusic.loadCache();
    if (cache.tracks && cache.tracks.length) {
      applyDriveTracks(cache.tracks);
      const when = cache.refreshedAt ? ` · cached ${cache.refreshedAt.slice(0, 10)}` : "";
      setDriveStatus(`${cache.tracks.length} Drive track${cache.tracks.length === 1 ? "" : "s"}${when}`);
    } else if (DriveMusic.loadFolders().length) {
      if (seed.seeded) setDriveStatus("Example folder added. Listing…");
      refreshDriveLibrary({ silent: !seed.seeded });
    }
  };

  const registerSW = () => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./sw.js?v=24").catch((err) => {
      console.warn("SW registration failed", err);
    });
  };

  const normalizeTracks = (tracks) =>
    tracks.map((t, i) => ({
      id: t.id || `track_${i}_${(t.file || "").replace(/\W+/g, "_")}`,
      title: t.title || "Untitled",
      artist: t.artist || "",
      file: t.file,
      category: t.category || "other",
      dateAdded: t.dateAdded || "2026-09-28",
      source: t.source || (String(t.id || "").startsWith("drive_") ? "drive" : "local"),
      driveFileId: t.driveFileId || null,
      driveFolderId: t.driveFolderId || null,
    }));

  const boot = (tracks) => {
    const seeds = normalizeTracks(tracks).map((t) => ({ ...t, source: t.source || "local" }));
    let driveTracks = [];
    if (window.DriveMusic) {
      driveTracks = DriveMusic.loadCache().tracks || [];
    }
    library = normalizeTracks(
      window.DriveMusic ? DriveMusic.mergeLibraries(seeds, driveTracks) : seeds
    );
    updateHomeCounts();
    showView("home");
    prefetchDurations();
    initDriveUi();

    let startId = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const prefs = JSON.parse(raw).prefs;
        if (prefs && prefs.lastTrackId) startId = prefs.lastTrackId;
      }
    } catch (_) { /* ignore */ }

    if (library.length) {
      const sorted = library.slice().sort(compareTracks);
      setQueueFrom(sorted, startId || sorted[0].id);
      currentListTracks = sorted;
      if (startId && byId(startId)) {
        const i = queue.findIndex((t) => t.id === startId);
        loadTrack(i >= 0 ? i : 0, false);
      } else {
        // No resume — still load first track into queue but keep mini-bar with that track paused
        // Spec: if lastTrackId, show mini-bar paused; otherwise can show choose something
        // Prefer showing first track ready if we have library
        loadTrack(0, false);
      }
    }
  };

  const loadLibrary = () => {
    fetch("library.json")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load library.json");
        return r.json();
      })
      .then((data) => {
        const tracks = Array.isArray(data) ? data : data.tracks || [];
        // Empty seed is fine — library is Drive-only (+ empty state)
        boot(tracks);
      })
      .catch((err) => {
        console.error(err);
        // Still boot so Drive cache / example folder can populate
        boot([]);
      });
  };

  let appStarted = false;
  const startApp = () => {
    if (appStarted) return;
    appStarted = true;
    hideGate();
    loadState();
    trackGain = 1;
    applyVolume();
    updateSeekFill();
    setRepeatUI();
    setShuffleUI();
    setupMediaSessionHandlers();
    registerSW();
    showView("home");
    loadLibrary();
  };

  if (gateTogglePw && gateInput) {
    gateTogglePw.addEventListener("click", () => {
      const showing = gateInput.type === "text";
      gateInput.type = showing ? "password" : "text";
      const nowShowing = gateInput.type === "text";
      gateTogglePw.setAttribute("aria-pressed", nowShowing ? "true" : "false");
      gateTogglePw.setAttribute(
        "aria-label",
        nowShowing ? "Hide password" : "Show password"
      );
      gateTogglePw.title = nowShowing ? "Hide password" : "Show password";
      const showIcon = gateTogglePw.querySelector(".gate-eye-show");
      const hideIcon = gateTogglePw.querySelector(".gate-eye-hide");
      if (showIcon) showIcon.hidden = nowShowing;
      if (hideIcon) hideIcon.hidden = !nowShowing;
      gateInput.focus();
    });
  }

  if (gateForm) {
    gateForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const typed = gateInput ? gateInput.value.trim() : "";
      if (!window.DriveMusic || !DriveMusic.validateApiKey) {
        setGateError("Password check unavailable. Repair and reload.");
        return;
      }
      if (gateUnlockBtn) {
        gateUnlockBtn.disabled = true;
        gateUnlockBtn.textContent = "Checking…";
      }
      if (gateInput) gateInput.disabled = true;
      setGateError("");
      try {
        await DriveMusic.validateApiKey(typed);
        DriveMusic.setApiKey(typed);
        if (DriveMusic.clearBlobCache) DriveMusic.clearBlobCache();
        hideGate();
        startApp();
        updateDriveKeyStatus();
      } catch (err) {
        setGateError((err && err.message) || "That password didn’t work. Try again.");
        if (gateInput) {
          gateInput.disabled = false;
          gateInput.select();
          gateInput.focus();
        }
        if (gateUnlockBtn) {
          gateUnlockBtn.disabled = false;
          gateUnlockBtn.textContent = "Unlock";
        }
      }
    });
  }

  // Init — unlock with remembered password, else show lock screen
  if (hasRememberedApiKey()) {
    startApp();
  } else {
    showGate();
  }
})();
