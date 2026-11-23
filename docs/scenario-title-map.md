# シナリオID・画面表示タイトル対照表

## 1. 全体概要

本表の大問順・シナリオ順は `js/themes.js` の `THEMES` と各 `ids` 配列を基準にします。タイトル取得は `js/ui/mission-view.js` の `scenarioText()`、`titleOf()`、`displayShortTitle()` に基づく静的判定です。ブラウザ実画面は未確認です。

BY TOPICは16大問、重複を含む246掲載です。日本語表示タイトルは `LANGUAGES.ja.scenarios`、`canvas-ja.js`、`scenario-titles-ja.js` の合成結果を参照します。

## 2. 大問1〜16

以下は大問ごとの表示順と掲載数です。各シナリオのID・英語タイトル・日本語タイトルは、定義ファイルと合成後の辞書を照合した静的集計です。

| 大問番号 | 大問名（日本語） | 掲載シナリオ数 | シナリオID・タイトル対照 |
|---:|---|---:|---|
| 1 | Speakers and amps | 5 | `find-amp` → Where is the amplifier? ／ パワーアンプはどこ？；`drummer-wedge` → Build the drummer's wedge ／ ドラマー用ウェッジを作る；`b207mp3-amp` → The speaker from the closet ／ シナリオ「b207mp3-amp」；`stagepas400bt-speakers` → The silent speakers ／ 無音のスピーカー；`stagepas400bt-sub` → Add the subwoofer ／ シナリオ「stagepas400bt-sub」 |
| 2 | Plugging in（接続する） | 24 | `preshow` → Preshow music ／ ノートPCの音楽を会場へ；`build-rig` → Get the band into the house ／ バンドを会場に出す；`missing-guitar` → “Where did the guitar go?” ／ 「ギターはどこへ？」；`vlz1202-pads` → The pads aren't in the house ／ パッドの音が会場に出ない；残り20件は未翻訳または仮表示 |
| 3 | Phantom power | 16 | `b207mp3-phantom`、`mix8-overhead`、`stagepas400bt-overhead`、`mg102-phantom`、`x1204usb-overhead`、`cr1604-phantom`、`ui16-48v`、`gdig-48v`、`x32c-48v`、`x32c-sections-48v`、`yam01v96-phantom`、`dm2000-48v`、`x32-room`、`cl3-48v`、`sd442-phantom`、`f8n-room` |
| 4 | Gain staging | 19 | `b207mp3-quiet-singer`、`mix8-ol`、`stagepas400bt-micline`、`mg102-peak`、`vlz1202-trim`、`vlz1202-pad`、`ui16-gain`、`gdig-gain`、`gdig-winds`、`l20-gain`、`l20-pad`、`x32c-gain`、`yam01v96-pad`、`dm2000-pad`、`cl3-gain`、`sd442-hot-vocal`、`sd442-master`、`sd442-line`、`f8n-trim` |
| 5 | Headphones and solo | 7 | `mix8-phones`、`mix8-speech`、`vlz1202-pfl`、`vlz1202-tape`、`x1204usb-pfl`、`cr1604-levelset`、`f8n-pfl` |
| 6 | The house mix | 14 | `foh-vocal`、`b207mp3-small-room`、`mix8-pan`、`cr1604-assign`、`gdig-lr`、`gdig-spread`、`yam01v96-on`、`yam01v96-to-st`、`x32c-lr`、`dm2000-on`、`dm2000-to-st`、`cl3-on`、`f8n-balance`、`f8n-link` |
| 7 | Monitor mixes | 43 | `more-vocal`、`more-piano`、`monitor-quiet`、`drummer-mix`、`b207mp3-wedge`、`b207mp3-wedge-quiet`、`mix8-keys-wedge`、`mix8-wedge-loud`、`mix8-ballad`、`stagepas400bt-monitor`、`stagepas400bt-feedback`、`mg102-less-drums`、`mg102-one-knob`、`vlz1202-wedge-quiet`、`gdig-harmony`、`vlz1202-prefader`、`x1204usb-wedge`、`x1204usb-pre`、`cr1604-mute-pre`、`cr1604-drummer-quiet`、`cr1604-shift`、`ui16-more-keys`、`ui16-out-of-house`、`gdig-out-of-house`、`gdig-drummer-quiet`、`gdig-bus-mute`、`gdig-new-mix`、`l20-keys-wedge`、`l20-less-guitar`、`l20-out-of-house`、`l20-wedge-quiet`、`l20-switch`、`ui16-post`、`ui16-guitar-mix`、`x32c-drummer-quiet`、`x32c-bus-mute`、`x32c-out-of-house`、`x32c-new-mix`、`yam01v96-master`、`yam01v96-pre-point`、`yam01v96-new-mix`、`dm2000-new-mix`、`x32-bus9` |
| 8 | Low cut and high-pass | 9 | `mg102-rumble`、`vlz1202-lowcut`、`cr1604-lowcut`、`ui16-hpf`、`gdig-lowcut`、`l20-lowcut`、`x32c-lowcut`、`sd442-hpf`、`f8n-hpf` |
| 9 | EQ | 24 | `b207mp3-speech`、`mix8-boomy`、`stagepas400bt-speech`、`mg102-thin-bass`、`vlz1202-nasal`、`cr1604-sweep`、`ui16-mud`、`gdig-mud`、`ui16-harsh`、`ui16-eq-on`、`gdig-eq-on`、`l20-mud`、`l20-eq-on`、`x32c-mud`、`x32c-eq-on`、`yam01v96-mud`、`yam01v96-eq`、`yam01v96-eq-on`、`dm2000-mud`、`dm2000-eq-on`、`x32-mud`、`x32-eq-on`、`cl3-mud`、`cl3-eq-on` |
| 10 | Compression | 10 | `x1204usb-comp`、`ui16-comp`、`ui16-comp-on`、`gdig-comp-on`、`x32c-comp-on`、`yam01v96-comp`、`yam01v96-comp-on`、`dm2000-comp-on`、`x32-comp-on`、`cl3-comp-on` |
| 11 | Effects | 20 | `stagepas400bt-reverb`、`stagepas400bt-hall`、`mg102-reverb-loud`、`vlz1202-reverb`、`vlz1202-efx`、`x1204usb-fx`、`x1204usb-slapback`、`x1204usb-ret-mon`、`cr1604-reverb`、`cr1604-efx-mon`、`ui16-trumpet-reverb`、`gdig-reverb`、`l20-reverb`、`l20-efx-mon`、`ui16-delay`、`x32c-reverb`、`yam01v96-reverb`、`dm2000-reverb`、`x32-fx`、`cl3-fx` |
| 12 | Groups | 13 | `vlz1202-alt`、`x1204usb-alt`、`cr1604-subgroup`、`x32c-dca`、`x32c-orchestra`、`x32c-mute-group`、`dm2000-subgroup`、`dm2000-bus-to-st`、`dm2000-fader-group`、`dm2000-mute-group`、`x32-subgroup`、`cl3-dca`、`cl3-mute-group` |
| 13 | Outputs and routing | 10 | `cr1604-mono`、`x32-routing-house`、`x32-routing-wedge`、`x32-mc`、`x32-matrix`、`dm2000-output-patch`、`dm2000-matrix`、`cl3-routing-house`、`cl3-routing-wedge`、`cl3-matrix` |
| 14 | Digital workflows | 11 | `yam01v96-fader-mode`、`x32c-sof`、`gdig-sof`、`dm2000-fader-mode`、`dm2000-encoder`、`dm2000-scene-recall`、`x32-scene-recall`、`x32-scene-store`、`cl3-sof`、`cl3-scene-recall`、`cl3-scene-store` |
| 15 | Snakes and stage boxes | 11 | `cr1604-snake`、`cr1604-snake-return`、`x32c-stagebox`、`x32-stagebox`、`x32-stagebox-link`、`x32-stagebox-out`、`cl3-dante`、`cl3-dante-dvs`、`cl3-dante-121`、`cl3-dante-back`、`cl3-dante-fix` |
| 16 | Recording and cameras | 10 | `cr1604-direct`、`cr1604-room`、`sd442-camera`、`sd442-tone`、`sd442-mono`、`sd442-iso`、`f8n-track`、`f8n-camera`、`f8n-dslr`、`f8n-iso-safety` |

## 3. 翻訳状態の集計

静的なタイトル辞書と表示処理を照合した分類です。大問2の先頭5件以外は、既存辞書に仮タイトルしかないものを含みます。

| 状態 | 判定 |
|---|---|
| 翻訳済み | 97件。日本語タイトルが登録され、`scenarioText()`／`displayShortTitle()` から取得される |
| 未翻訳 | 0件。日本語タイトル未登録で英語タイトルへフォールバックするもの |
| 仮表示 | 149件。`シナリオ「ID」` 形式の辞書値で、完成した翻訳とは扱わない |
| 要確認 | 0件。ただし本表全体が静的解析であり、ブラウザ実画面は未確認 |

## 4. BY TOPIC以外のシナリオ

`SCENARIO_BY_ID` の全342件とBY TOPIC掲載IDを静的比較すると、BY TOPIC外は96件です。これらはBY MIXER、Chapman gigs、その他のシナリオ集合にのみ登場します。

## 5. 表示タイトルに問題があるシナリオID

仮表示が確認される代表例：

- `b207mp3-amp`
- `stagepas400bt-sub`
- `stagepas400bt-mono`
- `mg102-2tr`
- `x1204usb-minus10`
- `x1204usb-cdtape`
- 大問3以降の多数の機種別シナリオ

同一IDが複数大問に所属する場合は、所属ごとに別行として扱います。判定は静的解析によるもので、ブラウザ表示確認済みとは扱っていません。
