import assert from "node:assert/strict";
import test from "node:test";
import { setLanguage } from "../js/i18n/index.js";
import { DanteView } from "../js/ui/dante-view.js";
import { LogicView, danteTrackMessage } from "../js/ui/logic-view.js";

test("Dante display keeps CL3 and X32 directions and control values in both languages", () => {
  const daw = { id: "daw", type: "daw-dvs", dvs: 1, outs: [] };
  const mixer = { id: "mixer", danteRx: [2] };
  const cl3 = Object.assign(Object.create(DanteView.prototype), {
    store: { state: { rig: { devices: [mixer, daw] } } },
    manifest: { SOURCES_BY_ID: {} }, tip: true, rxPage: 0,
  });
  const mac = { dvs: 1, macRx: [2] };
  const x32 = Object.assign(Object.create(LogicView.prototype), {
    store: { state: { rig: { devices: [] } } }, tip: true, rxPage: 0,
  });
  const reason = "Dante Controller: the Mac mini's RX 7 isn't subscribed to the X32";
  try {
    setLanguage("ja");
    const playback = cl3.controllerHtml(mixer);
    const recording = x32.controllerHtml(mac);
    assert.match(playback, /data-rx="0" data-tx="2" aria-pressed="true" aria-label="CL3 RX 1：DVS TX 2を購読中"/);
    assert.match(recording, /data-rx="0" data-tx="2" aria-pressed="true" aria-label="Mac mini RX 1：X32 TX 2を購読中"/);
    assert.match(recording, /同じ番号のTXとRXを一括接続/);
    assert.match(cl3.dvsHtml({ dvs: 1 }), /停止<\/button>/);
    assert.match(x32.dvsHtml({ dvs: 0 }), /起動<\/button>/);
    assert.match(x32.controllerHtml({ dvs: 0 }), /購読する受信機がありません/);
    assert.match(danteTrackMessage(reason), /Mac miniのRX 7がX32を購読していません/);

    setLanguage("en");
    assert.match(cl3.controllerHtml(mixer), /CL3 RX 1 subscribed to DVS 2/);
    assert.match(x32.controllerHtml(mac), /Mac mini RX 1 subscribed to X32 TX 2/);
    assert.match(x32.controllerHtml(mac), /Route one to one/);
    assert.match(x32.dvsHtml({ dvs: 0 }), /Start<\/button>/);
    assert.equal(danteTrackMessage(reason), reason);
    assert.deepEqual(mixer.danteRx, [2]);
    assert.deepEqual(mac.macRx, [2]);
  } finally {
    setLanguage("ja");
  }
});
