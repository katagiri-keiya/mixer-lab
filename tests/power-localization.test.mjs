import assert from "node:assert/strict";
import test from "node:test";
import { powerWhy } from "../js/connection-model.js";
import { setLanguage } from "../js/i18n/index.js";
import { localizedPowerPlug, localizedPowerReason } from "../js/ui/patch-view.js";
import { StageView } from "../js/ui/stage-view.js";

test("non-RF and RF power diagnostics share translations and retain their English diagnostics", () => {
  const strip = { id: "strip", type: "rack-furman", rack: "foh", label: "Furman", on: 0 };
  const wedge = { id: "wedge", type: "active-wedge", rack: "foh", label: "Wedge" };
  const receiver = { id: "rx", type: "ptu6000", label: "PTU-6000", plugged: 0 };
  const rig = { devices: [strip, wedge, receiver] };
  const unplugged = powerWhy(rig, { ...wedge, plugged: 0 });
  const off = powerWhy(rig, { ...wedge, on: 0 });
  const rackOff = powerWhy(rig, wedge);
  const rfUnplugged = powerWhy(rig, receiver);

  try {
    setLanguage("ja");
    assert.equal(localizedPowerReason(unplugged), "Wedge：IEC電源ケーブルが接続されていません。");
    assert.equal(localizedPowerReason(off), "Wedgeがオフです。");
    assert.equal(localizedPowerReason(rackOff), "Wedgeのスイッチはオンですが、Furmanはオフです。");
    assert.equal(localizedPowerReason(rfUnplugged), "PTU-6000：電源ケーブルが接続されていません。");
    assert.equal(localizedPowerPlug("power cord", "Power cord"), "電源コード");
    assert.match(StageView.prototype.powerTab({ x: 0, y: 0, w: 100 }, wedge, "no-power", rig), /IEC電源ケーブルは接続済み/);

    setLanguage("en");
    for (const reason of [unplugged, off, rackOff, rfUnplugged]) assert.equal(localizedPowerReason(reason), reason);
    assert.equal(localizedPowerPlug("power cable", "Power cable"), "Power cable");
    assert.equal(localizedPowerPlug("power cord", "Power cord"), "Power cord");
  } finally {
    setLanguage("ja");
  }
});
