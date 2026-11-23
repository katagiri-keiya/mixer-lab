import test from "node:test";
import assert from "node:assert/strict";
import { ALL_BOARD_SCENARIOS, SCENARIOS } from "../js/scenarios.js";
import { LANGUAGES, scenarioText, conditionText } from "../js/i18n/index.js";

const englishShort = { preshow: "Preshow music", "build-rig": "Band into the house", "find-amp": "Find the amp", "more-vocal": "Singer's wedge" };
const displayShort = (def, lang) => lang === "en" ? englishShort[def.id] || def.short || def.title : scenarioText(def, "shortTitle", scenarioText(def, "title", def.title));

test("scenario inventory and fallback remain stable", () => {
  assert.equal(SCENARIOS.filter((s) => s.number > 0).length, 10);
  assert.equal(ALL_BOARD_SCENARIOS.length, 332);
  const preshow = SCENARIOS.find((s) => s.id === "preshow");
  assert.equal(LANGUAGES.ja.scenarios.preshow.title, "開場前の音楽");
  assert.equal(scenarioText(preshow, "title", preshow.title), "開場前の音楽");
  assert.equal(conditionText(preshow, "patched", "fallback"), "ノートパソコンがミキサーのステレオ入力に接続されています");
  const untranslated = SCENARIOS.find((s) => s.id === "build-rig");
  assert.equal(scenarioText(untranslated, "title", untranslated.title), untranslated.title);
  for (const id of ["preshow", "build-rig", "find-amp", "more-vocal"]) {
    const def = SCENARIOS.find((s) => s.id === id);
    assert.notEqual(displayShort(def, "ja"), englishShort[id]);
    assert.equal(displayShort(def, "en"), englishShort[id]);
  }
});

test("translation template sharing is opt-in", () => {
  const source = { id: "x", title: "English title", translationTemplate: "missing" };
  assert.equal(scenarioText(source, "title", source.title), source.title);
});
