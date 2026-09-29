(() => {
  const audio = document.getElementById("audio");
  const playlistEl = document.getElementById("playlist");
  const trackTitle = document.getElementById("trackTitle");
  const trackArtist = document.getElementById("trackArtist");
  const trackCount = document.getElementById("trackCount");
  const currentTimeEl = document.getElementById("currentTime");
  const durationEl = document.getElementById("duration");
  const seek = document.getElementById("seek");
  const volume = document.getElementById("volume");
  const btnPlay = document.getElementById("btnPlay");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");
  const btnRepeat = document.getElementById("btnRepeat");
  const repeatBadge = document.getElementById("repeatBadge");
  const iconPlay = document.getElementById("iconPlay");
  const iconPause = document.getElementById("iconPause");
  const art = document.getElementById("art");

  let tracks = [];
  let index = 0;
  let seeking = false;
  let repeatMode = "off"; // off | all | one
  const durationCache = new Map(); // file -> seconds

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

  const setPlayingUI = (playing) => {
    iconPlay.classList.toggle("hidden", playing);
    iconPause.classList.toggle("hidden", !playing);
    btnPlay.setAttribute("aria-label", playing ? "Pause" : "Play");
    btnPlay.title = playing ? "Pause (Space)" : "Play (Space)";
    art.classList.toggle("playing", playing);
    document.querySelectorAll(".track").forEach((el, i) => {
      el.classList.toggle("is-playing", playing && i === index);
    });
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    }
  };

  const highlight = () => {
    document.querySelectorAll(".track").forEach((el, i) => {
      el.classList.toggle("active", i === index);
      el.classList.toggle("is-playing", !audio.paused && i === index);
      el.setAttribute("aria-current", i === index ? "true" : "false");
    });
  };

  const updateMediaSession = () => {
    if (!("mediaSession" in navigator) || !tracks.length) return;
    const track = tracks[index];
    const artwork = [];
    try {
      const abs = new URL("data:image/svg+xml," + encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="64" fill="#1a1018"/><text x="256" y="310" text-anchor="middle" font-size="220" fill="#e8b86d">♪</text></svg>`
      ), location.href).href;
      artwork.push({ src: abs, sizes: "512x512", type: "image/svg+xml" });
    } catch (_) { /* ignore */ }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist || "Bhakti Bhajans",
      album: "Bhakti Bhajans",
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

  const cycleRepeat = () => {
    repeatMode = repeatMode === "off" ? "all" : repeatMode === "all" ? "one" : "off";
    setRepeatUI();
  };

  const loadTrack = (i, autoplay = false) => {
    if (!tracks.length) return;
    index = ((i % tracks.length) + tracks.length) % tracks.length;
    const track = tracks[index];
    audio.src = track.file;
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist || "Unknown";
    seek.value = 0;
    updateSeekFill();
    currentTimeEl.textContent = "0:00";
    const cached = durationCache.get(track.file);
    durationEl.textContent = cached != null ? formatTime(cached) : "0:00";
    highlight();
    document.title = `${track.title} · Bhakti Bhajans`;
    updateMediaSession();
    if (autoplay) {
      audio.play().catch(() => setPlayingUI(false));
    }
  };

  const playPause = () => {
    if (!tracks.length) return;
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
    const el = playlistEl.querySelector(`[data-file="${CSS.escape(file)}"] .track-dur`);
    if (el) el.textContent = formatTime(seconds);
  };

  const prefetchDurations = () => {
    tracks.forEach((track) => {
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
      probe.addEventListener("error", () => {
        probe.removeAttribute("src");
      }, { once: true });
    });
  };

  const renderPlaylist = () => {
    playlistEl.innerHTML = "";
    trackCount.textContent = `${tracks.length} track${tracks.length === 1 ? "" : "s"}`;
    tracks.forEach((track, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "track";
      btn.dataset.file = track.file;
      const cached = durationCache.get(track.file);
      btn.innerHTML = `
        <span class="track-num">${i + 1}</span>
        <span class="track-info">
          <span class="track-title"></span>
          <span class="track-artist"></span>
        </span>
        <span class="track-dur">${cached != null ? formatTime(cached) : "–:––"}</span>
      `;
      btn.querySelector(".track-title").textContent = track.title;
      btn.querySelector(".track-artist").textContent = track.artist || "";
      btn.addEventListener("click", () => {
        if (i === index && !audio.paused) {
          audio.pause();
        } else if (i === index) {
          audio.play().catch(() => setPlayingUI(false));
        } else {
          loadTrack(i, true);
        }
      });
      li.appendChild(btn);
      playlistEl.appendChild(li);
    });
  };

  btnPlay.addEventListener("click", playPause);
  btnPrev.addEventListener("click", () => loadTrack(index - 1, true));
  btnNext.addEventListener("click", () => loadTrack(index + 1, true));
  btnRepeat.addEventListener("click", cycleRepeat);

  seek.addEventListener("pointerdown", () => { seeking = true; });
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
  });

  audio.addEventListener("play", () => setPlayingUI(true));
  audio.addEventListener("pause", () => setPlayingUI(false));
  audio.addEventListener("ended", () => {
    if (repeatMode === "one") {
      audio.currentTime = 0;
      audio.play().catch(() => setPlayingUI(false));
      return;
    }
    if (repeatMode === "off" && index >= tracks.length - 1) {
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
    if (tracks[index]) writeRowDuration(tracks[index].file, audio.duration);
  });
  audio.addEventListener("durationchange", () => {
    durationEl.textContent = formatTime(audio.duration);
    if (tracks[index] && Number.isFinite(audio.duration)) {
      writeRowDuration(tracks[index].file, audio.duration);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea, select")) return;
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

  audio.volume = Number(volume.value);
  updateSeekFill();
  setRepeatUI();
  setupMediaSessionHandlers();

  fetch("playlist.json")
    .then((r) => {
      if (!r.ok) throw new Error("Failed to load playlist.json");
      return r.json();
    })
    .then((data) => {
      tracks = Array.isArray(data) ? data : [];
      if (!tracks.length) {
        trackTitle.textContent = "No tracks";
        trackArtist.textContent = "Add MP3s and update playlist.json";
        return;
      }
      renderPlaylist();
      prefetchDurations();
      loadTrack(0, false);
    })
    .catch((err) => {
      console.error(err);
      trackTitle.textContent = "Could not load playlist";
      trackArtist.textContent = "Check playlist.json";
    });
})();
