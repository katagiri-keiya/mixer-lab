export const connectionEn = { selfLoop: "That would loop a device back into itself.", outputInput: "Cables run from an output to an input.", unknownPort: "Unknown port or cable.", patchSuccess: "Patched: {from} → {to}", unplugged: "Unplugged.", bothSameDirection: "Both are {direction}. A cable runs from an output to an input.", noCableFits: "No cable in the lab fits both the {from} and the {to} jack.", cableDoesNotFit: "A {cable} doesn't fit the {jack} jack on {port}.", otherEndDoesNotFit: "The other end ({plug}) doesn't fit the {jack} jack on {port}.", alreadyHasCable: "{port} already has a cable.", inUse: "In use → {port}", noCompatibleTarget: "Nothing here takes a {plug} plug.", passiveNeedsAmp: "Line level can't drive a passive speaker — there's no amplifier. Put a power amp in between, or use a powered speaker." };
export const connectionJa = { selfLoop: "機器の出力が自身の入力に戻る接続になるため、接続できません。", outputInput: "ケーブルは出力から入力へ接続します。", unknownPort: "不明なポートまたはケーブルです。", patchSuccess: "接続しました：{from} → {to}", unplugged: "接続を外しました。", bothSameDirection: "両方とも{direction}です。ケーブルは出力から入力へ接続します。", noCableFits: "この実験室のケーブルでは、{from}ジャックと{to}ジャックの両方に合うものがありません。", cableDoesNotFit: "{cable}は{port}の{jack}ジャックに合いません。", otherEndDoesNotFit: "もう一端（{plug}）は{port}の{jack}ジャックに合いません。", alreadyHasCable: "{port}にはすでにケーブルが接続されています。", inUse: "使用中 → {port}", noCompatibleTarget: "{plug}プラグを接続できる場所がありません。", passiveNeedsAmp: "ラインレベル信号ではパッシブスピーカーを駆動できません。間にパワーアンプを接続するか、パワードスピーカーを使用してください。" };
export const connectionReasonsJa = {
  "Antenna coax carries radio, not audio: it goes from an antenna to a distribution unit or a receiver, and nowhere else.": "アンテナ用同軸ケーブルはRF信号を伝送します。アンテナから分配器または受信機へ接続してください。",
  "Patching the mixer into itself makes a feedback loop.": "ミキサーの出力を同じミキサーの入力へ戻すと、フィードバックが発生します。",
  "A network port only talks to another network port.": "ネットワーク端子は、対応するネットワーク端子に接続してください。",
  "That snake channel runs back to the console. Send to the stage on a RETURN (A–D).": "その回線はステージからミキサーへ送る入力です。ステージへ送るにはRETURN（A〜D）を使います。",
  "The returns carry signal from FOH to the stage. Plug sources into the snake's inputs on stage.": "RETURNはFOHからステージに信号を送ります。音源はステージ側のスネーク入力につなぎます。",
  "Speaker level never goes down a snake or into a stage box. Keep the amp near its speakers.": "スピーカーレベルの信号はスネークやステージボックスに通せません。アンプはスピーカーの近くに置いてください。",
  "The stage box's inputs come back into the console: a feedback loop.": "ステージボックスの入力がミキサーに戻るため、この接続ではフィードバックが発生します。",
  "In this lab, sources plug into the mixer (or a recorder, or a stage box) first.": "このラボでは、音源はまずミキサー、レコーダー、またはステージボックスにつなぎます。",
  "Only sources (or a wireless receiver's outputs) go into the mixer's channel inputs here (straight, or through a snake).": "このミキサーのチャンネル入力には、音源またはワイヤレス受信機の出力を直接、またはスネーク経由でつなぎます。",
  "The aux returns take an effects unit's outputs.": "AUX RETURNにはエフェクターの出力をつなぎます。",
  "Feed the effects unit from a mixer output (usually an aux send).": "エフェクターにはミキサーの出力（通常はAUX SEND）から信号を送ります。",
  "Never feed a power amp's speaker output into an input.": "パワーアンプのスピーカー出力を入力端子につながないでください。"
};
