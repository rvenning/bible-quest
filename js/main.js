// App shell: screen navigation, the story level map, and the family leaderboard.
// Profiles, PINs, the delete flow and the PWA install button all come from
// gamekit (GK.Profiles / GK.UI / GK.initPWA) — App keeps only what is
// Bible Quest-specific.

const AVATARS = ["🦁", "🕊️", "🐑", "🐟", "🐫", "🦉", "🌟", "🐝", "🦋", "🐢", "🐘", "🌈"];

const App = {
  profile: null,

  el(id) { return document.getElementById(id); },

  async init() {
    Sfx.enabled = Storage.getSettings().sound;
    GK.UI.onScreenChange = (name) => { if (name === "splash") this.refreshSplash(); };
    GK.UI.bindSoundToggle(Storage);
    // Every menu button clicks; buttons that make their own sound keep it.
    GK.UI.bindMenuClicks();

    GK.Profiles.init({
      storage: Storage,
      avatars: AVATARS,
      meta: (p, prog) => `⭐ ${Storage.totalScore(prog).toLocaleString()} · 🏅 ${Storage.totalStars(prog)} · 🪙 ${prog.coins}`,
      onEnter: (p) => { this.profile = p; this.showMap(); },
      addLabel: "New Player",
    });

    GK.initPWA({ appName: "Bible Quest" });

    this.showScreen("splash");
    // Firebase sync happens in the background; the game is playable immediately.
    Storage.initFirebase().then(ok => {
      this.el("sync-badge").textContent = ok ? "☁️ family sync on" : "📴 offline";
      if (ok && GK.UI.screen === "profiles") GK.Profiles.renderList();
      if (ok && GK.UI.screen === "splash") this.refreshSplash();
      if (ok && GK.UI.screen === "map") this.showMap();
      if (ok && GK.UI.screen === "leaderboard") this.showLeaderboard(true);
    });
  },

  showScreen(name) { GK.UI.showScreen(name); },

  // One-tap "Continue as <last player>" on the splash; Start becomes Switch.
  refreshSplash() {
    const last = GK.Profiles.lastProfile();
    const cont = this.el("btn-continue-as"), start = this.el("btn-start");
    if (last) {
      cont.style.display = "";
      cont.textContent = `📖 Continue as ${last.avatar} ${last.name}`;
      cont.onclick = () => { Sfx.init(); GK.Profiles.select(last); };
      start.classList.add("ghost");
      start.textContent = "👥 Switch Player";
    } else {
      cont.style.display = "none";
      start.classList.remove("ghost");
      start.textContent = "📖 Start the Quest";
    }
  },

  // ---------- splash ----------
  play() {
    Sfx.init(); Sfx.click();
    GK.Profiles.renderList();
    this.showScreen("profiles");
  },

  // ---------- level map ----------
  showMap() {
    if (!this.profile) return this.play();
    const prog = Storage.getProgress(this.profile.id);
    const unlocked = Storage.unlockedLevel(prog);

    this.el("map-player").innerHTML = `${this.profile.avatar} <b>${GK.util.esc(this.profile.name)}</b>
      <span class="pmeta">⭐ ${Storage.totalScore(prog).toLocaleString()} · 🪙 ${prog.coins}</span>`;

    // Continue button: jump to the next unlocked (unplayed) story.
    const cont = this.el("btn-continue");
    if (unlocked < LEVELS.length) {
      const lv = LEVELS[unlocked];
      cont.innerHTML = `▶️ Play ${lv.emoji} ${lv.title}`;
      cont.onclick = () => { Sfx.click(); Game.start(this.profile, unlocked); };
      cont.style.display = "";
    } else {
      cont.innerHTML = `🏆 You've finished every story! Replay any level.`;
      cont.onclick = () => { Sfx.click(); };
      cont.style.display = "";
    }

    const wrap = this.el("level-list");
    wrap.innerHTML = "";
    LEVELS.forEach((lv, i) => {
      const result = prog.levels[i];
      const state = result ? "done" : i <= unlocked ? "open" : "locked";
      const card = document.createElement("div");
      card.className = "lvl-card " + state;
      card.style.setProperty("--grad-a", lv.theme[0]);
      card.style.setProperty("--grad-b", lv.theme[1]);

      const stars = result
        ? [0, 1, 2].map(s => `<span class="star ${s < result.stars ? "on" : ""}">★</span>`).join("")
        : "";
      const badge = state === "done" ? stars
        : state === "open" ? `<span class="lvl-go">▶</span>`
        : `<span class="lvl-lock">🔒</span>`;

      card.innerHTML = `
        <div class="lvl-num">${i + 1}</div>
        <div class="lvl-emoji">${lv.emoji}</div>
        <div class="lvl-info">
          <div class="lvl-title">${GK.util.esc(lv.title)}</div>
          <div class="lvl-ref">${state === "locked" ? "Finish the previous story to unlock" : lv.ref}</div>
        </div>
        <div class="lvl-badge">${badge}</div>`;

      if (state !== "locked") {
        card.onclick = () => { Sfx.click(); Game.start(this.profile, i); };
      }
      wrap.appendChild(card);
    });

    this.showScreen("map");
  },

  // ---------- leaderboard ----------
  showLeaderboard(silent) {
    if (!silent) Sfx.click();
    GK.Profiles.renderLeaderboard("lb-rows", {
      cols: r => `<span class="lb-levels">🗺️ ${Object.keys(r.progress.levels).length}/${LEVELS.length}</span>
        <span class="lb-stars">🏅 ${Storage.totalStars(r.progress)}</span>
        <span class="lb-score">⭐ ${Storage.totalScore(r.progress).toLocaleString()}</span>`,
      sort: (a, b) => Storage.totalScore(b.progress) - Storage.totalScore(a.progress),
      meId: this.profile?.id,
      empty: "No players yet — tap Play!",
    });
    this.showScreen("leaderboard");
  },
};

window.addEventListener("DOMContentLoaded", () => App.init());
