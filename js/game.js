// Bible Quest — the round engine. One level = ~10 multiple-choice questions,
// shown in order (easy -> hard). Each question: 4 shuffled options, instant
// feedback, then auto-advance. Pass PASS_MARK/10 to complete the level and
// unlock the next. Kept gentle: a missed pass is "let's try again", never a
// harsh GAME OVER.

const COINS_CORRECT = 5;      // coins per correct answer
const COINS_STREAK = 2;       // extra coins per answer once a streak is rolling
const POINTS_BASE = 100;      // points per correct answer
const AUTO_ADVANCE_MS = 1300; // pause on feedback before the next question

const Game = {
  profile: null,
  levelIdx: 0,
  level: null,
  order: [],       // question indices in play order
  step: 0,         // index into `order`
  correctCount: 0,
  streak: 0,
  bestStreak: 0,
  levelScore: 0,
  coinsEarned: 0,
  locked: false,   // ignore taps during feedback/auto-advance
  current: null,   // { choices: [...], answer: "..." } for the on-screen question

  el(id) { return document.getElementById(id); },

  start(profile, levelIdx) {
    this.profile = profile;
    this.levelIdx = levelIdx;
    this.level = LEVELS[levelIdx];
    this.progress = Storage.getProgress(profile.id);
    // Questions play in authored order so difficulty ramps within the round.
    this.order = this.level.questions.map((_, i) => i);
    this.step = 0;
    this.correctCount = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.levelScore = 0;
    this.coinsEarned = 0;
    this.locked = false;

    App.showScreen("game");
    this.renderQuestion();
  },

  renderQuestion() {
    this.locked = false;
    const q = this.level.questions[this.order[this.step]];
    // Fresh shuffled options for this question; remember which one is correct.
    const choices = shuffle([q.a, ...q.d]);
    this.current = { choices, answer: q.a };

    this.el("hud-level").textContent = this.level.emoji + " " + this.level.title;
    this.el("hud-score").textContent = this.levelScore.toLocaleString();
    this.el("hud-coins").textContent = this.progress.coins + this.coinsEarned;
    this.el("hud-streak").textContent = "🔥" + this.streak;

    const total = this.order.length;
    this.el("q-progress").textContent = "Question " + (this.step + 1) + " / " + total;
    this.el("q-ref").textContent = this.level.ref;
    // Progress pips: correct so far shown filled, current highlighted.
    this.el("q-pips").innerHTML = this.order.map((_, i) => {
      const cls = i < this.step ? "done" : i === this.step ? "now" : "";
      return `<span class="pip ${cls}"></span>`;
    }).join("");

    this.el("q-text").textContent = q.q;

    const wrap = this.el("answers");
    wrap.innerHTML = "";
    choices.forEach((choice) => {
      const btn = document.createElement("button");
      btn.className = "answer";
      btn.textContent = choice;
      btn.onclick = () => this.answer(btn, choice);
      wrap.appendChild(btn);
    });
  },

  answer(btn, choice) {
    if (this.locked) return;
    this.locked = true;
    const correct = choice === this.current.answer;
    const buttons = Array.from(this.el("answers").children);

    buttons.forEach((b) => {
      b.disabled = true;
      if (b.textContent === this.current.answer) b.classList.add("right");
    });

    if (correct) {
      btn.classList.add("picked");
      this.correctCount++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      const pts = POINTS_BASE + (this.streak - 1) * 20;
      this.levelScore += pts;
      this.coinsEarned += COINS_CORRECT + (this.streak > 1 ? COINS_STREAK : 0);
      Sfx.correct(this.streak);
      this.floatScore("+" + pts);
      if (this.streak >= 3) this.toast("🔥 " + this.streak + " in a row!", "streak");
    } else {
      btn.classList.add("wrong");
      this.streak = 0;
      Sfx.wrongAnswer();
    }

    this.el("hud-score").textContent = this.levelScore.toLocaleString();
    this.el("hud-coins").textContent = this.progress.coins + this.coinsEarned;
    this.el("hud-streak").textContent = "🔥" + this.streak;

    setTimeout(() => this.next(), AUTO_ADVANCE_MS);
  },

  next() {
    this.step++;
    if (this.step >= this.order.length) return this.finish();
    this.renderQuestion();
  },

  finish() {
    const total = this.order.length;
    const passed = this.correctCount >= PASS_MARK;
    const stars = Storage.starsFor(this.correctCount);
    const perfect = this.correctCount === total;

    // Bank coins always; record the level result only if it beats the old best.
    this.progress.coins += this.coinsEarned;
    if (passed) {
      const prev = this.progress.levels[this.levelIdx];
      if (!prev || this.levelScore > (prev.score || 0)) {
        this.progress.levels[this.levelIdx] = {
          score: this.levelScore,
          stars,
          correct: this.correctCount,
        };
      }
    }
    Storage.saveProgress(this.profile.id, this.progress);

    // Feedback + sound.
    if (perfect) { Sfx.perfect(); Confetti.burst(); }
    else if (passed) { Sfx.levelComplete(); Confetti.burst(); }
    else { Sfx.lose(); }

    this.showResults({ total, passed, stars, perfect });
  },

  showResults({ total, passed, stars, perfect }) {
    const isLast = this.levelIdx >= LEVELS.length - 1;
    const allDone = passed && isLast;

    this.el("res-emoji").textContent = perfect ? "🌟" : passed ? "🎉" : "💪";
    this.el("res-title").textContent = perfect
      ? "Perfect round!"
      : passed
      ? "Level complete!"
      : "So close — try again!";

    this.el("res-stars").innerHTML = [0, 1, 2].map((i) =>
      `<span class="star ${i < stars ? "on" : ""}">★</span>`).join("");

    this.el("res-score").textContent = this.correctCount + " / " + total + " correct";
    this.el("res-points").textContent = "⭐ " + this.levelScore.toLocaleString() + " points";
    this.el("res-coins").textContent = "🪙 " + this.coinsEarned + " coins earned";
    this.el("res-streak").textContent = "🔥 Best streak: " + this.bestStreak;

    // Pass -> Next level (or finished message). Fail -> Try again.
    const next = this.el("res-next");
    const retry = this.el("res-retry");
    const finishedMsg = this.el("res-finished");
    finishedMsg.style.display = "none";

    if (allDone) {
      finishedMsg.style.display = "";
      next.style.display = "none";
      retry.style.display = "none";
    } else if (passed) {
      next.style.display = "";
      next.textContent = "Next story ➜";
      next.onclick = () => { Sfx.click(); Game.start(this.profile, this.levelIdx + 1); };
      retry.style.display = "none";
    } else {
      next.style.display = "none";
      retry.style.display = "";
      retry.textContent = "🔁 Try again";
      retry.onclick = () => { Sfx.click(); Game.start(this.profile, this.levelIdx); };
    }

    App.showScreen("results");
  },

  // ---------- fx ----------
  toast(msg, kind) {
    const t = document.createElement("div");
    t.className = "toast " + (kind || "");
    t.textContent = msg;
    this.el("screen-game").appendChild(t);
    setTimeout(() => t.remove(), 1400);
  },

  floatScore(text) {
    const f = document.createElement("div");
    f.className = "float-score";
    f.textContent = text;
    this.el("screen-game").appendChild(f);
    setTimeout(() => f.remove(), 1100);
  },
};

// Fisher–Yates shuffle — fallback if the vendored gk-util lacks GK.util.shuffle.
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------- confetti ----------
const Confetti = {
  burst() {
    const canvas = document.getElementById("confetti");
    const ctx = canvas.getContext("2d");
    canvas.width = innerWidth; canvas.height = innerHeight;
    const colors = ["#ff5252", "#ffb142", "#fffa65", "#32ff7e", "#18dcff", "#cd84f1", "#ffcccc"];
    const parts = Array.from({ length: 160 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * canvas.height * 0.5,
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 10,
      vy: 2 + Math.random() * 3.5,
      vx: -1.5 + Math.random() * 3,
      rot: Math.random() * Math.PI,
      vr: -0.15 + Math.random() * 0.3,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    const t0 = performance.now();
    (function frame(t) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (t - t0 < 3200) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, canvas.width, canvas.height);
    })(t0);
  },
};
