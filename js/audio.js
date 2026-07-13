// WebAudio sound effects — gamekit synth core (lib/gk-audio.js) plus Bible
// Quest's own jingles. Everything synthesized, no audio files needed.
// click/coin/win/lose/wrong come from the kit defaults.
const Sfx = GK.Sfx;

Object.assign(Sfx, {
  // Bright two-note "ding" for a correct answer, rising in pitch with the streak.
  correct(streak = 0) {
    const step = Math.min(streak, 6);
    this.tone({ freq: 660 * Math.pow(2, step / 12), type: "triangle", dur: 0.12, vol: 0.22 });
    this.tone({ freq: 990 * Math.pow(2, step / 12), type: "triangle", dur: 0.16, vol: 0.2, when: 0.09 });
  },

  // Gentle, non-punishing "aww" for a wrong answer — soft, never harsh.
  wrongAnswer() {
    this.tone({ freq: 320, type: "sine", dur: 0.18, vol: 0.16, slide: -90 });
  },

  // Cheerful fanfare when a level is passed.
  levelComplete() {
    [523, 659, 784, 1047].forEach((f, i) =>
      this.tone({ freq: f, type: "triangle", dur: 0.22, vol: 0.22, when: i * 0.11 }));
  },

  // Sparkly arpeggio for a perfect round (10/10).
  perfect() {
    [784, 988, 1175, 1568, 1976].forEach((f, i) =>
      this.tone({ freq: f, type: "sine", dur: 0.18, vol: 0.2, when: i * 0.07 }));
  },
});
