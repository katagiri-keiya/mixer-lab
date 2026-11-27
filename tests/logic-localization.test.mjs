import assert from "node:assert/strict";
import test from "node:test";
import * as manifest from "../audio/source-manifest.js";
import { setLanguage } from "../js/i18n/index.js";
import { recordingMac } from "../js/recording.js";
import { buildScenarioState } from "../js/scenarios.js";
import { themeScenarios } from "../js/themes.js";
import { LogicView, danteTrackMessage } from "../js/ui/logic-view.js";
import { recordingMessage } from "../js/ui/patch-view.js";

test("Logic localizes the input picker, arm state, and diagnostics without changing track settings", () => {
  const def = themeScenarios("vocal-jazz-recording").find((scenario) => scenario.id === "x32-vjr-logic");
  manifest.useSong(def.song);
  const state = buildScenarioState(def, manifest.SOURCES_BY_ID, "x32");
  const mac = recordingMac(state.rig);
  const view = Object.assign(Object.create(LogicView.prototype), {
    store: { state }, manifest, picking: 16, selected: new Set([16]), ascending: true,
  });
  const before = structuredClone(state);
  const noPhantom = "Condenser mic, no +48 V: it's plugged in but silent. Turn on phantom power.";
  try {
    setLanguage("ja");
    const ja = view.logicHtml(mac);
    assert.match(ja, /aria-label="Audio 17の入力を選択"/);
    assert.match(ja, /data-in="29">入力 29/);
    assert.match(ja, /data-logic-select="16" checked aria-label="Audio 17を選択"/);
    assert.match(ja, /aria-label="トラック17の録音待機：オン"/);
    assert.match(ja, /data-logic-ascending checked/);
    assert.equal(danteTrackMessage("No input"), "入力未設定");
    assert.match(danteTrackMessage("No signal on LOCAL 29"), /LOCAL 29に信号がありません/);
    assert.match(danteTrackMessage(noPhantom), /\+48 V/);
    assert.notEqual(recordingMessage(noPhantom), noPhantom);
    assert.equal(recordingMessage("No power: S32 is switched off."), "電源なし：S32がオフです。");

    setLanguage("en");
    const en = view.logicHtml(mac);
    assert.match(en, /aria-label="Audio 17 input"/);
    assert.match(en, /data-in="29">Input 29/);
    assert.match(en, /aria-label="Record-enable Audio 17"/);
    assert.equal(danteTrackMessage("No input"), "No input");
    assert.equal(recordingMessage(noPhantom), noPhantom);
    assert.deepEqual(state, before);
    assert.deepEqual([...view.selected], [16]);
    assert.equal(view.picking, 16);
  } finally {
    setLanguage("ja");
    manifest.useSong(manifest.DEFAULT_SONG);
  }
});
