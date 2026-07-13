// Persistence: gamekit storage (lib/gk-storage.js) configured for Bible Quest.
// bq_* localStorage keys and the "biblequest" Firestore collection. Bible
// Quest-specific scoring/unlock helpers live below.

const PASS_MARK = 6;            // correct answers (out of 10) needed to pass a level
const STAR_CUTOFFS = [6, 8, 10]; // >=6 -> 1 star, >=8 -> 2, ==10 -> 3

const Storage = GK.createStorage({
  prefix: "bq",
  collection: "biblequest",
  firebaseConfig: window.FIREBASE_CONFIG, // from js/firebase-config.js; null = offline
  blankProgress: () => ({ coins: 0, levels: {}, updated: 0 }),
  // levels: { [levelIdx]: { score, stars, correct } } — best result per level.
  // Cross-device merge: keep the best of each level and the max coins.
  mergeProgress: (a, b) => {
    const levels = { ...a.levels };
    for (const [idx, lv] of Object.entries(b.levels || {})) {
      if (!levels[idx] || (lv.score || 0) > (levels[idx].score || 0)) levels[idx] = lv;
    }
    return {
      coins: Math.max(a.coins || 0, b.coins || 0),
      levels,
    };
  },
});

/* ----- Bible Quest-specific helpers on top of the kit storage ----- */
Object.assign(Storage, {
  // Sum of the best score across every completed level.
  totalScore(progress) {
    return Object.values(progress.levels).reduce((s, l) => s + (l.score || 0), 0);
  },

  // Sum of stars earned across every level (max 3 each).
  totalStars(progress) {
    return Object.values(progress.levels).reduce((s, l) => s + (l.stars || 0), 0);
  },

  // Highest passed level index + 1 = next unlocked level (levels unlock in order).
  unlockedLevel(progress) {
    let max = -1;
    for (const k of Object.keys(progress.levels)) max = Math.max(max, Number(k));
    return max + 1;
  },

  // Stars for a given number of correct answers (0 if the level wasn't passed).
  starsFor(correct) {
    if (correct < STAR_CUTOFFS[0]) return 0;
    let stars = 1;
    if (correct >= STAR_CUTOFFS[1]) stars = 2;
    if (correct >= STAR_CUTOFFS[2]) stars = 3;
    return stars;
  },
});
