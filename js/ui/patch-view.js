// Sources and Outputs panels plus the patch dialog. Patching is tap-based:
// tap a port → pick a cable → pick where the other end goes. Every result is
// shown in words (not just colour) on both ends of the cable.

import {
  CABLES,
  DEVICE_TYPES,
  JACKS,
  PLUGS,
  SIGNAL_LEVELS,
  cableAt,
  cableEndFor,
  cablesForPort,
  checkConnection,
  orient,
  getPort,
  isMixer,
  listPorts,
  mixerOf,
  plugFitsJack,
  SD8_BANKS,
  aesOffset,
  inSourceName,
  throughLinks,
  MIC_STATES,
  knobDb,
  knobPos,
  receiverChannel,
  powerSpec,
  powerState,
  powerWhy,
} from "../connection-model.js";
import { modelOf } from "../mixer-state.js";
import { F8, PAIR, REVERB, TECHNIQUES, cardStats, techniqueOf } from "../devices.js";

import { CONNECTOR_GUIDE, deviceIconName, icon, jackIconName, levelIconName, plugIconName } from "./icons.js";
import { jackArt, plugArt } from "./connector-art.js";
import { nameMode, sourceName } from "../names.js";
import { dvsRunning } from "../dante.js";
import { isRecordingMac, logicTracks } from "../recording.js";
import { count } from "../submission.js";
import { localized, sourceText, t as translate } from "../i18n/index.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const CABLE_HUES = [195, 145, 45, 330, 265, 20, 170, 290];
export const cableHue = (id) => CABLE_HUES[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % CABLE_HUES.length];

const LEVEL_SHORT = { mic: "Mic level", instrument: "Instrument level", line: "Line level", speaker: "Speaker level", "mic-or-line": "Mic (XLR) or line (¼″)", any: "Passes whatever is plugged in at the other end", rf: "RF (antenna)" };
const connectorKey = { "xlr-m": "xlrMale", "xlr-f": "xlrFemale", trs14: "trs14", ts14: "ts14", trs35: "trs35", rca: "rca", speakon: "speakon", ethercon: "ethercon", iec: "iec" };
const connectorText = (name, field, fallback) => localized("connectors", connectorKey[name], field, fallback);
const cableText = (id, field, fallback) => localized("cables", id, field, fallback);
const roomDisplayKeys = {
  "Room pair · stereo bar at FOH": "roomPairOnBar",
  "Left mic XLR out": "roomLeftOut",
  "Right mic XLR out": "roomRightOut",
};
const gearText = (value) => Object.hasOwn(roomDisplayKeys, value)
  ? translate(`ui.${roomDisplayKeys[value]}`, value)
  : localized("gear", value, "", value);
const gearTypeText = (id, field, fallback) => localized("gearById", id, field, fallback);
export const connectionMessage = (message) => {
  if (message === "This speaker isn't fed from a mixer output.") return translate("ui.speakerNoMixerFeed", message);
  if (message === "The amp isn't fed from a mixer output.") return translate("ui.ampNoMixerFeed", message);
  if (message === "Nothing connected.") return translate("ui.outputDisconnected", message);
  if (message === "Nothing connected. A passive speaker needs a power amp.") return translate("ui.passiveOutputDisconnected", message);
  if (message === "Speaker cable carrying line level: unshielded, may hum.") return translate("ui.speakerCableOnLine", message);
  if (message === "Line level can't drive a passive speaker — there's no amplifier. Put a power amp in between, or use a powered speaker.") return translate("ui.passiveNeedsAmp", message);
  if (message === "Condenser mic, no +48 V: it's plugged in but silent. Turn on phantom power.") return translate("ui.condenserNoPhantom", message);
  if (message === "Speaker level into a camera input can damage it. Cameras take mic or line level.") return translate("ui.cameraSpeakerLevel", message);
  if (message === "This camera input isn't fed from a mixer output.") return translate("ui.cameraNoMixerFeed", message);
  if (message === "Mic level into the camera's LINE input: about 40 dB too quiet, so it records mostly noise. Set the camera to MIC, or the mixer's OUTPUT LEVEL to LINE.") return translate("ui.cameraWeakLineInput", message);
  const hotCamera = message?.match(/^(Line|−10 \(tape\)|−10) level into the camera's (3\.5 mm )?MIC input: about (40|26) dB too hot,/);
  if (hotCamera) {
    const [, level, mini, db] = hotCamera;
    const levelKey = { Line: "cameraLineLevel", "−10 (tape)": "cameraTapeLevel", "−10": "cameraMinus10Level" }[level];
    return translate(mini ? "ui.cameraHotMiniInput" : "ui.cameraHotMicInput", message, { level: translate(`ui.${levelKey}`, level), db });
  }
  return message;
};
const displayDevice = (value) => value === "Laptop · Preshow Music" ? gearText("preshowLaptop") : value === "Powered speaker · house left" ? `${gearText("poweredSpeaker")} · ${gearText("houseLeft")}` : value === "Powered speaker · house right" ? `${gearText("poweredSpeaker")} · ${gearText("houseRight")}` : gearText(value);
const inputText = (key, fallback, vars = {}) => translate(`ui.${key}`, fallback, vars);
const outputDeviceName = (label) => translate(`ui.outputDeviceNames.${label}`, displayDevice(label));
function cmeAdvancedWarning(message) {
  const iec = /^No power: (.+): its IEC power cable isn't plugged in\.$/.exec(message);
  if (iec) return translate("ui.cmeAdvancedIecUnplugged", message, { device: iec[1] });
  const source = /^No sound: (.+): its power cable isn't plugged in\.$/.exec(message);
  if (source) return translate("ui.cmeAdvancedSourceUnplugged", message, { device: source[1] });
  const off = /^No power: (.+) is switched off\.$/.exec(message);
  if (off) return translate("ui.vjrAmpOff", message, { device: off[1] });
  if (message === '1/4" TS instrument cable carrying speaker level: use real speaker cable (thin shielded wire can overheat).') {
    return translate("ui.cmeAdvancedSpeakerCable", message);
  }
  if (message === "Speaker level into a powered speaker's line input can damage it. A powered speaker already has its amp.") {
    return translate("ui.cmeAdvancedPoweredSpeaker", message);
  }
  return connectionMessage(message);
}
const connectionReason = (reason) => {
  if (!reason) return reason;
  if (reason === "That would loop a device back into itself.") return translate("ui.selfLoop", reason);
  if (reason === "Cables run from an output to an input.") return translate("ui.outputInput", reason);
  if (reason === "Unknown port or cable.") return translate("ui.unknownPort", reason);
  let m = reason.match(/^A (.+) doesn't fit the (.+) jack on (.+)\.$/);
  if (m) return translate("ui.cableDoesNotFit", reason, { cable: m[1], jack: m[2], port: m[3] });
  m = reason.match(/^The other end \((.+)\) doesn't fit the (.+) jack on (.+)\.$/);
  if (m) return translate("ui.otherEndDoesNotFit", reason, { plug: m[1], jack: m[2], port: m[3] });
  m = reason.match(/^(.+) already has a cable\.$/);
  if (m) return translate("ui.alreadyHasCable", reason, { port: m[1] });
  return reason;
};

export function portLabel(rig, ref, { short = false } = {}) {
  const p = getPort(rig, ref);
  if (!p) return ref;
  if (isMixer(p.device)) return short ? p.name.replace(" input", "").replace(" out", "") : `Mixer · ${p.name}`;
  const dev = displayDevice(p.device.label || DEVICE_TYPES[p.device.type].name);
  const pname = gearText(p.name);
  return short ? dev : `${dev} · ${pname}`;
}

export class PatchView {
  constructor({ sourcesRoot, outputsRoot, store, manifest, toast, getTerms, getGigId = () => null, onOpenRecorder = () => {}, getRecorder = () => null, onOpenDante = () => {}, onSettle = () => {}, onOpenConsole = () => {} }) {
    this.onOpenRecorder = onOpenRecorder;
    this.onOpenConsole = onOpenConsole;
    this.onSettle = onSettle;
    this.onOpenDante = onOpenDante;
    this.getRecorder = getRecorder;
    this.sourcesRoot = sourcesRoot;
    this.outputsRoot = outputsRoot;
    this.store = store;
    this.manifest = manifest;
    this.toast = toast;
    this.getTerms = getTerms;
    this.getGigId = getGigId;
    this.dialog = new PatchDialog(this);
    // Each device's card, by device id ("mixer" = its outputs), for the stage diagram's inspector.
    this.cards = new Map();
    for (const root of [sourcesRoot, outputsRoot]) this.bindRoot(root);
  }

  // Ports, device settings and the recorder / Dante buttons work in any panel that shows these cards.
  bindRoot(root) {
    {
      root.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-port]");
        if (btn) this.dialog.open(btn.dataset.port);
        const rec = e.target.closest("[data-open-recorder]");
        if (rec) this.onOpenRecorder(rec.dataset.openRecorder);
        const dante = e.target.closest("[data-open-dante]");
        if (dante) this.onOpenDante(dante.dataset.openDante);
        const desk = e.target.closest("[data-open-console]");
        if (desk) this.onOpenConsole(desk.dataset.openConsole);
        // A wireless handheld's one button: a tap mutes or unmutes it, press and hold switches it on or off.
        const press = e.target.closest("[data-mic-press]");
        if (press) {
          const d = this.store.state.rig.devices.find((x) => x.id === press.dataset.device);
          const now = d?.mic || 0;
          const next = press.dataset.micPress === "tap" ? (now === 2 ? 2 : 1 - now) : now === 2 ? 0 : 2;
          if (d && next !== now) {
            this.store.setDevice(d.id, "mic", next);
            this.onSettle();
          }
        }
      });
      // A knob let go, or a choice made: the cards' status follows.
      root.addEventListener("change", (e) => {
        if (e.target.closest("[data-device-key]")) this.onSettle();
      });
      // Device settings (mic pair spacing/angle, reverb decay). The panel isn't
      // redrawn while dragging; only the readouts next to the slider change.
      root.addEventListener("input", (e) => {
        const el = e.target.closest("[data-device-key]");
        if (!el) return;
        this.store.setDevice(el.dataset.device, el.dataset.deviceKey, Number(el.value));
        this.updateDeviceReadouts(root);
      });
    }
  }

  openPort(ref) {
    this.dialog.open(ref);
  }

  // Patch two jacks directly (dragged from one to the other): only the cables that fit both ends.
  openBetween(fromRef, toRef) {
    this.dialog.openBetween(fromRef, toRef);
  }

  cableChip(ref, dir) {
    const rig = this.store.state.rig;
    const cable = cableAt(rig, ref);
    if (!cable) return `<span class="port-empty">${translate("ui.notConnected", "Not connected")}</span>`;
    const other = cable.from === ref ? cable.to : cable.from;
    const arrow = dir === "out" ? "→" : "←";
    return `<span class="cable-dot" style="--hue:${cableHue(cable.id)}" aria-hidden="true"></span><span class="port-link">${arrow} ${esc(portLabel(rig, other))}</span><span class="port-cable">${esc(cableText(cable.cable, "name", CABLES[cable.cable].name))}</span>`;
  }

  portButton(ref, dir, extraClass = "") {
    const rig = this.store.state.rig;
    const p = getPort(rig, ref);
    const connected = !!cableAt(rig, ref);
    const jackIcon = jackIconName(p.jack, p.dir);
    return `<button type="button" class="port-btn ${connected ? "is-connected" : ""} ${extraClass}" data-port="${esc(ref)}">
      ${jackIcon ? `<span class="port-ico">${icon(jackIcon, { size: 30 })}</span>` : ""}
      <span class="port-name">${esc(gearText(p.name))} <small>${esc(gearText(JACKS[p.jack].name))} · ${esc(gearText(LEVEL_SHORT[p.level] || p.level))}</small></span>
      <span class="port-state">${this.cableChip(ref, dir)}</span>
    </button>`;
  }

  render(mix) {
    this.renderSources(mix);
    this.renderOutputs(mix);
  }

  renderSources(mix) {
    const cob = this.getGigId?.() === "cob";
    const vocalJazz = this.getGigId?.() === "vocal-jazz";
    const mariachi = this.getGigId?.() === "mariachi";
    const recordingGig = this.getGigId?.() === "vocal-jazz-recording";
    const advanced = this.getGigId?.() === "cme-advanced";
    const cme = this.getGigId?.() === "cme" || advanced;
    const state = this.store.state;
    const rig = state.rig;
    const { SOURCES_BY_ID } = this.manifest;
    const sources = rig.devices.filter((d) => DEVICE_TYPES[d.type].source && d.sourceId).sort((a, b) => SOURCES_BY_ID[a.sourceId].order - SOURCES_BY_ID[b.sourceId].order);
    const pairs = rig.devices.filter((d) => d.type === "stereo-mic-pair" || d.type === "piano-mic-pair");
    const cards = sources.map((d) => {
      const src = SOURCES_BY_ID[d.sourceId];
      const headset = cob && /^Wireless headset ([A-K]) \(receiver channel \1\)$/.exec(src.device);
      const cobTrack = cob && src.id === "track";
      const handheld = vocalJazz && /^Wireless handheld (\d+), ([\w/]+) \(receiver channel \1\)$/.exec(src.device);
      const recordingHandheld = recordingGig && /^Wireless handheld (\d+), ([\w/]+) → receiver (\d+) CH (\d+) \(CH \1\)$/.exec(src.device);
      const deviceText = handheld
        ? translate("ui.vocalJazzHandheld", src.device, { number: handheld[1], color: handheld[2] })
        : recordingHandheld
          ? translate("ui.vjrHandheld", src.device, { number: recordingHandheld[1], color: recordingHandheld[2], receiver: recordingHandheld[3], channel: recordingHandheld[4] })
          : sourceText(src, "device", gearText(src.device));
      const ref = `${d.id}/out`;
      // A radio handheld has no cable: its channel is the one its receiver feeds.
      const rf = DEVICE_TYPES[d.type].rf;
      const chInfo = mix.channels.find((c) => (rf ? c.sourceId === d.sourceId : c.input.sourceDeviceId === d.id));
      const input = chInfo ? chInfo.input : null;
      // The same verdict as its box in Stage & patch: its own power first, then (by radio) whether
      // any audio reaches its channel, then what the channel's input says.
      const pst = powerState(rig, d);
      const dark = pst && pst !== "on";
      const silentRf = rf && (!chInfo || chInfo.band === "none");
      const status = dark || silentRf ? "warn" : !input ? "idle" : input.status === "ok" ? "ok" : input.status === "danger" ? "bad" : "warn";
      const pill = dark ? { unplugged: inputText("unpluggedStatus", "! Unplugged"), off: inputText("switchedOffStatus", "! Switched off") }[pst] || inputText("noPowerStatus", "! No power") : silentRf ? (chInfo ? inputText("noAudioStatus", "! No audio") : inputText("noChannelStatus", "! No channel")) : status === "ok" ? inputText("signalPresent", "✓ Signal") : status === "idle" ? inputText("unpatched", "Unpatched") : status === "bad" ? inputText("dangerStatus", "✕ Danger") : input?.status === "no-power" ? inputText("noPowerStatus", "! No power") : inputText("checkStatus", "! Check");
      const msgs = input ? input.messages : [];
      const tags = [
        `<span class="tag tag-level" data-level="${src.signalLevel}">${icon(levelIconName(src.signalLevel), { size: 22, cls: "tag-ico" })}${esc(gearText(SIGNAL_LEVELS[src.signalLevel].name))}</span>`,
        `<span class="tag">${esc(gearText(PLUGS[src.connector] ? PLUGS[src.connector].name : src.connector))} ${esc(inputText("outputSuffix", "out"))}</span>`,
        src.stereo ? `<span class="tag tag-stereo">${esc(gearText("Stereo L/R"))}</span>` : "",
        src.phantom === "required" ? `<span class="tag tag-phantom">${esc(inputText("needs48", "Needs +48 V"))}</span>` : "",
      ].join("");
      // Input-list number: where this source belongs (the CR1604 takes the laptop on TAPE IN).
      const model = modelOf(state);
      // Input-list number: where the source is patched (a compact mixer has fewer channels than the band).
      // On Mixer A/B a source's own strip, if it has one of the right kind (mics 9–11 of the Vocal Jazz Ensemble don't).
      const own = state.channels[src.order - 1];
      const listNo = model === "generic" ? (own && !!own.stereo === !!src.stereo ? own.label : chInfo ? state.channels[chInfo.index].label : "—") : model === "cr1604" && src.stereo ? "TAPE" : chInfo ? state.channels[chInfo.index].label : "—";
      const sourceNote =
        model === "cr1604" && src.stereo
          ? sourceText(src, "noteCr1604", "A laptop's 3.5 mm headphone jack is a stereo line output. On the 1604 it goes into the TAPE INPUT RCA pair with a 3.5 mm ↔ RCA (Y) cable, then TAPE TO MAIN MIX puts it in the house.")
          : model !== "generic" && src.stereo
            ? sourceText(src, (model === "x32c" || model === "gdig") && src.id === "synths" ? "noteAux12" : "noteStereo", "A laptop's 3.5 mm headphone jack is a stereo line output: a stereo line channel or the tape input takes it, with a breakout, RCA (Y) or 3.5 mm cable to suit the jacks.")
            : sourceText(src, "note", d.sourceId === "preshow" ? gearText("preshowNote") : src.note);
      const mariachiMic = mariachi && /^Wireless handheld, (\w+) windscreen, (\w+) ring → receiver (\d+) CH (\d+) \(CH (\d+)\)$/.exec(src.device);
      const device = headset ? translate("ui.cobHeadset", deviceText, { letter: headset[1] })
        : cobTrack ? translate("ui.cobTrackDevice", deviceText)
        : cme ? translate(`ui.cmeInputText.${src.id}.device`, deviceText)
        : mariachiMic ? translate("ui.mariachiHandheld", deviceText, {
          windscreen: mariachiMic[1], ring: mariachiMic[2], receiver: mariachiMic[3], channel: mariachiMic[4], input: mariachiMic[5],
        }) : deviceText;
      const note = cobTrack ? translate("ui.cobTrackNote", sourceNote ?? "")
        : cme ? translate(`ui.cmeInputText.${src.id}.note`, sourceNote ?? "")
        : mariachi ? translate(`ui.mariachiInputNotes.${src.id}`, sourceNote ?? "") : sourceNote;
      const name = sourceText(src, "name", src.name);
      const title = cobTrack ? translate("ui.cobTrackName", name) : name;
      return this.card(d.id, `<li class="source-card status-${status}">
        <div class="source-top">
          <span class="source-order" aria-label="Input list number">${esc(listNo)}</span>
          <span class="dev-ico">${icon(deviceIconName(d), { size: 40 })}</span>
          <div class="source-names"><strong>${esc(displayDevice(title))}</strong><span>${nameMode() === "musicians" && src.musician ? `${esc(title)} · ` : ""}${esc(device)}</span></div>
          <span class="status-pill status-${status}">${pill}</span>
        </div>
        <div class="tags">${tags}</div>
        ${rf ? rfLine(rig, d) : this.portButton(ref, "out")}
        ${sourceGearHtml(d, src, rig, !!handheld || ((cme || mariachi) && rf), mariachi)}
        ${isRecordingMac(d) ? this.logicHtml(mix) : ""}
        ${powerHtml(rig, d)}
        ${msgs.map((m) => {
          const rack = cme && /^No power: (.+) is switched on, but (.+) is off\.$/.exec(m);
          const text = rack ? translate("ui.cmeRackOff", m, { receiver: rack[1], power: rack[2] })
            : advanced ? cmeAdvancedWarning(m) : connectionMessage(m);
          return `<p class="port-msg">${esc(text)}</p>`;
        }).join("")}
        ${note ? `<p class="source-note">${esc(note)}</p>` : ""}
      </li>`);
    });
    const empty = mix.channels.filter((c) => !c.input.connected).map((c) => state.channels[c.index].label);
    this.sourcesRoot.innerHTML = `
      <p class="role-line">${icon("role-source", { size: 26 })}<span>${translate("ui.sourcesRole", "Sources: the signal starts here and goes out to the mixer.")}</span></p>
      <ol class="source-list">${rig.devices.filter((d) => DEVICE_TYPES[d.type].dante).map((d) => this.dawCard(d, mix)).join("")}${cards.join("")}${pairs.map((d) => this.pairCard(d, mix)).join("")}${rig.devices.filter((d) => DEVICE_TYPES[d.type].stagebox).map((d) => this.stageBoxCard(d, mix)).join("")}</ol>
      <p class="panel-foot">${modelOf(state) === "cr1604" ? cr1604Foot(empty) : modelOf(state) !== "generic" ? compactFoot(state, empty) : inputText("genericInputFooter", "Free mixer inputs: {channels}. Ch 1–8 are XLR/¼″ combo jacks: XLR → mic preamp (+48 V available), ¼″ → line input (padded). Ch 9/10 is one stereo line input (left + right ¼″ pair, no phantom power).", { channels: empty.length ? empty.map((n) => `Ch ${n}`).join(", ") : "none" })}</p>
      ${connectorGuide()}`;
  }

  // The DAW laptop: its tracks go out over Dante, so there are no jacks to
  // patch; the card says where each track lands and opens the laptop's windows.
  dawCard(d, mix) {
    const { SOURCES_BY_ID } = this.manifest;
    const state = this.store.state;
    const lands = DEVICE_TYPES[d.type].ports.map((p) => {
      const c = mix.channels.find((x) => x.input.sourceDeviceId === d.id && x.input.sourceId === p.sourceId);
      const src = SOURCES_BY_ID[p.sourceId];
      const name = sourceName(src);
      const displayName = name === src?.name ? sourceText(src, "name") : name;
      return `<li><span>${esc(p.name)} · ${esc(displayName || p.sourceId)}</span><b>${c ? `→ CH ${esc(state.channels[c.index].label)}` : esc(translate("ui.dawMissing", "not reaching the console"))}</b></li>`;
    });
    const n = lands.filter((l) => l.includes("→ CH")).length;
    const status = n === lands.length ? "ok" : n ? "warn" : "idle";
    return this.card(d.id, `<li class="source-card status-${status}" data-device-card="${esc(d.id)}">
      <div class="source-top">
        <span class="source-order">DVS</span>
        <span class="dev-ico">${icon("laptop", { size: 40 })}</span>
        <div class="source-names"><strong>${esc(d.label)}</strong><span>${dvsRunning(d) ? esc(translate("ui.dawMultitrack", "Multitrack stems over Dante (no cables)")) : esc(translate("ui.danteStopped", "Dante Virtual Soundcard is stopped"))}</span></div>
        <span class="status-pill status-${status}">${esc(translate("ui.dawLanded", "{count}/{total} on the console", { count: n, total: lands.length }))}</span>
      </div>
      <ul class="daw-lands">${lands.join("")}</ul>
      <div class="dante-buttons">
        <button type="button" class="btn btn-start" data-open-dante="daw">${esc(translate("ui.dawOpen", "Open the DAW"))}</button>
        <button type="button" class="btn btn-start" data-open-dante="dvs">Dante Virtual Soundcard</button>
        <button type="button" class="btn btn-start" data-open-dante="controller">${esc(translate("ui.danteOpenController", "Open Dante Controller"))}</button>
      </div>
    </li>`);
  }

  // The FOH Mac mini that records (Vocal Jazz v2): how many of Logic's tracks get
  // something, and the buttons for Logic, Dante Virtual Soundcard and Dante Controller.
  logicHtml() {
    const tracks = logicTracks(this.store.state, this.manifest.SOURCES_BY_ID, this.manifest.STEMS);
    const live = tracks.filter((t) => t.ok).length;
    const armed = tracks.filter((t) => t.arm).length;
    const english = `Logic: ${live} of ${tracks.length} tracks have signal, ${armed} record-enabled. The multitrack arrives over Dante from the X32's X-DANTE card.`;
    const summary = this.getGigId?.() === "vocal-jazz-recording"
      ? translate("ui.vjrLogicSummary", english, { live, total: tracks.length, armed }) : english;
    return `<p class="source-note">${esc(summary)}</p>
      <div class="dante-buttons">
        <button type="button" class="btn btn-start" data-open-dante="logic">Open Logic</button>
        <button type="button" class="btn btn-start" data-open-dante="dvs">Dante Virtual Soundcard</button>
        <button type="button" class="btn btn-start" data-open-dante="controller">${esc(translate("ui.danteOpenController", "Open Dante Controller"))}</button>
      </div>`;
  }

  // The stereo room pair: two condenser outs, spacing and angle, and which
  // named technique the setting matches.
  pairCard(d, mix) {
    const recordingGig = this.getGigId?.() === "vocal-jazz-recording";
    const piano = d.type === "piano-mic-pair";
    const title = piano ? (recordingGig ? translate("ui.vjrPianoMics", "Piano mics") : "Piano mics") : inputText("roomPair", "Room pair");
    const label = recordingGig && piano ? translate("ui.vjrPianoSetup", d.label)
      : recordingGig && d.label === "ORTF room pair · stereo bar" ? translate("ui.vjrRoomBar", d.label) : gearText(d.label);
    const pianoNote = "Stand-ins: the ensemble's recording has no piano track, so these two mics hear the singers from the piano's side of the stage.";
    const inputs = [...mix.channels.map((c) => c.input), ...Object.values(mix.rig.recorders || {}).flat()].filter((i) => i && i.sourceDeviceId === d.id);
    const bad = inputs.find((i) => i.status !== "ok");
    const status = !inputs.length ? "idle" : bad ? "warn" : "ok";
    return this.card(d.id, `<li class="source-card status-${status}" data-device-card="${esc(d.id)}">
      <div class="source-top">
        <span class="source-order">ST</span>
        <span class="dev-ico">${icon(deviceIconName({ type: "condenser-mic" }), { size: 40 })}</span>
        <div class="source-names"><strong>${esc(title)}</strong><span>${esc(label)}</span></div>
        <span class="status-pill status-${status}">${status === "ok" ? inputText("signalPresent", "✓ Signal") : status === "idle" ? inputText("unpatched", "Unpatched") : inputText("checkStatus", "! Check")}</span>
      </div>
      <div class="tags"><span class="tag">${inputText("pairCondenser", "2× condenser (cardioid)")}</span><span class="tag">${inputText("pairXlrOut", "XLR outs")}</span><span class="tag tag-phantom">${inputText("needs48", "Needs +48 V")}</span></div>
      ${listPorts(this.store.state.rig, d).map((p) => this.portButton(p.ref, "out")).join("")}
      ${(bad ? bad.messages : []).map((m) => `<p class="port-msg">${esc(connectionMessage(m))}</p>`).join("")}
      ${piano ? `<p class="source-note">${esc(recordingGig ? translate("ui.vjrPianoStandIn", pianoNote) : pianoNote)}</p>` : `<div class="dev-settings">
        <label>${inputText("pairSpacing", "Spacing")} <output data-readout="spacingCm">${d.spacingCm} cm</output>
          <input type="range" min="0" max="${PAIR.spacingMax}" step="1" value="${d.spacingCm}" data-device="${esc(d.id)}" data-device-key="spacingCm" /></label>
        <label>${inputText("pairAngle", "Angle between the mics")} <output data-readout="angleDeg">${d.angleDeg}°</output>
          <input type="range" min="0" max="${PAIR.angleMax}" step="1" value="${d.angleDeg}" data-device="${esc(d.id)}" data-device-key="angleDeg" /></label>
        <p class="dev-technique" data-readout="technique">${techniqueText(d)}</p>
      </div>`}
    </li>`);
  }

  // A snake or stage box: which channels reach the console through it, its link, and the jacks in use.
  stageBoxCard(d, mix) {
    const rig = this.store.state.rig;
    const type = DEVICE_TYPES[d.type];
    const gig = this.getGigId?.();
    const cme = gig === "cme" || gig === "cme-advanced";
    const cmeSnake = cme && d.label === "Hosa sub snake · by the piano";
    const label = cmeSnake ? translate("ui.cmeSnakeLabel", d.label)
      : (gig === "vocal-jazz" || gig === "vocal-jazz-recording" || gig === "mariachi" || cme) && d.label === "S32 · stage-side rack"
        ? translate("ui.vocalJazzStageBox", d.label) : d.label || type.name;
    const blurb = gearTypeText(d.type, "blurb", type.blurb);
    const links = throughLinks(rig).filter((l) => l.via === d.id);
    const live = mix.channels.filter((c) => c.input.connected && links.some((l) => l.from === c.input.fromPort));
    const plugged = listPorts(rig, d).filter((p) => cableAt(rig, p.ref) && !p.network);
    const nets = listPorts(rig, d).filter((p) => p.network);
    const mixer = mixerOf(rig);
    const offset = type.passthrough || !mixer ? null : aesOffset(rig, d, mixer);
    const blocks = mixer.inSource ? mixer.inSource.map((v, b) => `CH ${b * 8 + 1}–${b * 8 + 8}: ${inSourceName(mixer.inSource, b)}`).join(" · ") : "";
    const span = offset === null ? "" : `AES50 A${offset + 1}–${offset + type.ins}`;
    const link = offset === 0 ? translate("ui.aesLinkDirect", "✓ AES50 link to the console: its inputs are {span}.", { span })
      : offset !== null ? translate("ui.aesLinkChained", "✓ AES50 link through the box before it (its AES50 B): this box's inputs come after that box's, as {span}.", { span })
      : translate("ui.aesNoLink", "No AES50 link: a Cat5 cable from AES50 A into the console's AES50 A, or into the AES50 B of a box that is linked.");
    const shift = (d.outBank || 0) * 8;
    const outs = type.bank ? translate("ui.aesBank", "OUTPUT switch on {bank}: OUT n carries AES50 output {channel}. In Salmon, AES50 outputs 1–16 carry the console's XLR OUT 1–16, and 17–24 repeat OUT 1–8.", { bank: SD8_BANKS[d.outBank || 0], channel: shift ? `n + ${shift}` : "n" }) : translate("ui.aesOutput", "OUT n carries the console's XLR OUT n.");
    const ins = plugged.filter((p) => p.dir === "in" && (p.role === "sb-in" || p.end === "stage")).length;
    const status = !plugged.length ? "idle" : live.length >= ins ? "ok" : "warn";
    const note = type.passthrough
      ? translate("ui.snakePath", "Passive: IN n on stage comes out as tail n at FOH, phantom power included. RETURN sends at FOH come out on stage.")
      : translate("ui.aesPath", "{link} The console's GAIN and 48V drive these preamps. ROUTING: {blocks}. {outputs}", { link, blocks, outputs: outs });
    const bank = type.bank
      ? `<div class="dev-settings"><label>OUTPUT switch <select data-device="${esc(d.id)}" data-device-key="outBank" aria-label="${esc(d.label || type.name)} OUTPUT switch">${SD8_BANKS.map((t, i) => `<option value="${i}"${(d.outBank || 0) === i ? " selected" : ""}>${t}</option>`).join("")}</select></label></div>`
      : "";
    return this.card(d.id, `<li class="source-card status-${status}" data-device-card="${esc(d.id)}">
      <div class="source-top">
        <span class="source-order">BOX</span>
        <span class="dev-ico">${icon("stage-box", { size: 40 })}</span>
        <div class="source-names"><strong>${esc(label)}</strong><span>${esc(cmeSnake ? translate("ui.cmeSnakeBlurb", blurb) : blurb)}</span></div>
        <span class="status-pill status-${status}">${esc(translate("ui.stageboxLanded", "{count} on the console", { count: live.length }))}</span>
      </div>
      <p class="source-note">${esc(note)}</p>
      ${bank}
      ${powerHtml(rig, d)}
      ${nets.map((p) => this.portButton(p.ref, p.dir)).join("")}
      ${plugged.map((p) => this.portButton(p.ref, p.dir)).join("")}
    </li>`);
  }

  card(id, html) {
    this.cards.set(id, html);
    return html;
  }

  updateDeviceReadouts(root) {
    for (const card of root.querySelectorAll("[data-device-card]")) {
      const d = this.store.state.rig.devices.find((x) => x.id === card.dataset.deviceCard);
      if (!d) continue;
      const set = (k, v) => {
        const el = card.querySelector(`[data-readout="${k}"]`);
        if (el && el.textContent !== v) el.textContent = v;
      };
      if (d.type === "stereo-mic-pair") {
        set("spacingCm", `${d.spacingCm} cm`);
        set("angleDeg", `${d.angleDeg}°`);
        card.querySelector('[data-readout="technique"]').innerHTML = techniqueText(d);
      }
      if (d.type === "reverb") set("decay", `${d.decay.toFixed(1)} s`);
      for (const k of DEVICE_TYPES[d.type].knobs || []) if (!k.select) set(k.key, knobText(knobPos(d, k), k.unity));
      const vk = d.sourceId && this.manifest.SOURCES_BY_ID[d.sourceId]?.volumeKnob;
      if (vk) set("vol", knobText(d.vol ?? vk.start, vk.unity));
      if (d.type === "camera-input") set("inputLevel", d.inputLevel === 1 ? "LINE" : "MIC");
    }
  }

  renderOutputs(mix) {
    const cob = this.getGigId?.() === "cob";
    const vocalJazz = this.getGigId?.() === "vocal-jazz";
    const mariachi = this.getGigId?.() === "mariachi";
    const recordingGig = this.getGigId?.() === "vocal-jazz-recording";
    const advanced = this.getGigId?.() === "cme-advanced";
    const cme = this.getGigId?.() === "cme" || advanced;
    const state = this.store.state;
    const rig = state.rig;
    const terms = this.getTerms();
    const mixer = mixerOf(rig);
    const outs = listPorts(rig, mixer).filter((p) => p.dir === "out");
    const endpoints = new Map(mix.rig.endpoints.map((e) => [e.deviceId, e]));
    // A routed output (full X32) is named by its jack and what ROUTING sends it: "XLR OUT 11 · MIX 11".
    const routedName = (portId) => {
      const src = state.routing?.[portId];
      if (!src) return null;
      const number = portId.slice(3);
      const model = modelOf(state);
      const type = model === "dm2000" ? "OMNI OUT" : model === "cl3" ? "RIO OUT" : "XLR OUT";
      const left = model === "dm2000" || model === "cl3" ? "ST L" : "MAIN L";
      const right = model === "dm2000" || model === "cl3" ? "ST R" : "MAIN R";
      const signal = ({ "main-l": left, "main-r": right })[src] || terms[src] || src.toUpperCase().replace(/(\d+)$/, " $1");
      return `${type} ${number} · ${signal}`;
    };
    const busName = (portId) => ({ "main-l": "Main L", "main-r": "Main R", "cr-l": "C-R L", "cr-r": "C-R R" })[portId] || terms[portId] || routedName(portId) || portId;
    const boardNames = modelOf(state) !== "generic"; // real mixers' jacks are named as printed on them

    const outRows = outs
      .map((p) => {
        // B207MP3: the speaker is inside the mixer, so there is nothing to patch.
        if (p.internal) return { p, html: `<li class="out-row out-internal"><p class="port-internal"><strong>${esc(translate("ui.builtInSpeakerName", p.name))}</strong>${esc(translate("ui.internalSpeakerDescription", " inside the box: its own amp drives it, no cable."))}</p><p class="port-msg ok">${esc(translate("ui.internalSpeakerStatus", "✓ The mix plays from this box. MAIN LEVEL and the EQ set how loud and how it sounds."))}</p></li>` };
        const reached = mix.rig.buses[p.id] || [];
        const cable = cableAt(rig, p.ref);
        const target = cable ? getPort(rig, cable.to) : null;
        const feeds = target && !DEVICE_TYPES[target.device.type].endpoint && !DEVICE_TYPES[target.device.type].poweramp;
        const note = reached.length
          ? `<p class="port-msg ok">${esc(translate("ui.soundFrom", "✓ Sound from: {devices}", { devices: reached.map((id) => outputDeviceName(rig.devices.find((d) => d.id === id).label)).join(", ") }))}</p>`
          : feeds
            ? `<p class="port-msg ok">${translate("ui.feeds", "→ Feeds {port}", { port: portLabel(rig, cable.to) })}</p>`
            : `<p class="port-msg">${translate("ui.emptyOutput", "No working speaker on this output yet.")}</p>`;
        const label = !boardNames && terms[p.id] ? `${terms[p.id]} out` : p.name;
        return { p, html: `<li class="out-row">${this.portButton(p.ref, "out").replace(esc(p.name), esc(label))}${note}${p.id === "mono" && modelOf(state) === "cr1604" ? `<p class="port-msg">${esc(translate("ui.monoOutputNote", "A mono sum of MAIN L/R. Set its output level with the rear-panel MONO knob."))}</p>` : ""}</li>` };
      });
    // The 1604 has many outputs: the per-channel ones are folded away.
    const perChannel = (r) => /^ch\d+-(direct|insert)$/.test(r.p.id);
    const outList = boardNames
      ? `<ul class="out-list">${outRows.filter((r) => !perChannel(r)).map((r) => r.html).join("")}</ul>
        <details class="out-more"><summary>DIRECT OUTS (1–8) and INSERT sends (1–16)</summary><ul class="out-list">${outRows.filter(perChannel).map((r) => r.html).join("")}</ul></details>`
      : `<ul class="out-list">${outRows.map((r) => r.html).join("")}</ul>`;

    const reverbs = rig.devices.filter((d) => d.type === "reverb");
    const reverbHtml = reverbs
      .map(
        (d) => this.card(d.id, `<li class="device-card" data-device-card="${esc(d.id)}">
        <div class="device-top"><span class="dev-ico">${icon("role-source", { size: 40 })}</span><div class="source-names"><strong>${esc(d.label)}</strong><span>${esc(translate("ui.externalEffectsLoop", "Fed from an aux send, back into an aux return"))}</span></div></div>
        ${listPorts(rig, d).map((p) => this.portButton(p.ref, p.dir)).join("")}
        <div class="dev-settings"><label>DECAY <output data-readout="decay">${d.decay.toFixed(1)} s</output>
          <input type="range" min="${REVERB.decayMin}" max="${REVERB.decayMax}" step="0.1" value="${d.decay}" data-device="${esc(d.id)}" data-device-key="decay" /></label></div>
      </li>`),
      )
      .join("");

    const recorders = rig.devices.filter((d) => DEVICE_TYPES[d.type].recorder);
    const recHtml = recorders
      .map((d) => {
        const rt = this.getRecorder(d.id);
        const card = cardStats(d, rt ? rt.usedBytes : 0);
        const armed = d.tracks.map((t, i) => (t.arm ? i + 1 : 0)).filter(Boolean);
        const state = rt && rt.recording ? translate("ui.recorderRecording", "● Recording") : rt && rt.playing ? translate("ui.recorderPlaying", "▶ Playing") : translate("ui.recorderStopped", "Stopped");
        const cardStatus = translate("ui.recorderCardStatus", "{state} · armed: {armed} · {size} GB card", {
          state, armed: armed.length ? armed.join(", ") : translate("ui.recorderNoArmedTracks", "none"), size: F8.cardGB,
        });
        const timeLeft = Number.isFinite(card.secondsLeft) ? translate("ui.recorderCardTimeLeft", ", {time} left", { time: formatHours(card.secondsLeft) }) : "";
        return this.card(d.id, `<li class="device-card">
          <div class="device-top"><span class="dev-ico">${icon("role-destination", { size: 40 })}</span><div class="source-names"><strong>${esc(d.label)}</strong><span>${esc(cardStatus + timeLeft)}</span></div></div>
          <div class="rec-jacks">${listPorts(rig, d).map((p) => this.portButton(p.ref, p.dir)).join("")}</div>
          <button type="button" class="btn btn-start" data-open-recorder="${esc(d.id)}">${translate("ui.openRecorder", "Open the recorder")}</button>
        </li>`);
      })
      .join("");

    const amps = rig.devices.filter((d) => DEVICE_TYPES[d.type].poweramp);
    const ampHtml = amps
      .map(
        (d) => this.card(d.id, `<li class="device-card">
        <div class="device-top"><span class="dev-ico">${icon(deviceIconName(d), { size: 48 })}</span><div class="source-names"><strong>${esc(translate(`ui.outputDeviceNames.${d.label}`, d.label))}</strong><span class="amp-where">${esc(translate("ui.powerAmpSignalLevels", "Line level in → speaker level out"))}</span></div></div>
        <div class="amp-sides">
          <div class="amp-side amp-in"><p class="amp-side-title">${icon("level-line", { size: 26 })}<span>${esc(translate("ui.powerAmpLineIn", "Line level IN"))} <small>${esc(translate("ui.powerAmpFromMixer", "from the mixer"))}</small></span></p>${listPorts(rig, d)
            .filter((p) => p.dir === "in")
            .map((p) => this.portButton(p.ref, p.dir))
            .join("")}</div>
          <div class="amp-side amp-out"><p class="amp-side-title">${icon("level-speaker", { size: 26 })}<span>${esc(translate("ui.powerAmpSpeakerOut", "Speaker level OUT"))} <small>${esc(translate("ui.powerAmpToPassive", "to passive speakers only"))}</small></span></p>${listPorts(rig, d)
            .filter((p) => p.dir === "out")
            .map((p) => this.portButton(p.ref, p.dir))
            .join("")}</div>
        </div>
        ${micSwitchHtml(d)}
        ${knobsHtml(d)}
        ${powerHtml(rig, d)}
        ${DEVICE_TYPES[d.type].where ? `<p class="source-note">${esc(DEVICE_TYPES[d.type].where)}</p>` : ""}
      </li>`),
      )
      .join("");

    // A small mixer with a console of its own (the hall's Mix5), a rack's power, and the wireless rack's gear.
    const gear = rig.devices.filter((d) => ["console", "decor", "rackPower", "receiver", "rfSplit", "sink"].some((f) => DEVICE_TYPES[d.type][f]) || d.type === "antenna");
    const gearHtml = gear
      .map((d) => {
        const type = DEVICE_TYPES[d.type];
        const blurb = gearTypeText(d.type, "blurb", type.blurb || "");
        const description = (cme || mariachi) && d.label === "IEM transmitters · rack drawer" ? translate("ui.cmeIemNote", blurb) : blurb;
        return this.card(d.id, `<li class="device-card" data-device-card="${esc(d.id)}">
        <div class="device-top"><span class="dev-ico">${icon(deviceIconName(d), { size: 44 })}</span><div class="source-names"><strong>${esc(d.label ? displayDevice(d.label) : gearTypeText(d.type, "name", type.name))}</strong><span>${esc(description)}</span></div></div>
        ${type.receiver ? receiverHtml(rig, d, this.manifest.SOURCES_BY_ID) : ""}
        ${type.console ? "" : knobsHtml(d)}
        ${powerHtml(rig, d)}
        ${listPorts(rig, d).map((p) => this.portButton(p.ref, p.dir)).join("")}
        ${type.console ? `<button type="button" class="btn btn-start" data-open-console="${esc(d.id)}">Open Console: ${esc(type.name.replace(/^Mackie /, ""))}</button>` : ""}
      </li>`);
      })
      .join("");

    const speakers = rig.devices.filter((d) => DEVICE_TYPES[d.type].endpoint);
    const zoneName = { foh: gearText("houseAudience"), stage: translate("ui.stagePerformers", "Stage (performers)") };
    const spkHtml = speakers
      .map((d) => {
        const type = DEVICE_TYPES[d.type];
        const ep = endpoints.get(d.id);
        const status = ep.status === "off" ? "idle" : ep.valid ? (ep.status === "ok" && !ep.cableWarn ? "ok" : "warn") : ep.status === "unpatched" ? "idle" : ep.status === "danger" ? "bad" : "warn";
        const statusText = ep.status === "off" ? `○ ${gearText("turnedDown")}: ${busName(ep.output)}` : ep.valid ? `${ep.cableWarn ? translate("ui.wrongCable", "⚠ Wrong cable") : ep.status === "hot" ? translate("ui.distorting", "⚠ Distorting") : ep.status === "weak" ? translate("ui.tooQuiet", "⚠ Too quiet") : `✓ ${gearText("sound")}`}: ${busName(ep.output)}${ep.viaAmp ? ` ${translate("ui.viaAmp", "via amp")}` : ""}` : ep.status === "unpatched" ? translate("ui.silent", "Silent") : ep.status === "danger" ? translate("ui.danger", "✕ Danger") : `✕ ${gearText("noSound")}`;
        const amp = type.camera ? translate("ui.recordsFed", "Records what it's fed") : type.amp === "internal" ? gearText("ampBuiltIn") : translate("ui.ampNonePassive", "Amp: none inside (passive)");
        const settings = type.camera && d.type === "camera-input"
          ? `<div class="dev-settings"><label>INPUT <output data-readout="inputLevel">${d.inputLevel === 1 ? "LINE" : "MIC"}</output>
              <input type="range" min="0" max="1" step="1" value="${d.inputLevel ?? 0}" data-device="${esc(d.id)}" data-device-key="inputLevel" aria-label="${esc(d.label)} MIC/LINE switch" /></label></div>`
          : "";
        return this.card(d.id, `<li class="device-card status-${status}" data-device-card="${esc(d.id)}">
          <div class="device-top">
            <span class="dev-ico">${icon(deviceIconName(d), { size: 44 })}</span>
            <div class="source-names"><strong>${esc(d.label ? outputDeviceName(d.label) : gearTypeText(d.type, "name", type.name))}</strong><span>${amp}${zoneName[d.zone] ? ` · ${zoneName[d.zone]}` : ""}</span></div>
            <span class="status-pill status-${status}">${statusText}</span>
          </div>
          ${listPorts(rig, d)
            .map((p) => this.portButton(p.ref, p.dir))
            .join("")}
          ${settings}
          ${knobsHtml(d)}
          ${powerHtml(rig, d)}
          ${ep.messages.map((m) => {
            const amp = (vocalJazz || cob) && /^The amp's Input ([AB]) has nothing plugged in\.$/.exec(m);
            const volumeDrop = (recordingGig || cme || mariachi) && /^Turned down: (.+): (4\/5 LEVEL|VOLUME|CH 2 level) is all the way down, so this speaker plays nothing\. The chain to it works\.$/.exec(m);
            const lowered = volumeDrop && (mariachi || volumeDrop[2] !== "CH 2 level") ? volumeDrop : null;
            const off = recordingGig && /^No power: (NX3000 · monitor amp rack) is switched off\.$/.exec(m);
            const quiet = cme && /^Very quiet: (.+): (CH [AB] level) is at (.+) \(([-+−\d.]+) dB\)\.$/.exec(m);
            const text = amp ? translate("ui.vocalJazzAmpInputEmpty", m, { channel: amp[1] })
              : lowered ? translate("ui.vjrHallTurnedDown", m, { device: lowered[1], control: lowered[2] })
              : off ? translate("ui.vjrAmpOff", m, { device: off[1] })
              : quiet ? translate("ui.cmeOutputQuiet", m, { device: quiet[1], control: quiet[2], value: quiet[3], db: quiet[4] })
              : (cme || mariachi) && m === "Everything on the way is plugged into the right jack, but nothing gets through. What's left is a cable itself."
                ? translate("ui.cmeCableFault", m) : advanced || cob ? cmeAdvancedWarning(m) : connectionMessage(m);
            return `<p class="port-msg">${esc(text)}</p>`;
          }).join("")}
        </li>`);
      })
      .join("");

    this.cards.set(mixer.id, outList);
    this.outputsRoot.innerHTML = `
      <h3 class="group-title">${icon("role-source", { size: 22 })}${translate("ui.mixerOutputs", "Mixer outputs")} <small>${translate("ui.outputLineLevel", "line level")} · ${translate("ui.outputSection", "amps, speakers, recorders")}</small></h3>
      ${outList}
      ${reverbs.length ? `<h3 class="group-title">${esc(translate("ui.externalEffects", "Effects"))}</h3><ul class="device-list">${reverbHtml}</ul>` : ""}
      ${recorders.length ? `<h3 class="group-title">${translate("ui.recorderHeading", "Recorder")}</h3><ul class="device-list">${recHtml}</ul>` : ""}
      ${amps.length ? `<h3 class="group-title">Amplifier</h3><ul class="device-list">${ampHtml}</ul>` : ""}
      ${gear.length ? `<h3 class="group-title">Rack gear</h3><ul class="device-list">${gearHtml}</ul>` : ""}
      <h3 class="group-title">${icon("role-destination", { size: 22 })}${speakers.every((d) => DEVICE_TYPES[d.type].camera) ? translate("ui.cameraLevelHeading", "Camera — does the level match?") : translate("ui.speakersWhereAmp", "Speakers — where is the amplifier?")}</h3>
      <ul class="device-list">${spkHtml}</ul>`;
  }
}

// A knob's position and what it does, as its readout prints it: "7 · −6 dB".
function knobText(pos, unity) {
  const db = knobDb(pos, unity);
  return `${pos} · ${db === -Infinity ? "off" : Math.abs(db) < 0.5 ? "0 dB" : `${db > 0 ? "+" : "−"}${Math.abs(db).toFixed(0)} dB`}`;
}
const knobInput = (d, key, label, pos, unity) => `<label>${esc(label)} <output data-readout="${esc(key)}">${knobText(pos, unity)}</output>
  <input type="range" min="0" max="10" step="0.5" value="${pos}" data-device="${esc(d.id)}" data-device-key="${esc(key)}" aria-label="${esc(d.label || DEVICE_TYPES[d.type].name)}: ${esc(label)}" /></label>`;

// The knobs on an amp, a rack's mixer or an active wedge (DEVICE_TYPES `knobs`).
function knobsHtml(d) {
  const knobs = DEVICE_TYPES[d.type].knobs;
  if (!knobs) return "";
  return `<div class="dev-settings" data-device-card="${esc(d.id)}">${knobs
    .map((k) =>
      k.select
        ? `<label>${esc(k.label)} <select data-device="${esc(d.id)}" data-device-key="${esc(k.key)}" aria-label="${esc(d.label || DEVICE_TYPES[d.type].name)}: ${esc(k.label)}">${k.select.map((t, i) => `<option value="${i}"${knobPos(d, k) === i ? " selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`
        : knobInput(d, k.key, k.label, knobPos(d, k), k.unity),
    )
    .join("")}</div>`;
}

// Its power: the cable and the switch, separately, and whether it has power
// (the same two controls as the tab on its box in the diagram).
export const POWER_TEXT = { on: "On", off: "Switched off", unplugged: "Unplugged", "no-power": "No power reaching it" };
function powerHtml(rig, d) {
  const spec = powerSpec(d);
  if (!spec) return "";
  const st = powerState(rig, d);
  const name = esc(displayDevice(d.label || DEVICE_TYPES[d.type].name));
  const sel = (key, label, opts) => `<label>${esc(label)} <select data-device="${esc(d.id)}" data-device-key="${key}" aria-label="${name}: ${esc(label)}">${opts.map((t, i) => `<option value="${i}"${(d[key] ?? 1) === i ? " selected" : ""}>${t}</option>`).join("")}</select></label>`;
  return `<div class="dev-settings power-row pwr-${st}" data-device-card="${esc(d.id)}">
    ${sel("plugged", spec.gear ? `${spec.gear}: power cable` : spec.plug ? spec.plug[0].toUpperCase() + spec.plug.slice(1) : gearText("powerCable"), [translate("ui.unplugged", "Unplugged"), gearText("pluggedIn")])}
    ${spec.noSwitch ? "" : sel("on", gearText("powerSwitch"), [gearText("powerOff"), "On"])}
    <p class="power-state"><span class="pwr-dot" aria-hidden="true"></span>${st === "on" ? gearText("powerOn") : esc(powerWhy(rig, d))}</p>
  </div>`;
}

// A radio handheld's way in: no cable, its receiver channel at FOH and the input that one plugs into.
function rfLine(rig, d) {
  const rx = rig.devices.find((x) => DEVICE_TYPES[x.type].receiver && Object.values(x.pairs || {}).includes(d.sourceId));
  const port = rx && Object.keys(rx.pairs).find((k) => rx.pairs[k] === d.sourceId);
  const into = port && rig.cables.find((c) => c.from === `${rx.id}/${port}`);
  return `<p class="source-note">No cable: by radio to ${rx ? `${esc(rx.label)}, CH ${port.slice(3)}` : "no receiver"}${into ? `, whose AF OUT is in ${esc(into.to.replace("mixer/", "the console's ").replace(/ch(\d+)-mic/, "LOCAL $1"))}` : ""}.</p>`;
}

// A receiver's channels: which mic each is paired with, and what its display shows.
function receiverHtml(rig, d, sources) {
  const rows = Array.from({ length: DEVICE_TYPES[d.type].channels }, (_, i) => {
    const ch = receiverChannel(rig, d, i + 1);
    const tx = ch.sourceId && rig.devices.find((x) => x.sourceId === ch.sourceId);
    const txOn = !!tx && (tx.mic || 0) !== 2 && !tx.dead;
    const status = !ch.on ? "off" : !(ch.a || ch.b) ? "no antenna" : !ch.sourceId ? "no mic paired" : tx?.dead ? "no signal (the mic is dead)" : !txOn ? "no signal (the mic is off)" : tx.mic ? "signal ✓ · audio — (muted at the mic)" : "signal ✓ · audio ✓";
    const one = ch.on && ch.sourceId && ch.a !== ch.b ? " · one antenna only" : "";
    return `<li><strong>CH ${i + 1}</strong> ${esc(ch.sourceId ? sources[ch.sourceId]?.name || ch.sourceId : "—")} · ${status}${one}</li>`;
  });
  return `<ul class="rx-status">${rows.join("")}</ul>`;
}

// What a source's own gear lets you do: a wireless handheld's one button, or
// the volume knob on the amp or instrument in front of its mic or DI.
function sourceGearHtml(d, src, rig, localizeHandheld, mariachi) {
  if (d.type === "wireless-handheld" || d.type === "rf-handheld") {
    // A dead handheld (`dead`: it won't switch on, whatever its button does): set it aside.
    if (d.dead) {
      const english = "It won't switch on, with a fresh battery or without. Set it aside, tag it, and give the player a spare.";
      return `<div class="dev-settings mic-button" data-device-card="${esc(d.id)}">
      <p class="mic-display"><strong>Mic: DEAD</strong> · Receiver: no signal</p>
      <p class="source-note">${esc(mariachi ? translate("ui.mariachiDeadMic", english) : english)}</p>
    </div>`;
    }
    const st = d.mic || 0;
    // A radio handheld's receiver channel says what it really gets: power, antennas, then the mic.
    const rxDev = d.type === "rf-handheld" && rig?.devices.find((x) => DEVICE_TYPES[x.type].receiver && Object.values(x.pairs || {}).includes(d.sourceId));
    const port = rxDev && Object.keys(rxDev.pairs).find((k) => rxDev.pairs[k] === d.sourceId);
    const ch = port && receiverChannel(rig, rxDev, Number(port.slice(3)));
    const rx = ch && !ch.on ? "Receiver: off (no power)" : ch && !(ch.a || ch.b) ? "Receiver: no antenna signal" : ["Receiver: signal ✓ · audio ✓", "Receiver: signal ✓ · audio —", "Receiver: no signal"][st];
    const instruction = (key, english) => localizeHandheld ? translate(`ui.${key}`, english) : english;
    return `<div class="dev-settings mic-button" data-device-card="${esc(d.id)}">
      <p class="mic-display"><strong>Mic: ${MIC_STATES[st]}</strong> · ${rx}</p>
      <div class="mic-press"><button type="button" class="btn" data-device="${esc(d.id)}" data-mic-press="tap">${instruction("vocalJazzMicTap", "Tap the button")}</button><button type="button" class="btn" data-device="${esc(d.id)}" data-mic-press="hold">${instruction("vocalJazzMicHold", "Press and hold")}</button></div>
      <p class="source-note">${instruction("vocalJazzMicUse", "One button: a tap mutes or unmutes it, press and hold switches it on or off.")}</p>
    </div>`;
  }
  const k = src.volumeKnob;
  return k ? `<div class="dev-settings" data-device-card="${esc(d.id)}">${knobInput(d, "vol", k.label, d.vol ?? k.start, k.unity)}</div>` : "";
}

// A line mixer's Line / Mic button in front of an amp (BH 109's rack: the Ashly's Ch.1).
function micSwitchHtml(d) {
  const sw = DEVICE_TYPES[d.type].micSwitch;
  if (!sw) return "";
  const on = d[sw.key] === 1;
  return `<div class="dev-settings"><label>Ashly Ch.1 <select data-device="${esc(d.id)}" data-device-key="${sw.key}" aria-label="${esc(d.label)}: Ashly Ch.1 Line / Mic button"><option value="0"${on ? "" : " selected"}>LINE</option><option value="1"${on ? " selected" : ""}>MIC (+${sw.gainDb} dB)</option></select></label></div>`;
}

// ---------- the patch dialog ----------

class PatchDialog {
  constructor(view) {
    this.view = view;
    this.el = document.createElement("dialog");
    this.el.className = "patch-dialog";
    this.el.setAttribute("aria-labelledby", "patch-title");
    document.body.appendChild(this.el);
    this.el.addEventListener("click", (e) => {
      if (e.target === this.el) return this.el.close();
      const act = e.target.closest("[data-act]");
      if (!act) return;
      const a = act.dataset.act;
      if (a === "close") this.el.close();
      else if (a === "unplug") this.unplug(act.dataset.cable);
      else if (a === "cable") this.chooseCable(act.dataset.cable);
      else if (a === "back") this.showCables();
      else if (a === "target") this.connect(act.dataset.ref);
      else if (a === "pair-cable") {
        this.cable = act.dataset.cable;
        this.connect(this.pair);
      }
    });
    // Hovering or focusing an option shows it in the picture above the list.
    const preview = (e) => {
      const card = e.target.closest?.("[data-cable]");
      if (card && card.closest(".cable-grid")) this.showCableArt(card.dataset.cable);
      const target = e.target.closest?.(".target-btn[data-ref]");
      if (target) this.showTargetArt(target.dataset.ref);
    };
    this.el.addEventListener("mouseover", preview);
    this.el.addEventListener("focusin", preview);
  }

  get rig() {
    return this.view.store.state.rig;
  }

  open(ref) {
    this.ref = ref;
    this.cable = null;
    const existing = cableAt(this.rig, ref);
    if (existing) this.showExisting(existing);
    else this.showCables();
    if (!this.el.open) this.el.showModal();
  }

  // The picture over the options: this jack (left), the cable (middle), and
  // the socket it goes into (right). Shaded drawings from connector-art.js.
  visual({ cable = null, target = null } = {}) {
    const p = getPort(this.rig, this.ref);
    const dev = p.device.label || DEVICE_TYPES[p.device.type].name;
    return `<div class="pv">
      <figure class="pv-end pv-from">${jackArt(p.jack, p.dir)}<figcaption><small>${p.parallel || p.dir === "out" ? "From" : "Into"}</small> ${esc(isMixer(p.device) ? "Mixer" : dev)} · ${esc(p.name)}</figcaption></figure>
      <div class="pv-cable">${this.cableArt(cable)}</div>
      <figure class="pv-end pv-to">${this.targetArt(target)}</figure>
    </div>`;
  }

  cableArt(cableId) {
    if (!cableId) return `<p class="pv-hint">${translate("ui.cableHint", "Pick a cable: the end that fits this jack is on the left, the other end on the right.")}</p>`;
    const p = getPort(this.rig, this.ref);
    const c = CABLES[cableId];
    const ends = cableEndFor(cableId, p.jack);
    if (!ends) return "";
    const farDir = p.dir === "out" ? "in" : "out";
    const speaker = c.kind === "speaker";
    return `<div class="pv-plugs"><span class="pv-near">${plugArt(ends.near, { into: p.dir, speaker, text: false })}</span><span class="pv-wire pv-wire-${c.kind}"></span><span class="pv-far">${plugArt(ends.far, { into: farDir, speaker })}</span></div>
      <p class="pv-name"><strong>${esc(cableText(cableId, "name", c.name))}</strong> <span>${esc(PLUGS[ends.near].name)} ⟷ ${esc(PLUGS[ends.far].name)}</span></p>`;
  }

  targetArt(ref) {
    if (!ref) return `<div class="pv-unknown" aria-hidden="true">?</div><figcaption><small>To</small> …</figcaption>`;
    const q = getPort(this.rig, ref);
    return `${jackArt(q.jack, q.dir)}<figcaption><small>${q.parallel || q.dir === "in" ? "To" : "From"}</small> ${esc(portLabel(this.rig, ref))}</figcaption>`;
  }

  showCableArt(cableId) {
    const box = this.el.querySelector(".pv-cable");
    if (box && box.dataset.shown !== cableId) {
      box.dataset.shown = cableId;
      box.innerHTML = this.cableArt(cableId);
    }
  }

  showTargetArt(ref) {
    const box = this.el.querySelector(".pv-to");
    if (box && box.dataset.shown !== ref) {
      box.dataset.shown = ref;
      box.innerHTML = this.targetArt(ref);
    }
  }

  // Dragged from one jack to another: pick a cable that fits both (or just plug it in if only one does).
  openBetween(aRef, bRef) {
    const a = getPort(this.rig, aRef);
    const b = getPort(this.rig, bRef);
    if (!a || !b) return;
    const ends = orient(this.rig, aRef, bRef);
    if (!ends) return this.view.toast(translate("ui.bothSameDirection", `Both are ${a.dir === "out" ? "outputs" : "inputs"}. A cable runs from an output to an input.`, { direction: a.dir === "out" ? "outputs" : "inputs" }), "bad");
    const [from, to] = ends;
    const fits = Object.values(CABLES).filter((c) => checkConnection(this.rig, from, to, c.id).ok);
    if (!fits.length) {
      const why = Object.values(CABLES).map((c) => checkConnection(this.rig, from, to, c.id)).find((r) => !/doesn't fit/.test(r.reason || ""));
      return this.view.toast(why ? connectionReason(why.reason) : translate("ui.noCableFits", `No cable in the lab fits both the ${JACKS[getPort(this.rig, from).jack].name} and the ${JACKS[getPort(this.rig, to).jack].name} jack.`, { from: JACKS[getPort(this.rig, from).jack].name, to: JACKS[getPort(this.rig, to).jack].name }), "bad");
    }
    this.ref = aRef;
    if (fits.length === 1) {
      this.cable = fits[0].id;
      return this.connect(bRef);
    }
    this.cable = null;
    this.pair = bRef;
    const card = (c) => {
      const ends = cableEndFor(c.id, a.jack);
      return `<button type="button" class="cable-card" data-act="pair-cable" data-cable="${c.id}">
        <span class="cable-art"><span class="ca-near">${icon(plugIconName(ends.near, a.dir), { size: 26 })}</span>${icon(c.kind === "speaker" ? "cable-speaker" : c.kind === "network" ? "cable-network" : "cable-signal", { size: 24 })}<span class="ca-far">${plugArt(ends.far, { into: b.dir, speaker: c.kind === "speaker" })}</span></span>
        <strong>${esc(cableText(c.id, "name", c.name))}</strong>${c.kind === "speaker" ? `<span class="cable-kind">${translate("ui.speakerCableOnly", "Speaker cable: speaker level only")}</span>` : ""}<span class="cable-plugs">${esc(PLUGS[ends.near].name)} ⟷ ${esc(PLUGS[ends.far].name)}</span><span class="cable-blurb">${esc(cableText(c.id, "blurb", c.blurb))}</span>
      </button>`;
    };
    this.el.innerHTML = `<div class="patch-inner">
      ${this.header(translate("ui.pickCable", "Pick a cable"))}
      ${this.visual({ target: bRef })}
      <p class="patch-sub">${translate("ui.toTarget", `To ${portLabel(this.rig, bRef)}. ${count(fits.length, "cable")} fit both ends; they don't all do the same job.`, { target: portLabel(this.rig, bRef), count: count(fits.length, "cable") })}</p>
      <div class="cable-grid">${fits.map(card).join("")}</div>
    </div>`;
    if (!this.el.open) this.el.showModal();
    this.el.querySelector(".cable-card").focus();
  }

  header(step) {
    const p = getPort(this.rig, this.ref);
    const lvl = SIGNAL_LEVELS[p.level];
    return `<header class="patch-head">
      <p class="patch-kicker">${step}</p>
      <h2 id="patch-title">${esc(portLabel(this.rig, this.ref))}</h2>
      <p class="patch-sub">${icon(jackIconName(p.jack, p.dir), { size: 28 })}${p.parallel ? translate("ui.eitherWay", "Either way (wired in parallel)") : p.dir === "out" ? translate("ui.output", "Output") : translate("ui.input", "Input")} · ${esc(JACKS[p.jack].name)} jack · ${esc(gearText(lvl ? lvl.name : LEVEL_SHORT[p.level] || p.level))}</p>
      <button type="button" class="patch-x" data-act="close" aria-label="Close">✕</button>
    </header>`;
  }

  showExisting(cable) {
    const other = cable.from === this.ref ? cable.to : cable.from;
    this.el.innerHTML = `<div class="patch-inner">
      ${this.header(translate("ui.connected", "Connected"))}
      <p class="patch-current"><span class="cable-dot" style="--hue:${cableHue(cable.id)}" aria-hidden="true"></span>
        ${esc(cableText(cable.cable, "name", CABLES[cable.cable].name))} to <strong>${esc(portLabel(this.rig, other))}</strong></p>
      ${cable.fixed ? `<p class="port-msg">Wired into a permanent rack: this cable stays where it is.</p>` : ""}
      <div class="patch-actions">
        ${cable.fixed ? "" : `<button type="button" class="btn btn-stop" data-act="unplug" data-cable="${esc(cable.id)}">${translate("ui.unplug", "Unplug")}</button>`}
        <button type="button" class="btn btn-start" data-act="close">${cable.fixed ? "OK" : translate("ui.keepIt", "Keep it")}</button>
      </div>
    </div>`;
    this.el.querySelector('[data-act="unplug"], [data-act="close"]').focus();
  }

  showCables() {
    const p = getPort(this.rig, this.ref);
    const fits = cablesForPort(p);
    const nofit = Object.values(CABLES).filter((c) => !fits.includes(c));
    const card = (c) => {
      const ends = cableEndFor(c.id, p.jack);
      const plugs = ends ? `${PLUGS[ends.near].name} ⟷ ${PLUGS[ends.far].name}` : `${PLUGS[c.ends[0]].name} ⟷ ${PLUGS[c.ends[1]].name}`;
      const near = ends ? ends.near : c.ends[0];
      const far = ends ? ends.far : c.ends[1];
      const farDir = p.dir === "out" ? "in" : "out";
      // The end that goes into this jack is the same on every fitting cable: greyed. The far end is what you're choosing.
      const pair = `<span class="cable-art"><span class="ca-near">${icon(plugIconName(near, p.dir), { size: 26 })}</span>${icon(c.kind === "speaker" ? "cable-speaker" : c.kind === "network" ? "cable-network" : "cable-signal", { size: 24 })}<span class="ca-far">${plugArt(far, { into: farDir, speaker: c.kind === "speaker" })}</span></span>`;
      return `<button type="button" class="cable-card" data-act="cable" data-cable="${c.id}">
        ${pair}<strong>${esc(cableText(c.id, "name", c.name))}</strong>${c.kind === "speaker" ? `<span class="cable-kind">${translate("ui.speakerCableOnly", "Speaker cable: speaker level only")}</span>` : ""}<span class="cable-plugs">${esc(plugs)}</span><span class="cable-blurb">${esc(cableText(c.id, "blurb", c.blurb))}</span>
      </button>`;
    };
    this.el.innerHTML = `<div class="patch-inner">
      ${this.header(translate("ui.step1", "Step 1 of 2 · Pick a cable"))}
      ${this.visual()}
      <div class="cable-grid">${fits.map(card).join("")}</div>
      <details class="nofit"><summary>${translate("ui.noFit", `Cables that don't fit this ${JACKS[p.jack].name} jack (${nofit.length})`, { jack: JACKS[p.jack].name, count: nofit.length })}</summary>
        <ul>${nofit.map((c) => `<li><strong>${esc(cableText(c.id, "name", c.name))}</strong> — ${esc(PLUGS[c.ends[0]].name)} ⟷ ${esc(PLUGS[c.ends[1]].name)}</li>`).join("")}</ul>
      </details>
    </div>`;
    const first = this.el.querySelector(".cable-card");
    if (first) first.focus();
  }

  chooseCable(cableId) {
    this.cable = cableId;
    const rig = this.rig;
    const p = getPort(rig, this.ref);
    const ends = cableEndFor(cableId, p.jack);
    const groups = [];
    for (const d of rig.devices) {
      if (d.id === p.device.id) continue;
      const ports = listPorts(rig, d).filter((q) => orient(rig, this.ref, q.ref) && plugFitsJack(ends.far, q.jack));
      if (!ports.length) continue;
      const items = ports.map((q) => {
        const [from, to] = orient(rig, this.ref, q.ref);
        const check = checkConnection(rig, from, to, cableId);
        const busy = cableAt(rig, q.ref);
        const why = check.ok ? "" : busy ? translate("ui.inUse", `In use → ${portLabel(rig, busy.from === q.ref ? busy.to : busy.from)}`, { port: portLabel(rig, busy.from === q.ref ? busy.to : busy.from) }) : connectionReason(check.reason);
        const lvl = SIGNAL_LEVELS[q.level];
        const ji = jackIconName(q.jack, q.dir);
        return `<button type="button" class="target-btn" data-act="target" data-ref="${esc(q.ref)}" ${check.ok ? "" : "disabled"}>
          ${ji ? `<span class="port-ico">${icon(ji, { size: 26 })}</span>` : ""}<span>${esc(q.name)}</span><small>${esc(lvl ? lvl.name : LEVEL_SHORT[q.level] || "")}${why ? ` · ${esc(why)}` : ""}</small>
        </button>`;
      });
      groups.push(`<div class="target-group"><h3>${icon(deviceIconName(d), { size: 26 })}${esc(d.label || DEVICE_TYPES[d.type].name)}</h3>${items.join("")}</div>`);
    }
    this.el.innerHTML = `<div class="patch-inner">
      ${this.header(translate("ui.step2", `Step 2 of 2 · Plug in the ${PLUGS[ends.far].name} end`, { end: PLUGS[ends.far].name }))}
      ${this.visual({ cable: cableId })}
      <p class="patch-sub">${translate("ui.using", `Using: ${CABLES[cableId].name}`, { cable: CABLES[cableId].name })} <button type="button" class="linkish" data-act="back">${translate("ui.changeCable", "change cable")}</button></p>
      ${groups.length ? groups.join("") : `<p class="patch-empty">${translate("ui.nothingTakes", `Nothing here takes a ${PLUGS[ends.far].name} plug.`, { plug: PLUGS[ends.far].name })}</p>`}
    </div>`;
    const first = this.el.querySelector(".target-btn:not([disabled])");
    if (first) first.focus();
  }

  connect(targetRef) {
    const [from, to] = orient(this.rig, this.ref, targetRef) || [this.ref, targetRef];
    const result = this.view.store.connect(from, to, this.cable);
      if (!result.ok) {
      this.view.toast(connectionReason(result.reason), "bad");
      return;
    }
    this.el.close();
    this.view.toast(translate("ui.patchSuccess", `Patched: ${portLabel(this.rig, from)} → ${portLabel(this.rig, to)}`, { from: portLabel(this.rig, from), to: portLabel(this.rig, to) }), "ok");
  }

  unplug(cableId) {
    this.view.store.disconnect(cableId);
    this.el.close();
    this.view.toast(translate("ui.unplugged", "Unplugged."), "");
  }
}

function techniqueText(d) {
  const t = techniqueOf(d);
  if (t) return inputText("pairTechnique", "✓ This is <strong>{name}</strong> ({spacing} cm, {angle}°).", { name: esc(t.name), spacing: t.spacingCm, angle: t.angleDeg });
  const techniques = TECHNIQUES.map((x) => `${esc(x.name)} ${x.spacingCm} cm / ${x.angleDeg}°`).join(" · ");
  return inputText("pairCustom", "Custom setting. For reference: {techniques}.", { techniques });
}

function formatHours(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h} h ${String(m).padStart(2, "0")} min`;
}

function compactFoot(state, empty) {
  const free = empty.filter((n) => !/TAPE|2TR/.test(n));
  const channels = free.length ? free.map((n) => `Ch ${n}`).join(", ") : "none";
  return `${inputText("compactFreeChannels", "Free channels: {channels}.", { channels })} ${free.length ? "" : `${inputText("compactFull", "This mixer is full: the rest of the band stays unplugged.")} `}${inputText("tapChannelInput", "Tap a channel's name on the Mixer to see its jacks; use one input per channel.")}`;
}

function cr1604Foot(empty) {
  const free = empty.filter((n) => n !== "TAPE");
  const channels = free.length ? free.map((n) => `Ch ${n}`).join(", ") : "none";
  return inputText("cr1604Footer", "Free channels: {channels}. Every channel has its own MIC jack (XLR → mic preamp, +48 V from the rear PHANTOM switch) and LINE jack (¼″, padded 20 dB); use one per channel. TAPE INPUT is a stereo RCA pair for a laptop or player.", { channels });
}

// Collapsed reference of every connector in the lab. Pictures only: what fits what
// is decided by the connection model.
function connectorGuide() {
  return `<details class="conn-guide"><summary>${translate("ui.connectorGuide", "Connector guide")}</summary>
    <ul>${CONNECTOR_GUIDE.map(([name, title, text]) => `<li>${icon(name, { size: 40 })}<span><strong>${esc(connectorText(name, "title", title))}</strong> ${esc(connectorText(name, "description", text))}</span></li>`).join("")}</ul>
    <p class="conn-guide-note">${icon("cable-signal", { size: 26 })}<span>${translate("ui.signalCable", "Signal cable: thin.")}</span>${icon("cable-speaker", { size: 26 })}<span>${translate("ui.speakerCable", "Speaker cable: heavy, double line.")}</span>${icon("cable-power", { size: 26 })}<span>${translate("ui.powerCable", "Power cable: dashed, with prongs.")}</span></p>
  </details>`;
}
