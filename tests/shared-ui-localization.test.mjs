import assert from "node:assert/strict";
import test from "node:test";
import { setLanguage } from "../js/i18n/index.js";
import { SKINS } from "../js/mixer-models.js";
import { renderFlow } from "../js/ui/flow.js";
import { ListenBar } from "../js/ui/listen-bar.js";

test("signal flow localizes trunk and branch labels while keeping the model's routing labels", () => {
  const root = { innerHTML: "" };
  try {
    setLanguage("ja");
    for (const skin of Object.values(SKINS)) {
      renderFlow(root, skin);
      assert.match(root.innerHTML, /aria-label="全(?:チャンネル|トラック)"/, skin.id);
      assert.doesNotMatch(root.innerHTML, /aria-label="Every (?:channel|track)"/, skin.id);
    }
    renderFlow(root, SKINS.mackie1604);
    assert.match(root.innerHTML, /aria-label="サブグループ"/);
    assert.match(root.innerHTML, /奇数が左、偶数が右/);
    assert.match(root.innerHTML, /ASSIGN TO MAIN MIX/);
    renderFlow(root, SKINS.f8n);
    assert.match(root.innerHTML, /aria-label="全トラック"/);

    renderFlow(root, SKINS.mg102);
    assert.match(root.innerHTML, /左ではAUX1.*右ではAUX2/);
    renderFlow(root, SKINS.vlz1202);
    assert.match(root.innerHTML, /AUX 2<\/strong>はチャンネルLEVELの後/);

    setLanguage("en");
    renderFlow(root, SKINS.mg102);
    assert.match(root.innerHTML, /Left of centre feeds AUX1.*right feeds AUX2/);
    renderFlow(root, SKINS.mackie1604);
    assert.match(root.innerHTML, /aria-label="Every channel"/);
    assert.match(root.innerHTML, /aria-label="Subgroups"/);
    assert.match(root.innerHTML, /odd = left, even = right/);
    renderFlow(root, SKINS.f8n);
    assert.match(root.innerHTML, /aria-label="Every track"/);
  } finally {
    setLanguage("ja");
  }
});

test("the listen map translates silent spot names without changing destination IDs or selection", () => {
  const map = { innerHTML: "" };
  const state = { listen: "main", rig: { devices: [] } };
  const mix = { rig: { endpoints: [] } };
  const bar = {
    map,
    places: [
      { dest: "main", place: "FOH", label: "MAIN", dead: true, kind: "nowhere", x: 10, y: 48 },
      { dest: "aux1", place: "Wedge", label: "AUX 1", dead: false, kind: "stage", x: 80, y: 26 },
    ],
  };
  try {
    setLanguage("ja");
    ListenBar.prototype.drawMap.call(bar, state, mix);
    assert.match(map.innerHTML, /data-dest="main" role="radio" aria-checked="true" tabindex="0" aria-label="FOH（MAIN、無音）"/);
    assert.match(map.innerHTML, /<title>FOH（MAIN、無音）<\/title>/);
    assert.match(map.innerHTML, /data-dest="aux1" role="radio" aria-checked="false" tabindex="-1" aria-label="Wedge \(AUX 1\)"/);
    setLanguage("en");
    ListenBar.prototype.drawMap.call(bar, state, mix);
    assert.match(map.innerHTML, /aria-label="FOH \(MAIN\), silent"/);
  } finally {
    setLanguage("ja");
  }
});
