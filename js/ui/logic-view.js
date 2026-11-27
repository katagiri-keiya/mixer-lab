// The FOH Mac mini's windows for a recording over Dante (Vocal Jazz v2, js/recording.js):
//   LOGIC             one row per track: its input (In 1–32) and R (record-enable), and what
//                     it hears. Select tracks, then hold Option (or tick ⌥ Ascending, on a
//                     phone) while picking an input: the selected tracks get ascending inputs,
//                     as in Logic.
//   AUDIO DEVICES     Logic → Settings → Audio → Devices: the Input Device (Dante Virtual
//                     Soundcard or the SSL 2+). The Output Device is the SSL 2+, for headphones.
//   DVS               Dante Virtual Soundcard: running or stopped
//   DANTE CONTROLLER  the X32 (transmitter) across, the Mac mini (receiver) down; a tick
//                     subscribes a receive channel. Ctrl-click (or Cmd) where the two devices
//                     meet routes one to one, as in the real Dante Controller.
// Settings go through MixerStore.setDevice / setDeviceMany, so Undo and the scenarios see them.

import { LOGIC, cardSource, logicTracks, macOnCard, recordingMac } from "../recording.js";
import { sourceShort } from "../names.js";
import { language, t as translate } from "../i18n/index.js";
import { danteOneToOneHtml, danteSubscriptionLabel, syncDanteDialog } from "./dante-view.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const RX_PAGE = 16;
const TABS = [
  ["logic", "Logic (tracks)"],
  ["audio", "Logic › Audio devices"],
  ["dvs", "Dante Virtual Soundcard"],
  ["controller", "Dante Controller"],
];

export class LogicView {
  constructor({ store, manifest }) {
    this.store = store;
    this.manifest = manifest;
    this.tab = "logic";
    this.rxPage = 0;
    this.picking = null; // the track whose input menu is open
    this.selected = new Set();
    this.ascending = false;
    this.tip = false;
    this.el = document.createElement("dialog");
    this.el.className = "patch-dialog dante-dialog logic-dialog";
    this.el.setAttribute("aria-labelledby", "logic-title");
    document.body.appendChild(this.el);
    this.el.addEventListener("click", (e) => this.onClick(e));
    this.el.addEventListener("change", (e) => {
      const sel = e.target.closest("[data-logic-select]");
      if (sel) {
        const t = Number(sel.dataset.logicSelect);
        if (sel.checked) this.selected.add(t);
        else this.selected.delete(t);
        return;
      }
      if (e.target.matches("[data-logic-ascending]")) this.ascending = e.target.checked;
      if (e.target.matches("[data-logic-device]")) this.store.setDevice(this.mac.id, "logicIn", Number(e.target.value));
    });
  }

  get mac() {
    return recordingMac(this.store.state.rig);
  }

  get isOpen() {
    return this.el.open;
  }

  open(tab = "logic") {
    this.tab = TABS.some(([id]) => id === tab) ? tab : "logic";
    this.tip = false;
    this.picking = null;
    this.render();
    if (!this.el.open) this.el.showModal();
  }

  sync() {
    syncDanteDialog(this.el, () => this.render());
  }

  onClick(e) {
    if (e.target === this.el) return this.el.close();
    const b = e.target.closest("[data-logic]");
    if (!b) return;
    const mac = this.mac;
    const act = b.dataset.logic;
    if (act === "close") return this.el.close();
    if (act === "tab") {
      this.tab = b.dataset.tab;
      this.tip = false;
      this.picking = null;
      return this.render();
    }
    if (!mac) return;
    if (act === "pick") {
      const t = Number(b.dataset.track);
      this.picking = this.picking === t ? null : t;
      return this.render();
    }
    if (act === "input") {
      // Option-click (or ⌥ Ascending): every selected track, in order, gets the next input up.
      const t = this.picking;
      const n = Number(b.dataset.in);
      const asc = (e.altKey || this.ascending) && this.selected.has(t) && this.selected.size > 1;
      const targets = asc ? [...this.selected].sort((x, y) => x - y) : [t];
      this.picking = null;
      this.store.setDeviceMany(
        mac.id,
        targets.map((k, i) => [`tracks.${k}.in`, n === 0 ? 0 : Math.min(LOGIC.inputs, n + i)]),
      );
      return this.render();
    }
    if (act === "arm") {
      const t = Number(b.dataset.track);
      return this.store.setDevice(mac.id, `tracks.${t}.arm`, mac.tracks[t].arm ? 0 : 1);
    }
    if (act === "dvs") return this.store.setDevice(mac.id, "dvs", mac.dvs === 0 ? 1 : 0);
    if (act === "page") {
      this.rxPage = Number(b.dataset.page);
      return this.render();
    }
    if (act === "one-to-one") {
      // The real thing wants Ctrl-click; a plain click (or a tap) explains that and offers a button.
      if (e.ctrlKey || e.metaKey || b.dataset.direct) {
        this.tip = false;
        return this.store.setDeviceMany(mac.id, Array.from({ length: LOGIC.inputs }, (_, m) => [`macRx.${m}`, m + 1]));
      }
      this.tip = true;
      return this.render();
    }
    if (act === "sub") {
      const m = Number(b.dataset.rx);
      const k = Number(b.dataset.tx);
      // A receive channel takes one transmit channel: clicking its tick again clears it.
      return this.store.setDevice(mac.id, `macRx.${m}`, mac.macRx[m] === k ? 0 : k);
    }
  }

  render() {
    const mac = this.mac;
    if (!mac) {
      this.el.innerHTML = `<div class="dialog-body"><p>${esc(translate("ui.danteNoRecordingComputer", "No recording computer in this rig."))}</p><button type="button" class="btn" data-logic="close">${esc(translate("ui.danteClose", "Close"))}</button></div>`;
      return;
    }
    const title = Object.fromEntries(TABS)[this.tab];
    const tab = (id, label) => `<button type="button" role="tab" class="chip ${this.tab === id ? "active" : ""}" aria-selected="${this.tab === id}" data-logic="tab" data-tab="${id}">${label}</button>`;
    const body = { logic: () => this.logicHtml(mac), audio: () => this.audioHtml(mac), dvs: () => this.dvsHtml(mac), controller: () => this.controllerHtml(mac) }[this.tab]();
    const languageAction = language() === "ja" ? "Switch to English" : "日本語に切り替え";
    const close = esc(translate("ui.danteClose", "Close"));
    this.el.innerHTML = `
      <div class="dialog-body dante-body">
        <div class="dante-head">
          <h2 id="logic-title">FOH Mac mini · ${esc(title)}</h2>
          <button type="button" class="chip" data-language-toggle aria-label="${languageAction}" title="${languageAction}">${language() === "ja" ? "日本語" : "English"}</button>
          <button type="button" class="btn" data-logic="close" aria-label="${close}">${close}</button>
        </div>
        <div class="dante-tabs" role="tablist">${TABS.map(([id, label]) => tab(id, label)).join("")}</div>
        ${body}
      </div>`;
  }

  logicHtml(mac) {
    const { SOURCES_BY_ID, STEMS } = this.manifest;
    const tracks = logicTracks(this.store.state, SOURCES_BY_ID, STEMS);
    const warn = !macOnCard(this.store.state.rig, mac)
      ? translate("ui.danteLogicNoCard", "The Mac mini isn't cabled to the X32's X-DANTE card.")
      : mac.dvs === 0 ? danteTrackMessage("Dante Virtual Soundcard is stopped.")
        : mac.logicIn === 1 ? translate("ui.danteLogicWrongInput", "Logic's input device is the SSL 2+, not Dante Virtual Soundcard.") : "";
    const rows = tracks
      .map((t) => {
        const meter = t.ok && t.arm ? Math.max(0, Math.min(100, ((t.peakDb + 60) / 60) * 100)) : 0;
        const hears = t.ok ? `${esc(sourceShort(SOURCES_BY_ID[t.sourceId]) || t.sourceId)} · ${esc(t.jack)}` : esc(danteTrackMessage(t.why));
        const picker =
          this.picking === t.track
            ? `<tr class="logic-picker"><td colspan="6"><div class="logic-ins" role="group" aria-label="Audio ${t.track + 1} input">
              <button type="button" class="chip" data-logic="input" data-in="0">No input</button>
              ${Array.from({ length: LOGIC.inputs }, (_, i) => `<button type="button" class="chip ${t.in === i + 1 ? "active" : ""}" data-logic="input" data-in="${i + 1}">Input ${i + 1}</button>`).join("")}
            </div></td></tr>`
            : "";
        return `<tr class="${t.ok ? "logic-ok" : "logic-flat"}">
          <td><input type="checkbox" data-logic-select="${t.track}" ${this.selected.has(t.track) ? "checked" : ""} aria-label="Select Audio ${t.track + 1}" /></td>
          <td class="daw-name">Audio ${t.track + 1}</td>
          <td><button type="button" class="btn logic-in" data-logic="pick" data-track="${t.track}" aria-expanded="${this.picking === t.track}">${t.in ? `In ${t.in}` : "No input"}</button></td>
          <td><button type="button" class="btn logic-arm ${t.arm ? "on" : ""}" data-logic="arm" data-track="${t.track}" aria-pressed="${t.arm}" aria-label="Record-enable Audio ${t.track + 1}">R</button></td>
          <td class="logic-meter"><span class="logic-bar" style="width:${meter.toFixed(0)}%"></span><b>${t.ok && t.arm ? t.peakDb.toFixed(1) : "—"}</b></td>
          <td class="logic-hears">${hears}</td>
        </tr>${picker}`;
      })
      .join("");
    return `
      <p class="dante-note">Each track records one input. In 1–32 are the Dante channels from the X32's card, as Dante Controller routes them. A meter moves only on a record-enabled track (R).</p>
      ${warn ? `<p class="dante-note"><b>${esc(warn)}</b></p>` : ""}
      <p class="dante-note"><label><input type="checkbox" data-logic-ascending ${this.ascending ? "checked" : ""} /> ⌥ Ascending</label> Tick the tracks, then pick an input with Option held (or this ticked): the ticked tracks get that input and the ones after it, in order.</p>
      <div class="dc-wrap"><table class="daw-table logic-table"><thead><tr><th></th><th>Track</th><th>Input</th><th>R</th><th>Level</th><th>Hears</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  audioHtml(mac) {
    const opt = (v, label) => `<option value="${v}" ${(mac.logicIn || 0) === v ? "selected" : ""}>${label}</option>`;
    return `
      <p class="dante-note">${esc(translate("ui.danteLogicInputNote", "Logic → Settings → Audio → Devices. Logic records from one input device at a time. Set this first: until it's Dante Virtual Soundcard, the X32's 32 channels aren't there to pick from."))}</p>
      <p><label>${esc(translate("ui.danteLogicInputDevice", "Input Device"))} <select data-logic-device>${opt(0, "Dante Virtual Soundcard")}${opt(1, "SSL 2+")}</select></label></p>
      <p class="dante-note">${esc(translate("ui.danteLogicOutputDevice", "Output Device: SSL 2+ (your headphones plug in there)."))}</p>`;
  }

  dvsHtml(mac) {
    const on = mac.dvs !== 0;
    return `
      <p class="dante-note">${esc(translate("ui.danteMacDvsNote", "The driver that puts the Mac mini on the Dante network. While it's stopped, Dante Controller shows no Mac mini to route to, and Logic has no Dante inputs."))}</p>
      <p class="dvs-status"><span class="status-pill status-${on ? "ok" : "warn"}">${on ? translate("ui.danteRunning", "● Running") : translate("ui.danteDvsOff", "○ Stopped")}</span>
        <button type="button" class="btn" data-logic="dvs" aria-label="${esc(on ? translate("ui.danteStopAria", "Stop") : translate("ui.danteStartAria", "Start"))}">${on ? translate("ui.danteStop", "Stop") : translate("ui.danteStart", "Start")}</button></p>`;
  }

  controllerHtml(mac) {
    const rig = this.store.state.rig;
    if (mac.dvs === 0) {
      return `<p class="dante-note">${esc(translate("ui.danteNoMacReceiver", "Receivers: the Mac mini isn't on the network. The X32 is here as a transmitter, but there's nothing to route it to."))}</p>
        <p class="dante-note"><b>${esc(translate("ui.danteCheckDvs", "Is Dante Virtual Soundcard running?"))}</b></p>`;
    }
    const txName = (k) => {
      const src = cardSource(rig, k);
      return src ? (src.kind === "local" ? `L${src.n}` : `A${src.n}`) : "";
    };
    const first = this.rxPage * RX_PAGE;
    const pages = Math.ceil(LOGIC.inputs / RX_PAGE);
    const head = Array.from({ length: LOGIC.inputs }, (_, k) => `<th scope="col" class="dc-tx"><span>${String(k + 1).padStart(2, "0")}</span><small>${esc(txName(k + 1))}</small></th>`).join("");
    const body = Array.from({ length: Math.min(RX_PAGE, LOGIC.inputs - first) }, (_, r) => {
      const m = first + r;
      const cells = Array.from({ length: LOGIC.inputs }, (_, k) => {
        const on = mac.macRx[m] === k + 1;
        const label = danteSubscriptionLabel(on, "Mac mini", m + 1, "X32 TX", k + 1);
        return `<td><button type="button" class="dc-cell ${on ? "on" : ""}" data-logic="sub" data-rx="${m}" data-tx="${k + 1}" aria-pressed="${on}" aria-label="${esc(label)}">${on ? "✓" : ""}</button></td>`;
      }).join("");
      return `<tr><th scope="row" class="dc-rx">${String(m + 1).padStart(2, "0")}</th>${cells}</tr>`;
    }).join("");
    const pager = `<div class="dante-tabs">${Array.from({ length: pages }, (_, p) => `<button type="button" class="chip ${p === this.rxPage ? "active" : ""}" data-logic="page" data-page="${p}">RX ${p * RX_PAGE + 1}–${Math.min(LOGIC.inputs, (p + 1) * RX_PAGE)}</button>`).join("")}</div>`;
    return `
      <p class="dante-note">${translate("ui.danteMacControllerNote", "Filtered to {x32} (transmitter, across: its card outputs, named by ROUTING → CARD: L = the X32's own inputs, A = the S32's) and {bh100} (receiver, down: MUS-BH100-MINI, the FOH Mac mini). Click a square to subscribe.", { x32: "<b>x32</b>", bh100: "<b>bh100</b>" })}</p>
      ${danteOneToOneHtml("logic", "X32 × MUS-BH100-MINI", this.tip)}
      ${pager}
      <div class="dc-wrap"><table class="dc-grid">
        <thead><tr><th class="dc-corner">Mac RX ↓ · X32 TX →</th>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table></div>`;
  }
}

export function danteTrackMessage(reason) {
  if (language() !== "ja") return reason;
  if (reason === "Dante Virtual Soundcard is stopped.") {
    return `${translate("ui.danteStopped", reason.slice(0, -1))}。`;
  }
  if (reason === "Dante Virtual Soundcard is stopped") return translate("ui.danteStopped", reason);
  if (reason === "No Cat5e from the X32's CARD (X-DANTE) to the Mac mini") return translate("ui.danteLogicNoCard", reason);
  const ssl = "Logic's input device is the SSL 2+: ";
  if (reason.startsWith(ssl)) {
    const detail = reason.slice(ssl.length);
    const key = detail === "it has only two inputs" ? "ui.danteLogicSslTwo" : "ui.danteLogicSslEmpty";
    return translate("ui.danteLogicSslInput", reason, { detail: translate(key, detail) });
  }
  const rules = [
    [/^Dante Controller: the Mac mini's RX (\d+) isn't subscribed to the X32$/, "ui.danteLogicRxUnsubscribed", "rx"],
    [/^CARD output (\d+) carries a block that isn't an input$/, "ui.danteLogicCardNotInput", "tx"],
    [/^No stage box for (.+)$/, "ui.danteLogicNoStageBox", "jack"],
    [/^No AES50 link: (.+) never reaches the X32$/, "ui.danteLogicNoAes50", "jack"],
    [/^Nothing is plugged into (.+)$/, "ui.danteLogicUnplugged", "jack"],
  ];
  for (const [pattern, key, param] of rules) {
    const match = pattern.exec(reason);
    if (match) return translate(key, reason, { [param]: match[1] });
  }
  return reason;
}
