import assert from "node:assert/strict";
import test from "node:test";
import { setLanguage } from "../js/i18n/index.js";
import { connectionReason, patchCandidateText } from "../js/ui/patch-view.js";

test("patch candidate counts use a Japanese counter and English singular/plural", () => {
  try {
    setLanguage("ja");
    assert.match(patchCandidateText("AES50 A", 2), /AES50 A。両端に合うケーブルは2本/);
    assert.doesNotMatch(patchCandidateText("AES50 A", 2), /cables/);
    setLanguage("en");
    assert.match(patchCandidateText("AES50 A", 1), /1 cable fit both ends/);
    assert.match(patchCandidateText("AES50 A", 2), /2 cables fit both ends/);
  } finally {
    setLanguage("ja");
  }
});

test("connection diagnostics preserve identifiers and translate the reason at display time", () => {
  const diagnostics = [
    ["Cables run from an output to an input.", /出力から入力/],
    ["AES50 A is AES50; CARD is DANTE. They don't talk to each other.", /AES50 AはAES50、CARDはDANTE/],
    ["LINE IN 2 is already in use. Use one input per channel.", /LINE IN 2は使用中/],
    ["Never feed a power amp's speaker output into an input.", /パワーアンプのスピーカー出力/],
  ];
  try {
    for (const [reason, japanese] of diagnostics) {
      setLanguage("ja");
      assert.match(connectionReason(reason), japanese);
      setLanguage("en");
      assert.equal(connectionReason(reason), reason);
    }
  } finally {
    setLanguage("ja");
  }
});
