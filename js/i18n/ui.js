export const uiEn = {
  startQuestion: "What do you want to work on?", startDescription: "Pick a question you want answered, or the mixer in front of you. Headphones recommended; on iPhone turn off Silent Mode.", continue: "Continue", freePlay: "Free play", freePlayDescription: "No goals: any console, the whole band, break things", progressSaveNotice: "Your progress is saved in this browser only.", switchingDevices: "Switching devices?", saveProgressFile: "Save a progress file", chapmanGigs: "Chapman gigs", chapmanGigsDescription: "a real MUS 248 gig: its room, its rig, its checklist", byTopic: "By topic", byTopicDescription: "one question, answered on mixer after mixer", byMixer: "By mixer", byMixerDescription: "standing at one of these? Start with it", audioLoadNotice: "Loads about 4 MB of audio.", musicCredits: "Music credits", scenarioCount: "{count} scenarios", progressSolved: "{done} of {total} solved", comingLater: "Coming later", hint: "Hint", signalFlowOn: "How the signal flows on {skin}", tapToPatch: "Tap a channel's name to patch its input.", source: "Source", meter: "Meter", houseSpeakers: "House speakers", wedge: "A wedge", engineerHeadphones: "Engineer's headphones", earsLabel: "Your ears", inAudience: "In the audience", recorderHeadphones: "Recorder headphones", inLobby: "In the lobby", atPlace: "At the {place}", nearPlace: "Near the {place}", noSpeaker: "{label}: no speaker", silent: "silent", listenTo: "Listen to {label}", loading: "Loading…", playbackStopped: "Playback stopped.", buffering: "Buffering the next part of the song…", pflHeadphones: "Engineer's headphones: PFL on {channels} (before the {level}).", pflQuiet: "Headphones are quiet: press PFL on a channel to hear it here.", hearing: "Hearing {bus} through the {speakers}.", silence: "Silence: {bus} doesn't reach a working speaker. Check Stage & patch.", noPfl: "no PFL pressed", noWorkingSpeaker: "no working speaker", ariaListenFrom: "Where are you listening from?", ariaStopBand: "Stop the band", ariaPlayBand: "Play the band", mapSilent: "SILENT", mapStage: "STAGE", mapAudience: "AUDIENCE", mapDesk: "DESK", startScreen: "Start screen", backToTop: "Back to the top ↑", next: "Next", keep: "Keep", undo: "Undo", noGoals: "No goals", earsNudgeNoSpeaker: "This one's about {target}. It doesn't reach a speaker yet: once it does, switch Your ears to {target} to hear it.", earsNudgeSwitch: "This one's about {about}. You're hearing {current}: switch Your ears to {target} to hear what's in it.",
};

export const uiJa = {
  startQuestion: "何に取り組みますか？", startDescription: "答えを知りたい質問、または目の前のミキサーを選んでください。ヘッドホン推奨。iPhoneでは消音モードを解除してください。", continue: "続きから", freePlay: "フリープレイ", freePlayDescription: "目標なし：どのコンソールでも、全バンドで自由に試せます。", progressSaveNotice: "進捗はこのブラウザにのみ保存されます。", switchingDevices: "別の端末に移りますか？", saveProgressFile: "進捗ファイルを保存", chapmanGigs: "Chapman gigs", chapmanGigsDescription: "実際のMUS 248公演：会場、機材、チェックリスト", byTopic: "テーマ別", byTopicDescription: "ミキサーを変えながら、一つの質問に答えます", byMixer: "ミキサー別", byMixerDescription: "この機種の前にいますか？ここから始めましょう", audioLoadNotice: "約4 MBの音源を読み込みます。", musicCredits: "音楽クレジット", scenarioCount: "シナリオ {count}件", progressSolved: "{done}/{total}件達成", comingLater: "準備中", hint: "ヒント", signalFlowOn: "{skin}での信号の流れ", tapToPatch: "チャンネル名をタップして入力をパッチします。", source: "Source", meter: "Meter", houseSpeakers: "会場スピーカー", wedge: "ウェッジ", engineerHeadphones: "エンジニア用ヘッドホン", earsLabel: "試聴位置", inAudience: "客席", recorderHeadphones: "レコーダー用ヘッドホン", inLobby: "ロビー", atPlace: "{place}", nearPlace: "{place}の近く", noSpeaker: "{label}：スピーカーなし", silent: "無音", listenTo: "{label}を聴く", loading: "読み込み中…", playbackStopped: "再生を停止しました。", buffering: "次の音源部分をバッファリング中…", pflHeadphones: "エンジニア用ヘッドホン：{channels}でPFL（{level}の前）を試聴中。", pflQuiet: "ヘッドホンは無音です。チャンネルのPFLを押すとここで聴けます。", hearing: "{bus}を{speakers}から聴いています。", silence: "無音：{bus}が動作中のスピーカーに届いていません。Stage & patchを確認してください。", noPfl: "PFL未選択", noWorkingSpeaker: "動作中のスピーカーなし", ariaListenFrom: "どこから試聴するか", ariaStopBand: "バンドを停止", ariaPlayBand: "バンドを再生", mapSilent: "無音", mapStage: "ステージ", mapAudience: "客席", mapDesk: "卓", startScreen: "開始画面", backToTop: "上部へ戻る ↑", next: "次へ", keep: "維持", undo: "元に戻す", noGoals: "目標なし", earsNudgeNoSpeaker: "これは{target}についてのミッションです。まだスピーカーに届いていません。届いたら、試聴位置を{target}に切り替えて聴いてください。", earsNudgeSwitch: "これは{about}についてのミッションです。現在は{current}を聴いています。中身を聴くには、試聴位置を{target}に切り替えてください。",
};
Object.assign(uiEn, { topicPatchTitle: "Plugging in", topicPatchQuestion: "Which jack, which cable?", topicPatchConcept: "Mics, instruments, laptops and players each have their own level and connector. Get each one into an input that suits it, and into the house." });
Object.assign(uiJa, { topicPatchTitle: "接続する", topicPatchQuestion: "どの端子に、どのケーブル？", topicPatchConcept: "マイク、楽器、ノートPC、再生機器には、それぞれ適したレベルと端子があります。各音源を合った入力へ接続し、会場へ送りましょう。" });
Object.assign(uiJa, {
  topicPhantomTitle: "ファンタム電源",
  topicPhantomQuestion: "コンデンサーマイクから音が出ないのはなぜ？",
  topicPhantomConcept: "コンデンサーマイクには+48 Vのファンタム電源が必要です。ミキサーのマイク入力からXLRケーブルを通じて供給します。スピーカーには不要で、電源は壁のコンセントかパワーアンプから取ります。スイッチの場所はミキサーによって異なります。",
});
Object.assign(uiJa, {
  topicGainTitle: "ゲイン調整",
  topicGainQuestion: "入力が強すぎる？ 弱すぎる？ それともちょうどいい？",
  topicGainConcept: "まず各入力のGAIN（またはTRIM）で信号レベルを整え、メーターが適正な範囲を示すようにします。その後でフェーダーを調整します。入力が強すぎるとクリッピングが起き、弱すぎるとノイズが目立ちます。",
  goal: "目標：",
  scenarioStep: "{current}/{total}問",
  scenarioProgress: "進捗",
  goalProgress: "目標 {total}件中{done}件達成",
  conditionMet: "— 達成",
  conditionUnmet: "— 未達成",
  dockAnotherHint: "次のヒント",
  dockNext: "次へ",
  storyAndGoals: "説明と目標",
  backToFullScenario: "シナリオの詳しい説明へ戻る ↑",
  cameraLevelHeading: "カメラの入力レベルは合っていますか？",
  recorderHeading: "レコーダー",
  openRecorder: "レコーダーを開く",
  recorderRecording: "● 録音中",
  recorderPlaying: "▶ 再生中",
  recorderStopped: "停止中",
  recorderCardStatus: "{state} · 録音待機トラック：{armed} · {size} GBカード",
  recorderNoArmedTracks: "なし",
  recorderCardTimeLeft: "、残り{time}",
  recorderStartAudio: "レコーダーを使うには Start Audio を押してください。",
  recorderStartBeforeRecording: "録音するには、先に Start Audio を押して音声処理を開始してください。",
  recorderNoTakes: "テイクはまだありません。録音するトラックを待機状態にしてからRECを押します。",
  cameraSpeakerLevel: "スピーカーレベルの信号をカメラ入力に入れると故障のおそれがあります。カメラが受けられるのはマイクレベルまたはラインレベルです。",
  cameraNoMixerFeed: "このカメラ入力にはミキサー出力から信号が送られていません。",
  cameraHotMicInput: "{level}の信号をカメラのMIC入力に入れると、約{db} dB過大になり歪みます。カメラをLINEにするか、ミキサーのOUTPUT LEVELをMICにします。",
  cameraHotMiniInput: "{level}の信号をカメラの3.5 mm MIC入力に入れると、約{db} dB過大になり歪みます。カメラにLINE設定はないため、カメラへ送る出力をMICレベルにします。",
  cameraWeakLineInput: "マイクレベルの信号をカメラのLINE入力に入れると、約40 dB小さくなり、録音ではノイズが目立ちます。カメラをMICにするか、ミキサーのOUTPUT LEVELをLINEにします。",
  cameraLineLevel: "ラインレベル",
  cameraTapeLevel: "−10（テープ）レベル",
  cameraMinus10Level: "−10レベル",
});
