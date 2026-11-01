import { test } from "node:test";
import assert from "node:assert/strict";
import { SerperBudget, serperCallCap, serperCapDeferMs, serperPages, serperRankMaxDepth, serperWorstCasePages } from "./serperBudget";

test("env off = unchanged behaviour", () => {
  assert.equal(serperRankMaxDepth(50, {}), 50);
  assert.equal(serperCallCap({}), null);
  assert.equal(serperCapDeferMs({}), 0);
});

test("max depth is clamped and rounded to whole pages", () => {
  assert.equal(serperRankMaxDepth(50, { SERPER_RANK_MAX_DEPTH: "20" }), 20);
  assert.equal(serperRankMaxDepth(50, { SERPER_RANK_MAX_DEPTH: "25" }), 20);
  assert.equal(serperRankMaxDepth(50, { SERPER_RANK_MAX_DEPTH: "90" }), 50);
  assert.equal(serperRankMaxDepth(50, { SERPER_RANK_MAX_DEPTH: "5" }), 50);
});

test("11-01 round reproduces 67 calls at depth 50, and <=20 at depth 20", () => {
  // lastPosition before the 11-01 round, from RankCheck 10-29
  const prev = [1, 2, 3, 34, null, 2, 17, 1, 2, 26];
  // escalations actually happened for 6 keywords (missed the window); worst case covers them
  const worst50 = prev.reduce<number>((s, p) => s + serperWorstCasePages(p, 50), 0);
  assert.ok(worst50 >= 67);
  const worst20 = prev.reduce<number>((s, p) => s + serperWorstCasePages(p, 20), 0);
  assert.equal(worst20, 20);
  assert.equal(serperPages(20), 2);
});

test("budget stops before passing the cap", () => {
  const b = new SerperBudget(20, 16);
  assert.equal(b.take(2), true);
  assert.equal(b.take(2), true);
  assert.equal(b.take(1), false);
  assert.equal(b.used, 20);
  assert.equal(b.remaining, 0);
  assert.equal(serperCallCap({ SERPER_MAX_CALLS_PER_RUN: "20" }), 20);
  assert.equal(serperCapDeferMs({ SERPER_CAP_DEFER_HOURS: "28" }), 28 * 3600 * 1000);
});
