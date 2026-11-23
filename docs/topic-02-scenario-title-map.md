# 大問2「Plugging in（接続する）」シナリオタイトル対照表

日本語モードのシナリオ一覧で表示されるタイトルを、画面が利用する `themeScenarios()` の順に記載します。タイトルは `scenarioText()`、`titleOf()`、`displayShortTitle()` と日本語辞書の静的な照合結果です。

| No. | 画面に表示されるタイトル | シナリオID |
| --- | ------------ | ---------------- |
| 1 | ノートPCの音楽を会場へ | `preshow` |
| 2 | バンドを会場に出す | `build-rig` |
| 3 | 「ギターはどこへ？」 | `missing-guitar` |
| 4 | 開場前の音楽 | `b207mp3-doors` |
| 5 | 開場前の音楽 | `mix8-doors` |
| 6 | ゲストギタリスト | `mix8-guest` |
| 7 | 開場前の音楽 | `stagepas400bt-doors` |
| 8 | シナリオ「stagepas400bt-mono」 | `stagepas400bt-mono` |
| 9 | 開場前の音楽 | `mg102-doors` |
| 10 | シナリオ「mg102-2tr」 | `mg102-2tr` |
| 11 | パッドの音が会場に出ない | `vlz1202-pads` |
| 12 | 開場前の音楽 | `vlz1202-doors` |
| 13 | 開場前の音楽 | `x1204usb-doors` |
| 14 | シナリオ「x1204usb-minus10」 | `x1204usb-minus10` |
| 15 | シナリオ「x1204usb-cdtape」 | `x1204usb-cdtape` |
| 16 | 開場前の音楽 | `cr1604-doors` |
| 17 | 開場前の音楽 | `gdig-doors` |
| 18 | 開場前の音楽 | `ui16-doors` |
| 19 | 開場前の音楽 | `l20-doors` |
| 20 | 開場前の音楽 | `x32c-doors` |
| 21 | 開場前の音楽 | `yam01v96-doors` |
| 22 | 開場前の音楽 | `dm2000-doors` |
| 23 | 開場前の音楽 | `x32-doors` |
| 24 | 開場前の音楽 | `cl3-doors` |

注：`シナリオ「ID」` は現在の日本語辞書に登録されている仮表示であり、推測による補完はしていません。ブラウザ実画面での確認は未実施です。

## 表示順の根拠

`js/ui/mission-view.js` の選択画面は `themeScenarios(t).map((s, k) => row(s, k + 1))` で小問番号を付けます。`themeScenarios()` は `js/themes.js` の `THEMES_BY_ID` から `ids` を取得した後、`consoleRank(consoleOf(s))`、次に元の配列位置で安定ソートします。したがって、`THEMES.ids` の4番目だった `vlz1202-pads` は、コンソール順ソート後の11番目になります。

この順序は言語設定や進捗では変わりません。進捗は番号表示をチェックマークへ変えるだけで、`themeScenarios()` の並び替えには影響しません。
