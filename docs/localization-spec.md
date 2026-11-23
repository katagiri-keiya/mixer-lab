# Mixer Lab 日本語ローカライズ仕様

## 1. 翻訳アーキテクチャ

### 確認できた構成

翻訳の入口は `js/i18n/index.js` です。`LANGUAGES` に `ja` と `en` を組み立て、共通UI、Stage & patch、ケーブル、機材、コネクタ、信号フロー、シナリオ翻訳をまとめています。

主な取得関数は次のとおりです。

- `t(key, fallback, vars)`：ドット区切りのキーを現在言語から取得する。
- `scenarioText(def, field, fallback)`：`scenarios.{id}.{field}`を取得する。
- `conditionText(def, id, fallback)`：`scenarios.{id}.conditions.{conditionId}`を取得する。
- `onLanguageChange(listener)`：言語変更後に各UIを再描画するための通知登録。
- `setLanguage(value)`：`localStorage`の`mixer-lab-language`へ保存し、登録済みリスナーへ通知する。
- `localizeDom(root)`：`common`辞書、`data-i18n`、属性値を対象にする補助的なDOM翻訳。

初期言語は日本語です。指定キーが現在言語にない場合は英語辞書、さらに呼び出し側のfallbackへ戻ります。`t()`は`{name}`形式の変数置換にも対応します。

### 英語原文の保持

`localizeDom()`は`WeakMap`に元のテキストと属性値を保存してから置換します。そのため、日本語から英語へ戻すための原文を失わない設計です。ただし、動的HTMLを生成するUIでは、DOM置換に頼らず描画関数から` t()`等を呼ぶ必要があります。

## 2. 関連ファイル一覧

| ファイル | 役割 |
|---|---|
| `js/i18n/index.js` | 言語状態、辞書統合、`t`、シナリオ取得、DOM補助翻訳 |
| `js/i18n/en.js` | 共通英語辞書と英語側の基本構造 |
| `js/i18n/ja.js` | 共通日本語辞書と`preshow`の本文翻訳 |
| `js/i18n/canvas-ja.js` | Canvasシナリオの日本語翻訳 |
| `js/i18n/scenario-titles-ja.js` | シナリオタイトルの日本語データ |
| `js/i18n/scenario-templates.js` | 明示的に opt-in された共有テンプレート |
| `js/i18n/*-ui.js` | UI領域別辞書（patch、stage、flow、connection、gear、cable等） |
| `js/scenarios.js` | Canvas、機材共通定義、原文シナリオ、内部ID |
| `js/board-scenarios.js` | 機材別シナリオの定義と原文 |
| `js/ui/mission-view.js` | タイトル、本文、条件、ヒント、クイズ、進捗の描画 |
| `js/ui/patch-view.js` | Stage & patch、入出力、ケーブル選択、Connector guide |
| `js/ui/stage-view.js` | ステージ区画・機材表示 |
| `js/ui/flow.js` | 信号フロー図と補足説明 |
| `js/ui/listen-bar.js` | 試聴位置、再生状態、音声モニター表示 |
| `tools/check-scenario-translations.mjs` | シナリオ翻訳の構造・配列・placeholder検査 |
| `tests/i18n.test.mjs` | i18n取得、preshow、フォールバックの自動テスト |

## 3. シナリオ本文の対応表

原文は`js/scenarios.js`または`js/board-scenarios.js`の定義です。翻訳は`LANGUAGES.ja.scenarios[id]`に登録します。

| 項目 | 登録形式 | 表示処理 |
|---|---|---|
| `title` | `{id}.title` | `mission-view.js`の`scenarioText()`、タイトル一覧 |
| `shortTitle` | `{id}.shortTitle` | `displayShortTitle()`。明示訳がなければ日本語の`title`へ代替 |
| `prompt` / `goal` / `complete` | `{id}.prompt`等 | `mission-view.js`の本文描画 |
| `conditions` | `{id}.conditions.{conditionId}` | `conditionText()`。condition IDは原文定義のものを維持 |
| `hints` | `{id}.hints`配列 | `renderHints()`、`renderDock()`。順序を維持 |
| `quiz.q` | `{id}.quiz.q` | クイズ描画 |
| `quiz.options` | `{id}.quiz.options`配列 | 選択肢描画。順序を維持 |
| `quiz.why` | `{id}.quiz.why` | 回答後の解説 |

`scenarioText()`は、個別シナリオ辞書、明示された`translationTemplate`、英語fallbackの順で解決します。翻訳対象に存在しない任意フィールドを追加する必要はありません。

### シナリオ翻訳の必須範囲

シナリオは達成前の画面だけでなく、クリア後の画面までを一体として翻訳します。以下を必須翻訳項目とし、クリア後の成功解説と理解度チェックを任意扱いにしません。

- カテゴリタイトル・概要
- シナリオタイトル、シナリオ選択欄の短縮タイトル
- 状況説明、目標、達成条件、ヒント
- クリア後の成功解説
- 理解度チェックの問題文、全選択肢、正解・不正解のフィードバック
- 次のシナリオへの案内・ボタン表示
- その他の補足説明、維持条件、進捗表示

クリア後の表示も`scenarioText()`、`conditionText()`、`t()`など既存の取得経路を使い、日本語モードで英語断片を連結しないこと。英語モードでは原文へ戻せることを確認します。

## 4. 機材・ケーブル・Stage & patch

### 4.1 データと辞書

機材・端子・ケーブルの原文は主に`js/scenarios.js`の機材定義、`js/ui/icons.js`の`CONNECTOR_GUIDE`、UI描画側のデータから供給されます。表示用辞書は次のように分かれています。

| 表示 | 日本語辞書 | 主な利用箇所 |
|---|---|---|
| ケーブル名・用途 | `gear-ui.js`、`stage-cable-ui.js` | `patch-view.js`のケーブルカード・ポップアップ |
| 機材名・端子・状態 | `gear-ui.js`、`stage-gear-ui.js` | 機材詳細、入出力カード |
| 入力一覧・状態 | `input-ui.js` | 入力カード、未使用チャンネル説明 |
| 出力名・状態 | `output-ui.js`、`output-status-ui.js` | 出力カード、MAIN/AUX状態 |
| Connector guide | `connector-ui.js` | `CONNECTOR_GUIDE`を使う`patch-view.js` |
| 接続警告・通知 | `connection-ui.js` | 接続操作時のtoast・警告生成 |
| Stage見出し・説明 | `stage-ui.js`、`stage-text-ui.js` | `stage-view.js`、`patch-view.js` |
| 信号フロー | `flow-ui.js` | `flow.js` |

動的な機材名、チャンネル、接続先を含む文章は、完全一致のDOM置換ではなく、描画時に辞書関数と変数を組み合わせる方式が必要です。

### 4.2 未登録データの追加手順

1. 原文と内部IDを定義元で確認する。
2. 既存の安定したIDに対応する辞書へ英語・日本語を追加する。
3. 描画関数が辞書取得関数を経由しているか確認する。
4. 動的文章なら`{name}`等のplaceholderを使い、IDや値自体を翻訳しない。
5. 言語変更リスナーで該当パネルを再描画する。
6. 日本語→英語→日本語、接続前後、電源状態をブラウザで確認する。

## 5. 既存実装の問題点と制約

### 確認できた問題

- シナリオ本文を辞書に登録しても、直接`def.title`や`shortTitle()`を表示する経路では反映されないことがある。現在の`mission-view.js`には表示用`displayShortTitle()`があるが、他画面の直接参照は個別確認が必要。
- 動的なtoast、機材状態、ケーブルカードは`localizeDom()`の完全一致対象にならない。生成元で` t()`または領域専用辞書を呼ぶ必要がある。
- ミキサー画面の操作名称やARIA文言には、まだ直接英語で生成される箇所がある。技術用語として意図的な英語と、未翻訳UIを区別する必要がある。
- 辞書登録済みでも、描画処理が別キー・原文・動的連結を使うと英語表示になる。
- 同じ意味の文章を複数辞書へ登録すると訳語の不一致が起こり得る。既存キーの再利用を優先する。

### preshowの位置付け

`preshow`は本文、条件、ヒント、クイズ、主要なStage & patch辞書の実装例ですが、アプリ全体のすべての動的UIが完全翻訳済みであることを意味しません。未翻訳シナリオは英語fallbackです。

## 6. 新規翻訳の追加手順

### 新しいシナリオ

1. `js/scenarios.js`または`js/board-scenarios.js`からID、存在するフィールド、condition ID、hint数、quiz配列を抽出する。
2. `js/i18n/canvas-ja.js`等の既存構造に、ID固有の翻訳を追加する。
3. `title`、必要なら`shortTitle`、存在する本文フィールドだけを登録する。
4. `{level}`等のplaceholderを原文と一致させる。
5. `node tools/check-scenario-translations.mjs`で配列長、参照、placeholderを検査する。
6. `tests/i18n.test.mjs`またはシナリオ回帰テストを追加する。
7. ブラウザで開始画面、実行画面、左一覧、ヒント、完了表示を確認する。

### 新しい機材・ケーブル

原文の定義元を変更せず、該当する`*-ui.js`辞書へ表示用キーを追加します。新しい表示経路が辞書を参照していない場合のみ、描画関数を最小限修正します。接続判定、内部ID、信号処理、保存形式は変更しません。

## 7. 完了判定と検査範囲

以下は別々に扱います。

1. **辞書登録完了**：日本語キーと値が存在する。
2. **表示処理反映完了**：対象描画関数がキーを取得している。
3. **ブラウザ確認完了**：実際の状態・言語切替・レイアウトを確認した。

`tools/check-scenario-translations.mjs`で確認できるのは、シナリオID、本文フィールド、条件、ヒント、クイズ配列、placeholder、短縮タイトルの解決状況です。未翻訳シナリオの存在自体は正常扱いです。

自動検査だけでは、動的DOM、toast、画面状態ごとの再描画、レイアウト崩れ、音声再生継続までは保証できません。これらはブラウザ手動確認が必要です。

## 8. 現時点の制約と今後の改善提案

## 9. 汎用取得APIと抽出ツール（実装済み）

`js/i18n/index.js`に`localized(kind, id, field, fallback, vars)`を追加しました。`ui.cables`、`ui.gear`、`ui.connectors`のような安定IDベースの辞書を共通形式で取得し、既存の`t()`と英語fallbackを維持します。未登録の項目は日本語モードで`getMissingTranslations()`から重複なしで取得できます。診断をリセットする場合は`clearMissingTranslations()`を使います。

`js/ui/patch-view.js`のケーブル、機材、コネクタ取得処理はこのAPIを使用します。接続判定や内部データは変更していません。

接続モデルが生成する状態説明や警告は、接続判定関数が返す英文を直接DOMへ出さず、`connection-ui.js`の意味キーへ変換してから表示します。例として、パッシブスピーカーにラインレベルを接続した場合の`passiveNeedsAmp`があります。判定条件と英文原文は`js/connection-model.js`に残し、表示文だけを翻訳します。

`node tools/extract-localization-targets.mjs`で、シナリオ、テーマ、Connector guideに加えて、`CABLES`、`DEVICE_TYPES`、ポート、`JACKS`、`PLUGS`、`SIGNAL_LEVELS`をJSON形式で列挙できます。人間向けの要約は`node tools/extract-localization-targets.mjs --human`です。`topicScenarioIds`にはBY TOPICのシナリオIDも出力します。これは静的データを対象にするため、テンプレートリテラル、任意の動的UI、ミキサー画面内部の直接生成文は完全には抽出しません。

コンソールは`js/mixer-models.js`の`SKINS`からモデルID、名称、subtitle、blurbを抽出します。モデル固有の信号フローは`ui.flowModels.{modelId}.{field}`で取得します。現在はB207MP3とSTAGEPAS 400BTのパワーアンプ説明をこの形式で登録しています。B207MP3にSTAGEPAS固有の英文が表示される問題は、従来の`poweredAmp`共通分岐がモデル差を表現していなかったことが原因です。内部のミキサー定義・信号処理は変更せず、表示説明だけをモデルIDで分離しました。

INPUTSの音源は`audio/source-manifest.js`の`SOURCES_BY_ID`から供給されます。音源固有の表示は`ui.sources.{sourceId}.{field}`で取得し、`name`、`device`、`note`を共通描画処理から参照します。機材の共通説明は`gearById`または既存の`gear`辞書から取得し、音源固有の説明を共通機材説明で上書きしません。抽出ツールは現在の`SOURCES_BY_ID`についても翻訳状況を列挙します。

現在の既存機材辞書は一部が英語表示値をキーにした互換形式です。そのため抽出レポートでは、安定IDの候補と既存辞書の英語値照合を分けて報告します。新規機材を追加する際は、可能なら`ui.gear.{stableId}`形式へ移行し、描画側から`localized("gear", stableId, field, fallback)`を呼び出してください。既存の英語値キーは互換性のため当面維持します。

### 現時点の制約

- `localizeDom()`は補助機構であり、動的文章の完全な抽出・翻訳を保証しない。
- 342シナリオのタイトル辞書は存在するが、タイトル翻訳と本文完全翻訳は別の状態である。
- 機材別シナリオ本文は未翻訳のものが多く、英語fallbackが前提である。
- 自動検査はすべてのHTML生成経路やARIA文言を網羅していない。
- `npm test`などの実行可否は環境に依存するため、未実行を成功扱いにしない。

### 改善提案（未実装）

- 表示文言を抽出する静的検査と、辞書キーの未使用検査を追加する。
- 機材・ケーブル・コネクタの辞書キーを一覧化し、英語直接出力を検出する。
- 言語切替時の再描画対象を各UIクラス単位で登録する。
- 日本語・英語のブラウザ回帰テストで、タイトル、Stage & patch、警告、ヒントを状態別に確認する。
- 仮訳やIDベースのタイトルを品質検査で検出し、公開前に人手レビューする。

