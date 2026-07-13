"use strict";
// Question-bank tests for Bible Quest. questions.js is a plain browser script
// (top-level `const LEVELS`), so it's loaded into a vm sandbox and its data
// exported. These run over every shipped level and assert the invariants that
// matter, so this doubles as a data linter — a level with too few questions, a
// duplicate option, or an answer that isn't among the choices fails here at
// commit time instead of in a kid's hands.
//
//   cd bible-quest && node --test

const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function load() {
  const sandbox = { console };
  vm.createContext(sandbox);
  const src =
    fs.readFileSync(path.join(__dirname, "..", "js", "questions.js"), "utf8") +
    "\n;globalThis.__bq = { LEVELS };";
  vm.runInContext(src, sandbox, { filename: "questions-bundle.js" });
  return sandbox.__bq;
}

const { LEVELS } = load();
const EXPECTED_LEVELS = 17;
const MIN_QUESTIONS = 10;

test(`sanity: ${EXPECTED_LEVELS} levels loaded`, () => {
  assert.equal(LEVELS.length, EXPECTED_LEVELS, `expected ${EXPECTED_LEVELS} levels`);
});

test("every level has the required metadata", () => {
  LEVELS.forEach((lv, i) => {
    assert.ok(lv.title && typeof lv.title === "string", `level ${i} missing title`);
    assert.ok(lv.emoji, `level ${i} (${lv.title}) missing emoji`);
    assert.ok(lv.ref, `level ${i} (${lv.title}) missing ref`);
    assert.ok(Array.isArray(lv.theme) && lv.theme.length === 2, `level ${i} (${lv.title}) needs a 2-colour theme`);
    assert.ok(Array.isArray(lv.questions), `level ${i} (${lv.title}) missing questions array`);
  });
});

test(`every level has at least ${MIN_QUESTIONS} questions`, () => {
  const short = LEVELS.filter((lv) => lv.questions.length < MIN_QUESTIONS)
    .map((lv) => `${lv.title} (${lv.questions.length})`);
  assert.deepEqual(short, [], `levels with too few questions: ${short.join(", ")}`);
});

test("every question has a prompt, an answer, and exactly 3 distractors", () => {
  const bad = [];
  LEVELS.forEach((lv) => {
    lv.questions.forEach((q, qi) => {
      const where = `${lv.title} Q${qi + 1}`;
      if (!q.q || typeof q.q !== "string") bad.push(`${where}: missing prompt`);
      if (!q.a || typeof q.a !== "string") bad.push(`${where}: missing answer`);
      if (!Array.isArray(q.d) || q.d.length !== 3) bad.push(`${where}: needs exactly 3 distractors`);
    });
  });
  assert.deepEqual(bad, [], "\n  - " + bad.join("\n  - "));
});

test("every question's 4 options are all unique (answer not among distractors)", () => {
  const dupes = [];
  LEVELS.forEach((lv) => {
    lv.questions.forEach((q, qi) => {
      const opts = [q.a, ...(q.d || [])].map((s) => String(s).trim().toLowerCase());
      if (new Set(opts).size !== opts.length) {
        dupes.push(`${lv.title} Q${qi + 1}: duplicate option in ${JSON.stringify([q.a, ...q.d])}`);
      }
    });
  });
  assert.deepEqual(dupes, [], "\n  - " + dupes.join("\n  - "));
});

test("no question prompt or option is empty or whitespace", () => {
  const blanks = [];
  LEVELS.forEach((lv) => {
    lv.questions.forEach((q, qi) => {
      [q.q, q.a, ...(q.d || [])].forEach((s) => {
        if (!String(s).trim()) blanks.push(`${lv.title} Q${qi + 1}: blank text`);
      });
    });
  });
  assert.deepEqual(blanks, [], "\n  - " + blanks.join("\n  - "));
});
