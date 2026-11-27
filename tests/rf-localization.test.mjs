import assert from "node:assert/strict";
import test from "node:test";
import * as manifest from "../audio/source-manifest.js";
import { receiverChannel } from "../js/connection-model.js";
import { setLanguage } from "../js/i18n/index.js";
import { MixerStore, computeMix } from "../js/mixer-state.js";
import { buildScenarioState } from "../js/scenarios.js";
import { themeScenarios } from "../js/themes.js";
import { PatchView } from "../js/ui/patch-view.js";

test("RF cards follow rack power, antenna paths, pairing and MUTE in both languages", () => {
  manifest.useSong("cme");
  const def = themeScenarios("cme-advanced").find((scenario) => scenario.id === "x32-cme-adv-antenna");
  const store = new MixerStore(buildScenarioState(def, manifest.SOURCES_BY_ID, "x32"));
  const rx = () => store.state.rig.devices.find((d) => d.id === "cme-rx3");
  const card = (lang, id = rx().id) => {
    setLanguage(lang);
    const view = Object.assign(Object.create(PatchView.prototype), {
      store, manifest, cards: new Map(), sourcesRoot: {}, outputsRoot: {},
      getGigId: () => "cme-advanced", getTerms: () => ({}), getRecorder: () => null,
    });
    const before = structuredClone(store.state);
    view.render(computeMix(store.state, manifest.SOURCES_BY_ID, manifest.STEMS));
    assert.deepEqual(store.state, before);
    return view.cards.get(id);
  };

  try {
    assert.match(card("ja"), /ANT A・BともにRF信号なし/);
    assert.match(card("en"), /no antenna/);
    assert.match(card("ja", "cme-pas-x"), /次段の分配器|複数の受信機/);
    assert.match(card("ja", "cme-pas-x"), /がオフです/);
    store.setDevice("cme-pas-x", "on", 1);
    assert.match(card("ja"), /RF信号 ✓ · 音声 ✓/);
    assert.match(card("en"), /no mic paired/);
    assert.match(card("ja"), /マイク未ペアリング/);
    const mic = store.state.rig.devices.find((d) => d.sourceId === rx().pairs.out1);
    assert.match(card("ja", mic.id), /AF OUTはLOCAL 17/);
    assert.match(card("ja", mic.id), /aria-label="マイクのMUTEを切り替え"/);
    store.setDevice(mic.id, "mic", 1);
    assert.match(card("ja"), /送信機でMUTE/);
    assert.match(card("en"), /muted at the mic/);
    store.setDevice(mic.id, "mic", 2);
    assert.match(card("ja"), /マイクの電源オフ/);
    const antenna = store.state.rig.cables.find((c) => c.to === "cme-rx3/ant-b");
    store.disconnect(antenna.id);
    assert.equal(receiverChannel(store.state.rig, rx(), 1).b, false);
    assert.match(card("ja"), /ANT Aのみ受信/);
    assert.match(card("en"), /one antenna only/);
    const antennaA = store.state.rig.cables.find((c) => c.to === "cme-rx3/ant-a");
    store.disconnect(antennaA.id);
    assert.equal(receiverChannel(store.state.rig, rx(), 1).a, false);
    assert.match(card("ja"), /ANT A・BともにRF信号なし/);
    assert.match(card("en"), /no antenna/);
    assert.ok(store.connect(antenna.from, antenna.to, antenna.cable).ok);
    assert.match(card("ja"), /ANT Bのみ受信/);
    store.setDevice(rx().id, "on", 0);
    assert.match(card("ja"), /電源オフ/);
    assert.match(card("en"), /is switched off/);
  } finally {
    setLanguage("ja");
    manifest.useSong(manifest.DEFAULT_SONG);
  }
});
