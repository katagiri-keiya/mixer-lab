import test from "node:test";
import assert from "node:assert/strict";
import { conditionText, initLanguage, LANGUAGE_KEY, language, scenarioText, setLanguage, t } from "../js/i18n/index.js";
import { SCENARIOS_BY_ID, evaluateScenario, buildScenarioState, captureBaseline } from "../js/scenarios.js";

test("i18n defaults to Japanese and translates preshow", () => {
  initLanguage();
  setLanguage("ja");
  const def = SCENARIOS_BY_ID.preshow;
  assert.equal(language(), "ja");
  assert.equal(scenarioText(def, "title"), "開場前の音楽");
  assert.equal(conditionText(def, "patched"), "ノートパソコンをミキサーのステレオ入力に接続する");
  assert.equal(scenarioText(def, "hints.0"), "音源側のStage & patchから始めます。ノートパソコンのヘッドホン端子は、左右2つの信号を1本で伝える3.5 mmプラグです。左右のペアを受けられるミキサー入力はどれでしょうか？");
  assert.equal(t("ui.earsLabel"), "試聴位置");
});

test("English is the fallback when a key is not translated", () => {
  setLanguage("en");
  const def = SCENARIOS_BY_ID.preshow;
  assert.equal(scenarioText(def, "title"), def.title);
  assert.equal(scenarioText(def, "hints.0"), def.hints[0]);
  assert.equal(t("ui.earsLabel"), "Your ears");
  assert.equal(t("ui.missing", "Original English"), "Original English");
});

test("language preference is saved without changing scenario evaluation", () => {
  const values = new Map();
  const old = globalThis.localStorage;
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  setLanguage("ja");
  assert.equal(values.get(LANGUAGE_KEY), "ja");
  const def = SCENARIOS_BY_ID.preshow;
  const state = buildScenarioState(def);
  const before = evaluateScenario(def, state, captureBaseline(def, state));
  setLanguage("en");
  const after = evaluateScenario(def, state, captureBaseline(def, state));
  assert.deepEqual(after.items.map((item) => [item.id, item.met]), before.items.map((item) => [item.id, item.met]));
  globalThis.localStorage = old;
});
