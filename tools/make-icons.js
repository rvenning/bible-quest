// Generates Bible Quest's PWA icons using the kit's PNG painter.
// An open book (cream pages, gold spine + text lines) with a glowing gold cross,
// on the game's royal-blue field. Run: node tools/make-icons.js  (from the game folder)
const fs = require("fs");
const path = require("path");
const { makeCanvas, downsample, encodePNG } = require("../lib/tools/png.js");

const BLUE = "#3d5af1";
const BLUE_DK = "#2b41c9";
const CREAM = "#fdf6e3";
const CREAM_SH = "#e7dcc0";
const GOLD = "#ffd43b";
const GOLD_DK = "#e0a92e";

// `scale` shrinks the whole motif toward the centre (maskable keeps art ~72%).
function drawIcon(size, scale) {
  const SS = 4, big = size * SS;
  const cv = makeCanvas(big);

  // Rounded royal-blue field with a darker lower half for depth.
  cv.fillRoundRect(0, 0, big, big, big * 0.22, BLUE);
  cv.fillRoundRect(0, big * 0.5, big, big * 0.5, big * 0.22, BLUE_DK, 0.35);

  const cx = big / 2, cy = big * 0.58;
  const pw = big * 0.30 * scale;   // page width
  const ph = big * 0.34 * scale;   // page height
  const gut = big * 0.018 * scale; // half-gutter (spine gap)
  const top = cy - ph / 2;

  // Drop shadow behind the book.
  cv.fillRoundRect(cx - pw - gut, top + big * 0.02 * scale, pw * 2 + gut * 2, ph, big * 0.03, "#1b2a8a", 0.5);

  // Two pages.
  const drawPage = (x) => {
    cv.fillRoundRect(x, top, pw, ph, big * 0.03 * scale, CREAM);
    cv.fillRoundRect(x, top + ph * 0.9, pw, ph * 0.1, big * 0.02 * scale, CREAM_SH); // page-bottom edge
  };
  drawPage(cx - pw - gut); // left
  drawPage(cx + gut);      // right

  // Gold spine down the middle.
  cv.fillRect(cx - gut, top, gut * 2, ph, GOLD_DK);

  // Text lines on each page.
  const lineH = ph * 0.055;
  for (let i = 0; i < 4; i++) {
    const ly = top + ph * (0.2 + i * 0.16);
    const lw = pw * (i === 3 ? 0.5 : 0.72);
    cv.fillRoundRect(cx - pw - gut + pw * 0.14, ly, lw, lineH, lineH / 2, GOLD, 0.85);
    cv.fillRoundRect(cx + gut + pw * 0.14, ly, lw, lineH, lineH / 2, GOLD, 0.85);
  }

  // Glowing gold cross above the book.
  const crx = cx, cryTop = top - big * 0.17 * scale;
  const armW = big * 0.032 * scale, crossH = big * 0.16 * scale, crossW = big * 0.10 * scale;
  cv.fillCircle(crx, cryTop + crossH * 0.42, big * 0.10 * scale, GOLD, 0.28); // halo
  cv.fillRoundRect(crx - armW / 2, cryTop, armW, crossH, armW / 2, GOLD);            // vertical
  cv.fillRoundRect(crx - crossW / 2, cryTop + crossH * 0.28, crossW, armW, armW / 2, GOLD); // horizontal

  return encodePNG(size, size, downsample(cv.px, big, SS));
}

const out = path.join(__dirname, "..", "icons");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "icon-512.png"), drawIcon(512, 1.0));
fs.writeFileSync(path.join(out, "icon-192.png"), drawIcon(192, 1.0));
fs.writeFileSync(path.join(out, "maskable-512.png"), drawIcon(512, 0.78));
console.log("Bible Quest icons written");
