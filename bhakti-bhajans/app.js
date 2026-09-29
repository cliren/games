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
  const iconPlay = document.getElementById("iconPlay");
  const iconPause = document.getElementById("iconPause");
  const art = document.getElementById("art");

  let tracks = [];
  let index = 0;
  let seeking = false;

  const formatTime = (sec) => {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const setPlayingUI = (playing) => {
    iconPlay.classList.toggle("hidden", playing);
    iconPause.classList.toggle("hidden", !playing);
    btnPlay.setAttribute("aria-label", playing ? "Pause" : "Play");
    btnPlay.title = playing ? "Pause" : "Play";
    art.classList.toggle("playing", playing);
    document.querySelectorAll(".track").forEach((el, i) => {
      el.classList.toggle("is-playing", playing && i === index);
    });
  };

  const highlight = () => {
    document.querySelectorAll(".track").forEach((el, i) => {
      el.classList.toggle("active", i === index);
      el.classList.toggle("is-playing", !audio.paused && i === index);
      el.setAttribute("aria-current", i === index ? "true" : "false");
    });
  };

  const loadTrack = (i, autoplay = false) => {
    if (!tracks.length) return;
    index = ((i % tracks.length) + tracks.length) % tracks.length;
    const track = tracks[index];
    audio.src = track.file;
    trackTitle.textContent = track.title;
    trackArtist.textContent = track.artist || "Unknown";
    seek.value = 0;
    currentTimeEl.textContent = "0:00";
    durationEl.textContent = "0:00";
    highlight();
    document.title = `${track.title} · Bhakti Bhajans`;
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

  const renderPlaylist = () => {
    playlistEl.innerHTML = "";
    trackCount.textContent = `${tracks.length} track${tracks.length === 1 ? "" : "s"}`;
    tracks.forEach((track, i) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "track";
      btn.innerHTML = `
        <span class="track-num">${i + 1}</span>
        <span class="track-info">
          <span class="track-title"></span>
          <span class="track-artist"></span>
        </span>
        <span class="eq" aria-hidden="true"><span></span><span></span><span></span></span>
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

  seek.addEventListener("pointerdown", () => { seeking = true; });
  seek.addEventListener("pointerup", () => {
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = (seek.value / 1000) * audio.duration;
    }
    seeking = false;
  });
  seek.addEventListener("change", () => {
    if (Number.isFinite(audio.duration)) {
      audio.currentTime = (seek.value / 1000) * audio.duration;
    }
    seeking = false;
  });

  volume.addEventListener("input", () => {
    audio.volume = Number(volume.value);
  });

  audio.addEventListener("play", () => setPlayingUI(true));
  audio.addEventListener("pause", () => setPlayingUI(false));
  audio.addEventListener("ended", () => loadTrack(index + 1, true));
  audio.addEventListener("timeupdate", () => {
    if (seeking || !Number.isFinite(audio.duration)) return;
    seek.value = Math.round((audio.currentTime / audio.duration) * 1000) || 0;
    currentTimeEl.textContent = formatTime(audio.currentTime);
  });
  audio.addEventListener("loadedmetadata", () => {
    durationEl.textContent = formatTime(audio.duration);
  });
  audio.addEventListener("durationchange", () => {
    durationEl.textContent = formatTime(audio.duration);
  });

  document.addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea, button")) return;
    if (e.code === "Space") {
      e.preventDefault();
      playPause();
    } else if (e.code === "ArrowRight") {
      loadTrack(index + 1, true);
    } else if (e.code === "ArrowLeft") {
      loadTrack(index - 1, true);
    }
  });

  audio.volume = Number(volume.value);

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
      loadTrack(0, false);
    })
    .catch((err) => {
      console.error(err);
      trackTitle.textContent = "Could not load playlist";
      trackArtist.textContent = "Check playlist.json";
    });
})();
