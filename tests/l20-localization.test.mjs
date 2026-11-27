import assert from "node:assert/strict";
import test from "node:test";
import { setLanguage } from "../js/i18n/index.js";
import { l20FaderModeText, l20InputAria } from "../js/ui/mixer-l20-view.js";

test("L-20 explains the active mix, fader pickup and input warning in Japanese", () => {
  try {
    setLanguage("ja");
    assert.match(l20FaderModeText("MASTER"), /緑のLEDが実際のレベル.*LEDの位置まで動かして/);
    assert.match(l20FaderModeText("B"), /MONITOR B.*下の端子の切り替えをBに設定/);
    assert.match(l20InputAria("17/18", { stereo: true }, "CLICK", ""), /17\/18chの入力：CLICK（ステレオLINE入力）/);
    assert.match(l20InputAria(13, { path: "mic" }, "CLAR", "48Vが必要です。"), /警告：48Vが必要です。押すと/);

    setLanguage("en");
    assert.match(l20FaderModeText("MASTER"), /until it reaches its LED/);
    assert.match(l20FaderModeText("B"), /MONITOR B.*set to B/);
    assert.equal(l20InputAria(13, { path: "mic" }, "CLAR", ""), null);
  } finally {
    setLanguage("ja");
  }
});
