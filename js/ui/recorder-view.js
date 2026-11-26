// The Zoom F8 panel: eight tracks (meter, TRIM, 48V, arm), LINK for each pair,
// DUAL CHANNEL REC for inputs 1–4, the card, transport and takes. Settings go
// through MixerStore.setDevice; recording and playback through the engine's
// recorder runtime (js/outboard-audio.js).

import { RangeControl, LitButton } from "./controls.js";
import { MeterView } from "../meters.js";
import { F8, cardStats, trackInputs } from "../devices.js";
import { encodeWav } from "../wav.js";
import { formatDb } from "../levels.js";
import { LANGUAGES, language, setLanguage, t as translate } from "../i18n/index.js";
import { connectionMessage } from "./patch-view.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const MARKS = [
  { db: -40, label: "−40" },
  { db: -20, label: "−20" },
  { db: -12, label: "−12" },
  { db: -6, label: "−6" },
  { db: 0, label: "0" },
];
const clock = (sec) => `${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
const hours = (sec) => {
  if (!Number.isFinite(sec)) return "—";
  const hours = Math.floor(sec / 3600);
  const minutes = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
  return translate("ui.recorderHours", `${hours} h ${minutes} min`, { hours, minutes });
};
const recorderMessage = (message) => LANGUAGES[language()].ui.recorderErrors?.[message] ?? connectionMessage(message);
const trackText = (key, fallback, n, extra = {}) => translate(`ui.recorder${key}`, fallback, { n, ...extra });

export class RecorderView {
  constructor({ store, getRuntime, getMix, toast }) {
    this.store = store;
    this.getRuntime = getRuntime;
    this.getMix = getMix;
    this.toast = toast;
    this.id = null;
    this.el = document.createElement("dialog");
    this.el.className = "patch-dialog rec-dialog";
    this.el.setAttribute("aria-labelledby", "rec-title");
    document.body.appendChild(this.el);
    this.el.addEventListener("click", (e) => {
      if (e.target === this.el) return this.el.close();
      const b = e.target.closest("[data-rec]");
      if (!b) return;
      const act = b.dataset.rec;
      if (act === "close") this.el.close();
      else if (act === "language") setLanguage(language() === "ja" ? "en" : "ja");
      else if (act === "rec") this.record();
      else if (act === "stop") this.rt()?.stop();
      else if (act === "play") this.rt()?.play(b.dataset.take);
      else if (act === "download") this.download(b.dataset.take);
    });
  }

  get dev() {
    return this.store.state.rig.devices.find((d) => d.id === this.id) || null;
  }

  rt() {
    return this.id ? this.getRuntime(this.id) : null;
  }

  get isOpen() {
    return this.el.open;
  }

  open(id) {
    this.id = id;
    this.render();
    if (!this.el.open) this.el.showModal();
  }

  async record() {
    const rt = this.rt();
    if (!rt) return this.toast(translate("ui.recorderStartBeforeRecording", "Press Start Audio first: the recorder needs the audio engine."), "bad");
    const r = await rt.record();
    if (!r.ok) this.toast(recorderMessage(r.reason), "bad");
    else this.recStart = performance.now();
  }

  download(takeId) {
    const take = this.rt()?.takes.find((t) => t.id === takeId);
    if (!take || !take.data) return;
    const blob = new Blob([encodeWav(take.data, take.rate)], { type: "audio/wav" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${take.name}.WAV`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  render() {
    const dev = this.dev;
    if (!dev) return;
    const store = this.store;
    this.bindings = [];
    this.meters = [];
    this.el.innerHTML = `<div class="patch-inner rec-inner">
      <header class="patch-head">
        <p class="patch-kicker"></p>
        <h2 id="rec-title">${esc(dev.label)}</h2>
        <p class="patch-sub rec-status" aria-live="polite"></p>
        <button type="button" class="chip" data-rec="language"></button>
        <button type="button" class="patch-x" data-rec="close">✕</button>
      </header>
      <p class="rec-card"></p>
      <div class="rec-links"></div>
      <div class="rec-tracks" role="group"></div>
      <div class="rec-transport">
        <button type="button" class="btn rec-btn" data-rec="rec">● REC</button>
        <button type="button" class="btn" data-rec="stop">■ STOP</button>
        <span class="rec-hp"></span>
      </div>
      <h3 class="group-title"></h3>
      <ol class="rec-takes"></ol>
      <p class="rec-note"></p>
    </div>`;

    // LINK: one switch per pair.
    const links = this.el.querySelector(".rec-links");
    for (let p = 0; p < 4; p++) {
      const b = new LitButton({ label: `LINK ${p * 2 + 1}/${p * 2 + 2}`, tone: "assign", small: true, onPress: () => store.setDevice(this.id, `link.${p}`, !this.dev.link[p]) });
      this.bindings.push(() => {
        const a = p * 2 + 1, bTrack = a + 1, lit = this.dev.link[p], state = lit ? "on" : "off";
        b.setLit(lit, translate("ui.recorderPairLink", `Link tracks ${a} and ${bTrack} as a stereo pair: ${state}`, { a, b: bTrack, state }));
      });
      links.appendChild(b.el);
    }

    const grid = this.el.querySelector(".rec-tracks");
    for (let t = 0; t < F8.tracks; t++) {
      const col = document.createElement("section");
      col.className = "rec-track";
      const n = t + 1;
      col.innerHTML = `<p class="rec-num">${t + 1}</p><p class="rec-src"></p>`;
      const meter = new MeterView({ marks: MARKS, orientation: "vertical", label: `Track ${t + 1}`, showText: false });
      meter.el.classList.add("rec-meter");
      this.meters[t] = meter;
      const trim = new RangeControl({
        kind: "knob",
        label: "TRIM",
        sheetLabel: () => trackText("TrackTrim", `Track ${n} TRIM`, n),
        min: F8.gainMin,
        max: F8.gainMax,
        step: 0.5,
        keyStepMul: 2,
        defaultValue: 30,
        size: "xs",
        tone: "gain",
        format: (v) => (this.paths?.[trackInputs(this.dev)[t]] === "line" ? `${formatDb(v - 20)} line` : `+${Math.round(v)} dB`),
        onInput: (v) => store.setDevice(this.id, `tracks.${t}.trimDb`, v),
      });
      this.bindings.push(() => trim.setValue(this.dev.tracks[t].trimDb, true));
      this.trims = this.trims || [];
      this.trims[t] = trim;
      const p48 = new LitButton({ label: "48V", tone: "phantom", small: true, onPress: () => store.setDevice(this.id, `tracks.${t}.phantom`, !this.dev.tracks[t].phantom) });
      this.bindings.push(() => {
        const lit = this.dev.tracks[t].phantom, state = lit ? "on" : "off";
        p48.setLit(lit, trackText("Phantom", `Track ${n} phantom power: ${state}`, n, { state }));
      });
      const arm = new LitButton({ label: "REC", tone: "mute", small: true, onPress: () => store.setDevice(this.id, `tracks.${t}.arm`, !this.dev.tracks[t].arm) });
      this.bindings.push(() => {
        const lit = this.dev.tracks[t].arm;
        arm.setLit(lit, trackText("Arm", `Track ${n} armed: ${lit ? "yes" : "no"}`, n, { state: lit ? "on" : "off" }));
      });
      col.append(meter.el, trim.el, p48.el, arm.el);
      if (t < 4) {
        const dual = new LitButton({ label: `DUAL→${t + 5}`, tone: "assign", small: true, onPress: () => store.setDevice(this.id, `dual.${t}`, !this.dev.dual[t]) });
        this.bindings.push(() => {
          const track = t + 5, lit = this.dev.dual[t], state = lit ? "on" : "off";
          dual.setLit(lit, translate("ui.recorderDual", `Dual channel recording: input ${n} also on track ${track}: ${state}`, { input: n, track, state }));
        });
        col.appendChild(dual.el);
      }
      grid.appendChild(col);
    }

    const hp = new RangeControl({
      kind: "knob",
      label: "HP VOL",
      sheetLabel: () => translate("ui.recorderHpVolume", "Recorder headphone volume"),
      min: 0,
      max: 1,
      step: 0.01,
      defaultValue: 0.6,
      size: "xs",
      tone: "phones",
      format: (v) => `${Math.round(v * 10)}`,
      onInput: (v) => store.setDevice(this.id, "hpLevel", v),
    });
    this.bindings.push(() => hp.setValue(this.dev.hpLevel, true));
    this.el.querySelector(".rec-hp").appendChild(hp.el);
    this.takesKey = null;
    this.syncLanguage();
  }

  syncLanguage() {
    if (!this.bindings) return;
    const find = (selector) => this.el.querySelector(selector);
    find(".patch-kicker").textContent = translate("ui.recorderField", "Field recorder");
    find('[data-rec="close"]').setAttribute("aria-label", translate("ui.recorderClose", "Close"));
    const languageButton = find('[data-rec="language"]');
    languageButton.textContent = language() === "ja" ? "English" : "日本語";
    languageButton.setAttribute("aria-label", language() === "ja" ? "Switch to English" : "日本語に切り替え");
    find(".rec-tracks").setAttribute("aria-label", translate("ui.recorderTracks", "Tracks"));
    find(".group-title").textContent = translate("ui.recorderTakes", "Takes on the card");
    find(".rec-note").textContent = translate("ui.recorderWavHelp", "Listen with RECORDER on the Listen bar. Downloads are 16-bit poly WAVs (one file, one channel per armed track); the real F8 writes {bits}-bit / {rate} kHz.", { bits: F8.bitDepth, rate: F8.sampleRate / 1000 });
    find('[data-rec="rec"]').setAttribute("aria-label", translate("ui.recorderRecAction", "● REC"));
    find('[data-rec="stop"]').setAttribute("aria-label", translate("ui.recorderStopAction", "■ STOP"));
    this.sync();
    this.syncTakeLabels(this.rt()?.takes ?? [], this.rt()?.playing?.takeId);
  }

  // After any state change, and on recorder events.
  sync() {
    if (!this.el.open && !this.bindings) return;
    const dev = this.dev;
    if (!dev || !this.bindings) return;
    for (const b of this.bindings) b();
    const mix = this.getMix();
    const inputs = mix?.rig.recorders?.[this.id] || [];
    const paths = inputs.map((i) => i && i.path);
    if (paths.join() !== (this.paths || []).join()) {
      this.paths = paths;
      for (const tr of this.trims || []) tr.render();
    }
    const map = trackInputs(dev);
    const rig = this.store.state.rig;
    this.el.querySelectorAll(".rec-track").forEach((col, t) => {
      const src = map[t];
      const inp = inputs[src];
      let text;
      if (src !== t) text = trackText("DualInput", `← input ${src + 1} (dual)`, src + 1);
      else if (!inp || !inp.connected) text = "—";
      else {
        const cable = rig.cables.find((c) => c.to === `${this.id}/in${t + 1}`);
        const from = cable ? cable.from.split("/") : [];
        const fromDev = rig.devices.find((d) => d.id === from[0]);
        const room = inp.sourceId === "room-l" ? translate("ui.recorderRoomLeft", "room l")
          : inp.sourceId === "room-r" ? translate("ui.recorderRoomRight", "room r") : inp.sourceId;
        const source = !fromDev ? "?" : fromDev.type === "cr1604" ? from[1].toUpperCase() : room || fromDev.label;
        text = `${inp.path === "mic" ? "XLR" : "TRS"} · ${source}`;
      }
      const warn = inp && inp.connected && inp.status !== "ok" && src === t ? recorderMessage(inp.messages[0]) : "";
      const el = col.querySelector(".rec-src");
      col.setAttribute("aria-label", trackText("Track", `Track ${t + 1}`, t + 1));
      this.meters[t].el.setAttribute("aria-label", trackText("TrackMeter", `Track ${t + 1} meter`, t + 1));
      el.textContent = text;
      el.title = warn || text;
      col.classList.toggle("warn", !!warn);
      col.classList.toggle("is-dual", src !== t);
      col.classList.toggle("is-linked", dev.link[Math.floor(t / 2)]);
    });
    this.syncTransport();
  }

  syncTransport() {
    const dev = this.dev;
    const rt = this.rt();
    if (!dev) return;
    const card = cardStats(dev, rt ? rt.usedBytes : 0);
    const rate = F8.sampleRate / 1000, bits = F8.bitDepth, free = (card.free / 1e9).toFixed(1);
    const time = hours(card.secondsLeft);
    const detail = card.armed ? translate("ui.recorderCardDuration", `${time} left for ${card.armed} track${card.armed > 1 ? "s" : ""} at ${rate} kHz / ${bits}-bit`, { time, tracks: card.armed, rate, bits })
      : translate("ui.recorderCardArm", "arm a track to see the time left");
    this.el.querySelector(".rec-card").textContent = translate("ui.recorderCardSpace", `SD card ${F8.cardGB} GB · ${free} GB free · ${detail}`, { size: F8.cardGB, free, detail });
    const status = this.el.querySelector(".rec-status");
    const recording = rt && rt.recording;
    status.textContent = !rt ? translate("ui.recorderStartAudio", "Press Start Audio to use the recorder.") : recording ? `● REC ${clock((performance.now() - (this.recStart || performance.now())) / 1000)}` : rt.playing ? "▶ PLAY" : rt.error ? recorderMessage(rt.error) : "■ STOP";
    status.classList.toggle("is-rec", !!recording);
    this.el.querySelector('[data-rec="rec"]').classList.toggle("lit", !!recording);
    const takes = rt ? rt.takes : [];
    const key = takes.map((t) => `${t.id}:${!!t.data}`).join() + (rt?.playing?.takeId || "");
    if (key === this.takesKey) return;
    this.takesKey = key;
    this.el.querySelector(".rec-takes").innerHTML = takes.length
      ? takes
          .map(
            (t) => `<li><strong>${esc(t.name)}</strong> <span></span>
              ${t.data ? `<button type="button" class="chip" data-rec="play" data-take="${esc(t.id)}"></button><button type="button" class="chip" data-rec="download" data-take="${esc(t.id)}"></button>` : "<small></small>"}</li>`,
          )
          .join("")
      : '<li class="rec-empty"></li>';
    this.syncTakeLabels(takes, rt?.playing?.takeId);
  }

  syncTakeLabels(takes, playingId) {
    const rows = this.el.querySelector(".rec-takes").children;
    if (!takes.length) {
      rows[0].textContent = translate("ui.recorderNoTakes", "No takes yet. Arm tracks, then press REC.");
      return;
    }
    takes.forEach((take, i) => {
      const row = rows[i], time = clock(take.seconds), tracks = take.tracks.map((x) => x + 1).join(", ");
      row.querySelector("span").textContent = translate("ui.recorderTakeTracks", `${time} · tracks ${tracks}`, { time, tracks });
      if (take.data) {
        row.querySelector('[data-rec="play"]').textContent = take.id === playingId ? translate("ui.recorderTakePlaying", "▶ playing") : translate("ui.recorderTakePlay", "▶ Play");
        row.querySelector('[data-rec="download"]').textContent = translate("ui.recorderTakeDownload", "Download WAV");
      } else {
        row.querySelector("small").textContent = translate("ui.recorderTakeExpired", "(audio not kept: only the three newest takes stay in the lab's memory)");
      }
    });
  }

  updateMeters(readings, now) {
    if (!this.el.open || !this.meters) return;
    const r = readings?.recorders?.[this.id];
    if (!r) return;
    this.meters.forEach((m, t) => m.update(r[t], now));
    if (this.rt()?.recording) this.syncTransport();
  }
}
