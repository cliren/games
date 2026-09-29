(() => {
  const STORAGE_KEY = "myMusic.v1";
  const RECENT_MAX = 30;
  const CAT_LABELS = { bhakti: "Bhakti", folk: "Folk", other: "Other" };

  const audio = document.getElementById("audio");
  const trackListEl = document.getElementById("trackList");
  const recentListEl = document.getElementById("recentList");
  const playlistListEl = document.getElementById("playlistList");
  const playlistTracksEl = document.getElementById("playlistTracks");
  const trackTitle = document.getElementById("trackTitle");
  const trackArtist = document.getElementById("trackArtist");
  const trackCategoryEl = document.getElementById("trackCategory");
  const trackCount = document.getElementById("trackCount");
  const recentCount = document.getElementById("recentCount");
  const recentEmpty = document.getElementById("recentEmpty");
  const currentTimeEl = document.getElementById("currentTime");
  const durationEl = document.getElementById("duration");
  const seek = document.getElementById("seek");
  const volume = document.getElementById("volume");
  const btnPlay = document.getElementById("btnPlay");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnRepeat = document.getElementById("btnRepeat");
  const btnShuffle = document.getElementById("btnShuffle");
  const repeatBadge = document.getElementById("repeatBadge");
  const iconPlay = document.getElementById("iconPlay");
  const iconPause = document.getElementById("iconPause");
  const art = document.getElementById("art");
  const sortSelect = document.getElementById("sortSelect");
  const nameDialog = document.getElementById("nameDialog");
  const nameDialogTitle = document.getElementById("nameDialogTitle");
  const nameInput = document.getElementById("nameInput");
  const addTrackSelect = document.getElementById("addTrackSelect");
  const playlistDetail = document.getElementById("playlistDetail");
  const playlistBrowser = document.getElementById("playlistBrowser");
  const playlistDetailName = document.getElementById("playlistDetailName");

  /** @type {Array<{id:string,title:string,artist?:string,file:string,category:string,dateAdded:string}>} */
  let library = [];
  /** Queue currently driving playback (track objects) */
  let queue = [];
  /** Index into queue */
  let index = 0;
  let seeking = false;
  let shuffleOn = false;
  let repeatMode = "off"; // off | all | one
  /** @type {'library'|'playlists'|'recent'} */
  let activeTab = "library";
  let categoryFilter = "all";
  let sortBy = "name"; // name | date
  /** @type {string|null} */
  let activePlaylistId = null;
  /** @type {Array<{id:string,name:string,trackIds:string[]}>} */
  let playlists = [];
  /** @type {string[]} track ids, newest first */
  let recentlyPlayed = [];
  const durationCache = new Map();
  /** Pending dialog resolve */
  let nameDialogResolve = null;
  let nameDialogMode = "create"; // create | rename

  const uid = () =>
    "pl_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

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
        if (data.prefs.category) categoryFilter = data.prefs.category;
        if (data.prefs.tab) activeTab = data.prefs.tab;
        if (typeof data.prefs.volume === "number") volume.value = String(data.prefs.volume);
        if (data.prefs.activePlaylistId) activePlaylistId = data.prefs.activePlaylistId;
      }
    } catch (_) { /* ignore corrupt */ }
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
            category: categoryFilter,
            tab: activeTab,
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
  };

  const byId = (id) => library.find((t) => t.id === id);

  const compareTracks = (a, b) => {
    if (sortBy === "date") {
      const da = a.dateAdded || "";
      const db = b.dateAdded || "";
      if (da !== db) return db.localeCompare(da); // newest first
      return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
    }
    return a.title.localeCompare(b.title, undefined, { sensitivity: "base" });
  };

  const filteredLibrary = () => {
    let list = library.slice();
    if (categoryFilter !== "all") {
      list = list.filter((t) => t.category === categoryFilter);
    }
    list.sort(compareTracks);
    return list;
  };

  const shuffleArray = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  /** Build playback queue from a source list, keeping current track position when possible */
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

  const rebuildQueueForContext = () => {
    if (activeTab === "playlists" && activePlaylistId) {
      const pl = playlists.find((p) => p.id === activePlaylistId);
      if (pl) {
        const tracks = pl.trackIds.map(byId).filter(Boolean);
        setQueueFrom(tracks);
        return;
      }
    }
    if (activeTab === "recent") {
      const tracks = recentlyPlayed.map(byId).filter(Boolean);
      setQueueFrom(tracks);
      return;
    }
    setQueueFrom(filteredLibrary());
  };

  const cacheAudio = (file) => {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return;
    try {
      const url = new URL(file, location.href).href;
      navigator.serviceWorker.controller.postMessage({ type: "CACHE_AUDIO", url });
    } catch (_) { /* ignore */ }
  };

  const pushRecent = (track) => {
    if (!track || !track.id) return;
    recentlyPlayed = [track.id, ...recentlyPlayed.filter((id) => id !== track.id)].slice(0, RECENT_MAX);
    saveState();
    if (activeTab === "recent") renderRecent();
  };

  const setPlayingUI = (playing) => {
    iconPlay.classList.toggle("hidden", playing);
    iconPause.classList.toggle("hidden", !playing);
    btnPlay.setAttribute("aria-label", playing ? "Pause" : "Play");
    btnPlay.title = playing ? "Pause (Space)" : "Play (Space)";
    art.classList.toggle("playing", playing);
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

  const updateMediaSession = () => {
    if (!("mediaSession" in navigator) || !queue.length) return;
    const track = queue[index];
    const artwork = [];
    try {
      const abs = new URL(
        "data:image/svg+xml," +
          encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="64" fill="#1a1018"/><text x="256" y="310" text-anchor="middle" font-size="220" fill="#e8b86d">♪</text></svg>`
          ),
        location.href
      ).href;
      artwork.push({ src: abs, sizes: "512x512", type: "image/svg+xml" });
    } catch (_) { /* ignore */ }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist || "My Music",
      album: "My Music",
      artwork,
    });
  };

  const setupMediaSessionHandlers = () => {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler("play", () => {
        audio.play().catch(() => setPlayingUI(false));
      });
      navigator.mediaSession.setActionHandler("pause", () => audio.pause());
      navigator.mediaSession.setActionHandler("previoustrack", () => loadTrack(index - 1, true));
      navigator.mediaSession.setActionHandler("nexttrack", () => loadTrack(index + 1, true));
      navigator.mediaSession.setActionHandler("seekto", (details) => {
        if (details.seekTime != null && Number.isFinite(audio.duration)) {
          audio.currentTime = details.seekTime;
        }
      });
      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        const off = details.seekOffset || 5;
        audio.currentTime = Math.max(0, audio.currentTime - off);
      });
      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        const off = details.seekOffset || 5;
        if (Number.isFinite(audio.duration)) {
          audio.currentTime = Math.min(audio.duration, audio.currentTime + off);
        }
      });
    } catch (_) { /* some handlers unsupported */ }
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
    rebuildQueueForContext();
    highlight();
    saveState();
  };

  const loadTrack = (i, autoplay = false) => {
    if (!queue.length) return;
    index = ((i % queue.length) + queue.length) % queue.length;
    const track = queue[index];
    audio.src = track.file;
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist || "Unknown";
    trackCategoryEl.textContent = CAT_LABELS[track.category] || track.category || "";
    seek.value = 0;
    updateSeekFill();
    currentTimeEl.textContent = "0:00";
    const cached = durationCache.get(track.file);
    durationEl.textContent = cached != null ? formatTime(cached) : "0:00";
    highlight();
    document.title = `${track.title} · My Music`;
    updateMediaSession();
    saveState();
    if (autoplay) {
      audio.play().catch(() => setPlayingUI(false));
    }
  };

  const playTrackFromList = (track, sourceList) => {
    setQueueFrom(sourceList, track.id);
    const i = queue.findIndex((t) => t.id === track.id);
    loadTrack(i >= 0 ? i : 0, true);
  };

  const playPause = () => {
    if (!queue.length) return;
    if (audio.paused) {
      audio.play().catch(() => setPlayingUI(false));
    } else {
      audio.pause();
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
      if (durationCache.has(track.file)) {
        writeRowDuration(track.file, durationCache.get(track.file));
        return;
      }
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
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "0.15rem";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "track";
    btn.dataset.id = track.id;
    btn.dataset.file = track.file;
    const cached = durationCache.get(track.file);
    const cat = CAT_LABELS[track.category] || track.category || "";
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
    const artistEl = btn.querySelector(".track-artist");
    artistEl.textContent = track.artist || "";
    if (cat && opts.showCategory !== false) {
      const span = document.createElement("span");
      span.className = "track-cat";
      span.textContent = cat;
      artistEl.appendChild(document.createTextNode(" "));
      artistEl.appendChild(span);
    }
    btn.addEventListener("click", () => {
      const source = opts.sourceList || filteredLibrary();
      if (queue[index] && queue[index].id === track.id && !audio.paused) {
        audio.pause();
      } else if (queue[index] && queue[index].id === track.id) {
        audio.play().catch(() => setPlayingUI(false));
      } else {
        playTrackFromList(track, source);
      }
    });

    row.appendChild(btn);

    if (opts.onRemove || opts.onMoveUp || opts.onMoveDown) {
      const side = document.createElement("div");
      side.className = "track-side";
      side.style.paddingRight = "0.35rem";
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
        rm.title = "Remove";
        rm.setAttribute("aria-label", "Remove from playlist");
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

  const renderLibrary = () => {
    const list = filteredLibrary();
    trackListEl.innerHTML = "";
    trackCount.textContent = `${list.length} track${list.length === 1 ? "" : "s"}`;
    list.forEach((track, i) => {
      trackListEl.appendChild(makeTrackButton(track, i + 1, { sourceList: list }));
    });
    highlight();
  };

  const renderRecent = () => {
    const tracks = recentlyPlayed.map(byId).filter(Boolean);
    recentListEl.innerHTML = "";
    recentCount.textContent = tracks.length ? `${tracks.length}` : "";
    recentEmpty.classList.toggle("hidden", tracks.length > 0);
    tracks.forEach((track, i) => {
      recentListEl.appendChild(makeTrackButton(track, i + 1, { sourceList: tracks }));
    });
    highlight();
  };

  const showPlaylistBrowser = () => {
    playlistDetail.classList.add("hidden");
    playlistDetail.hidden = true;
    playlistBrowser.classList.remove("hidden");
    activePlaylistId = null;
    saveState();
  };

  const showPlaylistDetail = (plId) => {
    const pl = playlists.find((p) => p.id === plId);
    if (!pl) {
      showPlaylistBrowser();
      return;
    }
    activePlaylistId = plId;
    playlistBrowser.classList.add("hidden");
    playlistDetail.classList.remove("hidden");
    playlistDetail.hidden = false;
    playlistDetailName.textContent = pl.name;
    renderPlaylistTracks(pl);
    populateAddSelect(pl);
    saveState();
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
    if (!tracks.length) {
      const p = document.createElement("p");
      p.className = "empty-hint";
      p.textContent = "No tracks yet. Add one above.";
      playlistTracksEl.appendChild(p);
    }
    tracks.forEach((track, i) => {
      playlistTracksEl.appendChild(
        makeTrackButton(track, i + 1, {
          sourceList: tracks,
          onRemove: () => {
            pl.trackIds = pl.trackIds.filter((id) => id !== track.id);
            saveState();
            renderPlaylistTracks(pl);
            populateAddSelect(pl);
            if (activeTab === "playlists") setQueueFrom(pl.trackIds.map(byId).filter(Boolean));
          },
          onMoveUp: () => {
            if (i <= 0) return;
            const ids = pl.trackIds.slice();
            [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
            pl.trackIds = ids;
            saveState();
            renderPlaylistTracks(pl);
            if (activeTab === "playlists") setQueueFrom(pl.trackIds.map(byId).filter(Boolean));
          },
          onMoveDown: () => {
            if (i >= pl.trackIds.length - 1) return;
            const ids = pl.trackIds.slice();
            [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]];
            pl.trackIds = ids;
            saveState();
            renderPlaylistTracks(pl);
            if (activeTab === "playlists") setQueueFrom(pl.trackIds.map(byId).filter(Boolean));
          },
        })
      );
    });
    highlight();
  };

  const renderPlaylists = () => {
    playlistListEl.innerHTML = "";
    if (!playlists.length) {
      const p = document.createElement("p");
      p.className = "empty-hint";
      p.textContent = "Create a playlist to organize your library.";
      playlistListEl.appendChild(p);
      return;
    }
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
      `;
      btn.querySelector(".playlist-name").textContent = pl.name;
      const n = pl.trackIds.filter((id) => byId(id)).length;
      btn.querySelector(".playlist-count").textContent = `${n} track${n === 1 ? "" : "s"}`;
      btn.addEventListener("click", () => showPlaylistDetail(pl.id));
      li.appendChild(btn);
      playlistListEl.appendChild(li);
    });
  };

  const setTab = (tab) => {
    activeTab = tab;
    document.querySelectorAll(".tab").forEach((el) => {
      const on = el.dataset.tab === tab;
      el.classList.toggle("active", on);
      el.setAttribute("aria-selected", on ? "true" : "false");
    });
    const panels = {
      library: document.getElementById("panelLibrary"),
      playlists: document.getElementById("panelPlaylists"),
      recent: document.getElementById("panelRecent"),
    };
    Object.entries(panels).forEach(([key, el]) => {
      const on = key === tab;
      el.classList.toggle("hidden", !on);
      el.hidden = !on;
    });
    if (tab === "library") renderLibrary();
    if (tab === "playlists") {
      if (activePlaylistId && playlists.some((p) => p.id === activePlaylistId)) {
        showPlaylistDetail(activePlaylistId);
      } else {
        showPlaylistBrowser();
        renderPlaylists();
      }
    }
    if (tab === "recent") renderRecent();
    saveState();
  };

  const askName = (title, initial) =>
    new Promise((resolve) => {
      nameDialogMode = title.toLowerCase().includes("rename") ? "rename" : "create";
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
    renderPlaylists();
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
    showPlaylistBrowser();
    renderPlaylists();
  });

  document.getElementById("btnBackPlaylists").addEventListener("click", () => {
    showPlaylistBrowser();
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

  document.querySelectorAll(".tab").forEach((el) => {
    el.addEventListener("click", () => setTab(el.dataset.tab));
  });

  document.querySelectorAll(".chip").forEach((el) => {
    el.addEventListener("click", () => {
      categoryFilter = el.dataset.category;
      document.querySelectorAll(".chip").forEach((c) => {
        c.classList.toggle("active", c.dataset.category === categoryFilter);
      });
      renderLibrary();
      if (activeTab === "library") {
        setQueueFrom(filteredLibrary());
        highlight();
      }
      saveState();
    });
  });

  sortSelect.addEventListener("change", () => {
    sortBy = sortSelect.value === "date" ? "date" : "name";
    renderLibrary();
    if (activeTab === "library") {
      setQueueFrom(filteredLibrary());
      highlight();
    }
    saveState();
  });

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
    audio.volume = Number(volume.value);
    saveState();
  });

  audio.addEventListener("play", () => {
    setPlayingUI(true);
    if (queue[index]) {
      pushRecent(queue[index]);
      cacheAudio(queue[index].file);
    }
  });
  audio.addEventListener("pause", () => setPlayingUI(false));
  audio.addEventListener("ended", () => {
    if (repeatMode === "one") {
      audio.currentTime = 0;
      audio.play().catch(() => setPlayingUI(false));
      return;
    }
    if (repeatMode === "off" && index >= queue.length - 1) {
      setPlayingUI(false);
      seek.value = 0;
      updateSeekFill();
      currentTimeEl.textContent = "0:00";
      return;
    }
    loadTrack(index + 1, true);
  });
  audio.addEventListener("timeupdate", () => {
    if (seeking || !Number.isFinite(audio.duration)) return;
    seek.value = Math.round((audio.currentTime / audio.duration) * 1000) || 0;
    currentTimeEl.textContent = formatTime(audio.currentTime);
    updateSeekFill();
  });
  audio.addEventListener("loadedmetadata", () => {
    durationEl.textContent = formatTime(audio.duration);
    if (queue[index]) writeRowDuration(queue[index].file, audio.duration);
  });
  audio.addEventListener("durationchange", () => {
    durationEl.textContent = formatTime(audio.duration);
    if (queue[index] && Number.isFinite(audio.duration)) {
      writeRowDuration(queue[index].file, audio.duration);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea, select")) return;
    if (nameDialog.open) return;
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

  const registerSW = () => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("SW registration failed", err);
    });
  };

  // Init
  loadState();
  audio.volume = Number(volume.value);
  sortSelect.value = sortBy;
  document.querySelectorAll(".chip").forEach((c) => {
    c.classList.toggle("active", c.dataset.category === categoryFilter);
  });
  updateSeekFill();
  setRepeatUI();
  setShuffleUI();
  setupMediaSessionHandlers();
  registerSW();

  fetch("library.json")
    .then((r) => {
      if (!r.ok) throw new Error("Failed to load library.json");
      return r.json();
    })
    .then((data) => {
      const tracks = Array.isArray(data) ? data : data.tracks || [];
      library = tracks.map((t, i) => ({
        id: t.id || `track_${i}_${(t.file || "").replace(/\W+/g, "_")}`,
        title: t.title || "Untitled",
        artist: t.artist || "",
        file: t.file,
        category: t.category || "other",
        dateAdded: t.dateAdded || "2026-09-28",
      }));
      if (!library.length) {
        trackTitle.textContent = "No tracks";
        trackArtist.textContent = "Add MP3s and update library.json";
        return;
      }
      setQueueFrom(filteredLibrary());
      setTab(activeTab === "playlists" || activeTab === "recent" ? activeTab : "library");
      prefetchDurations();

      let startId = null;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const prefs = JSON.parse(raw).prefs;
          if (prefs && prefs.lastTrackId) startId = prefs.lastTrackId;
        }
      } catch (_) { /* ignore */ }
      if (startId) {
        const i = queue.findIndex((t) => t.id === startId);
        loadTrack(i >= 0 ? i : 0, false);
      } else {
        loadTrack(0, false);
      }
    })
    .catch((err) => {
      console.error(err);
      trackTitle.textContent = "Could not load library";
      trackArtist.textContent = "Check library.json";
    });
})();
