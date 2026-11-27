// The signal-flow explainer, drawn with the current skin's words. Makes the
// V1 conventions visible: Aux 1 is pre-fader, PFL is pre-fader, and the
// enable (MUTE/ON) switch only affects the Main path.

import { COMPACT } from "../compact-defs.js";
import { t as translate } from "../i18n/index.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const flowText = (key, fallback, vars) => translate(`ui.${key}`, fallback, vars);
const flowSummary = (skin) => flowText("signalFlowOn", `How the signal flows on ${skin.name}`, { skin: skin.name });
const flowModelText = (skin, field, fallback, vars = {}) => {
  const modelId = skin.id === "x32c" ? "x32" : skin.id;
  return translate(`ui.flowModels.${modelId}.${field}`, fallback, vars);
};

export function syncFlowLanguage(root, skin) {
  const previous = root.querySelector("details");
  const bodyScroll = previous?.querySelector(".flow-body")?.scrollTop ?? 0;
  const hadFocus = previous?.querySelector("summary") === root.ownerDocument.activeElement;
  renderFlow(root, skin);
  const details = root.querySelector("details");
  details.open = previous?.open ?? false;
  details.querySelector(".flow-body").scrollTop = bodyScroll;
  if (hadFocus) details.querySelector("summary").focus({ preventScroll: true });
}

export function renderFlow(root, skin) {
  if (skin.layout === "cr1604") return renderFlow1604(root, skin);
  if (skin.layout === "compact") return renderFlowCompact(root, skin, COMPACT[skin.hardware]);
  if (skin.layout === "digital") return renderFlowDigital(root, skin, COMPACT[skin.hardware]);
  if (skin.layout === "x32") return skin.id === "gdig" ? renderFlowGdig(root, skin) : renderFlowX32(root, skin);
  if (skin.layout === "01v96") return renderFlow01v96(root, skin);
  if (skin.layout === "cl") return renderFlowCL(root, skin);
  if (skin.layout === "dm2000") return renderFlowDM2000(root, skin);
  if (skin.layout === "f8") return renderFlowF8(root, skin);
  if (skin.layout === "l20") return renderFlowL20(root, skin);
  const t = skin.terms;
  const c = skin.enabledControl;
  const enableWord = c.litWhenEnabled
    ? flowText("flowLitInMain", "{label} (lit = in Main)", { label: c.label })
    : flowText("flowLitOutOfMain", "{label} (lit = out of Main)", { label: c.label });
  root.innerHTML = `
    <details class="flow">
      <summary>${esc(translate("ui.signalFlowOn", `How the signal flows on ${skin.name}`, { skin: skin.name }))}</summary>
      <div class="flow-body">
        <ol class="flow-trunk" aria-label="${esc(flowText("everyChannel", "Every channel"))}">
          <li class="flow-node">${esc(flowText("source", "Source"))}</li>
          <li class="flow-node">${esc(t.gain)} <small>${esc(translate("ui.preamp", "preamp"))}</small></li>
          <li class="flow-node">${esc(flowText("meter", "Meter"))}</li>
          <li class="flow-split">${esc(flowText("splitFour", "splits four ways"))}</li>
        </ol>
        <div class="flow-branches">
          <ol class="flow-branch branch-main" aria-label="${esc(translate("ui.mainPath", "Main path"))}">
            <li class="flow-node">${esc(enableWord)}</li>
            <li class="flow-node">${esc(t.levelShort)}</li>
            <li class="flow-node">${esc(t.pan)}</li>
            <li class="flow-node">${esc(flowText("mainBus", "Main L/R bus"))} → ${esc(t.mainShort)} ${esc(flowText("master", "master"))}</li>
            <li class="flow-node flow-end">${esc(flowText("houseSpeakers", "House speakers"))}</li>
          </ol>
          <ol class="flow-branch branch-aux" aria-label="${esc(translate("ui.monitorPath1", "Monitor path 1"))}">
            <li class="flow-node">${esc(t.aux1)} ${esc(flowText("send", "send"))} <small>${esc(flowText("preFader", "pre-fader"))}</small></li>
            <li class="flow-node">${esc(t.aux1)} ${esc(flowText("bus", "bus"))} → ${esc(t.aux1Master)}</li>
            <li class="flow-node flow-end">${esc(flowText("wedge", "A wedge"))}</li>
          </ol>
          <ol class="flow-branch branch-aux" aria-label="${esc(translate("ui.monitorPath2", "Monitor path 2"))}">
            <li class="flow-node">${esc(t.aux2)} ${esc(flowText("send", "send"))} <small>${esc(flowText("preFader", "pre-fader"))}</small></li>
            <li class="flow-node">${esc(t.aux2)} ${esc(flowText("bus", "bus"))} → ${esc(t.aux2Master)}</li>
            <li class="flow-node flow-end">${esc(translate("ui.anotherWedge", "Another wedge (e.g. the drummer's)"))}</li>
          </ol>
          <ol class="flow-branch branch-pfl" aria-label="${esc(translate("ui.headphonePath", "Headphone path"))}">
            <li class="flow-node">${esc(t.pfl)} <small>${esc(translate("ui.preFader", "pre-fader"))}</small></li>
            <li class="flow-node">${esc(t.phones)} ${esc(flowText("level", "level"))}</li>
            <li class="flow-node flow-end">${esc(flowText("engineerHeadphones", "Engineer's headphones"))}</li>
          </ol>
        </div>
        <ul class="flow-notes">
          <li>${esc(translate("ui.genericNoteGain", "changes everything after it: meter, Main, {aux1} and {aux2} and PFL.", { aux1: t.aux1, aux2: t.aux2 }))}</li>
          <li>${esc(translate("ui.genericNoteLevel", "The {level} and {enable} only change the Main (audience) path. In this lab the {aux1} and {aux2} sends and PFL are taken before them, so a muted channel can still be in the wedges. Real mixers vary — check yours.", { level: t.levelShort, enable: c.label, aux1: t.aux1, aux2: t.aux2 }))}</li>
          <li>${esc(translate("ui.genericNoteBus", "Each monitor bus is its own mix: the same channel can be loud in one wedge and quiet in the other."))}</li>
          <li>${esc(translate("ui.genericNoteOutput", "The mixer's outputs are line level. A speaker only makes sound if an amplifier is somewhere in the chain: inside it (powered) or in front of it (passive + power amp)."))}</li>
        </ul>
      </div>
    </details>`;
}

// The CR1604-VLZ, after its owner's manual. Unlike the generic mixer, AUX 1
// and 2 are post-fader unless PRE is pressed, and SOLO has two modes.
function renderFlow1604(root, skin) {
  root.innerHTML = `
    <details class="flow">
      <summary>${esc(flowSummary(skin))}</summary>
      <div class="flow-body">
        <ol class="flow-trunk" aria-label="${esc(flowText("everyChannel", "Every channel"))}">
          <li class="flow-node">${flowModelText(skin, "node1", "MIC or LINE jack")}</li>
          <li class="flow-node">${flowModelText(skin, "node2", "TRIM <small>preamp</small>")}</li>
          <li class="flow-node">${flowModelText(skin, "node3", "LOW CUT")}</li>
          <li class="flow-node">${flowModelText(skin, "node4", "EQ <small>HI · MID · LOW</small>")}</li>
          <li class="flow-node">${flowModelText(skin, "node5", "MUTE")}</li>
          <li class="flow-node">${flowModelText(skin, "node6", "Fader")}</li>
          <li class="flow-node">${flowModelText(skin, "node7", "PAN")}</li>
          <li class="flow-split">${flowModelText(skin, "node8", "assign: L-R, 1-2, 3-4")}</li>
        </ol>
        <div class="flow-branches">
          <ol class="flow-branch branch-main" aria-label="${esc(flowText("mainPath", "Main path"))}">
            <li class="flow-node">L-R</li>
            <li class="flow-node">${flowModelText(skin, "branch1", "MAIN L-R MIX fader")}</li>
            <li class="flow-node flow-end">${flowModelText(skin, "branch2", "MAIN OUTS (and MONO)")}</li>
          </ol>
          <ol class="flow-branch branch-aux" aria-label="${esc(flowText("flowSubgroups", "Subgroups"))}">
            <li class="flow-node">${flowModelText(skin, "branch3", "1-2 or 3-4 <small>odd = left, even = right</small>")}</li>
            <li class="flow-node">${flowModelText(skin, "branch4", "SUB faders")}</li>
            <li class="flow-node flow-end">${flowModelText(skin, "branch5", "SUB OUTS, or back into MAIN with ASSIGN TO MAIN MIX")}</li>
          </ol>
          <ol class="flow-branch branch-aux" aria-label="${esc(flowText("flowAuxSends", "Aux sends"))}">
            <li class="flow-node">${flowModelText(skin, "branch6", "AUX 1, 2 <small>post, or PRE: after LOW CUT, before EQ, MUTE and fader</small>")}</li>
            <li class="flow-node">${flowModelText(skin, "branch7", "AUX 3/4 <small>always post; 5/6 SHIFT moves them to 5/6</small>")}</li>
            <li class="flow-node flow-end">${flowModelText(skin, "branch8", "AUX SEND outs (masters on 1 and 2 only)")}</li>
          </ol>
          <ol class="flow-branch branch-pfl" aria-label="${esc(flowText("headphonePathLabel", "Headphone path"))}">
            <li class="flow-node">SOURCE: MAIN MIX, SUBS, TAPE</li>
            <li class="flow-node">${flowModelText(skin, "branch9", "SOLO replaces it <small>LEVEL SET (PFL): before the fader · NORMAL (AFL): after fader and pan</small>")}</li>
            <li class="flow-node flow-end">${flowModelText(skin, "branch10", "C-R/PHONES knob → C-R OUTS, PHONES")}</li>
          </ol>
        </div>
        <ul class="flow-notes">
          <li>${flowModelText(skin, "note1", "<strong>TRIM</strong> changes everything after it. Set it with SOLO in LEVEL SET (PFL) mode while watching the meters: soloed, the channel shows on the left meter.")}</li>
          <li>${flowModelText(skin, "note2", "<strong>MUTE</strong> cuts L-R, the subgroups and the post sends. PRE sends and LEVEL SET (PFL) solo keep working, so a muted channel can still be in a wedge.")}</li>
          <li>${flowModelText(skin, "note3", "For stage monitors use AUX 1 or 2 with <strong>PRE</strong> down: the wedge mix then ignores the fader. Effects sends stay post, so the reverb follows the fader.")}</li>
          <li>${flowModelText(skin, "note4", "A channel only reaches the house if <strong>L-R</strong> is pressed (or it goes through a subgroup that is assigned to the main mix).")}</li>
          <li>${flowModelText(skin, "note5", "The outputs are line level. A speaker only makes sound if an amplifier is somewhere in the chain: inside it (powered) or in front of it (passive + power amp).")}</li>
        </ul>
      </div>
    </details>`;
}

// A digital mixer (Ui16): the same signal flow, reached through pages and SEL.
function renderFlowDigital(root, skin, def) {
  root.innerHTML = `
    <details class="flow">
      <summary>${esc(flowSummary(skin))}</summary>
      <div class="flow-body">
        <ol class="flow-trunk" aria-label="${esc(flowText("everyChannel", "Every channel"))}">
          <li class="flow-node">${esc(flowText("inputJack", "Input jack"))}</li>
          <li class="flow-node">GAIN</li>
          <li class="flow-node">HPF</li>
          <li class="flow-node">COMP</li>
          <li class="flow-node">EQ</li>
          <li class="flow-node">MUTE</li>
          <li class="flow-node">FADER</li>
          <li class="flow-node">PAN</li>
          <li class="flow-node flow-end">MASTER → XLR OUT</li>
        </ol>
        <ul class="flow-notes">
          <li>${flowModelText(skin, "noChannelKnobs", "There are no knobs per channel. <strong>SEL</strong> a channel and its GAIN, HPF, EQ, compressor, pan and sends all show in one panel.")}</li>
          <li>${flowModelText(skin, "faderBar", "The bar above the faders picks <strong>what the faders control</strong>: MIX (each channel into the MASTER), GAIN, or a mix such as <strong>AUX 1</strong>, where each fader is that channel's send into AUX 1 (\"sends on faders\"). The right-hand fader is always that mix's master.")}</li>
          <li>${flowModelText(skin, "auxPre", "Aux sends start <strong>PRE</strong> (they ignore the MIX faders, right for wedges). Press PRE to make a send POST, so it follows the fader.")}</li>
          <li>${flowModelText(skin, "muteMix", "<strong>MUTE</strong> takes a channel out of every mix, wedges included.")}</li>
          <li>${flowModelText(skin, "effects", "REVERB, DELAY and CHORUS are built in: their pages set the sends, their master is how much comes back into the MASTER mix.")}</li>
          <li>${flowModelText(skin, "outputs", "The outputs are line level on XLR: {auxCount} AUX outs and MASTER L/R. A speaker only makes sound if an amplifier is somewhere in the chain.", { auxCount: Object.values(def.buses).filter((b) => !b.fx).length })}</li>
        </ul>
      </div>
    </details>`;
}

// The L-20: a digital mixer that is operated like an analog one.
function renderFlowL20(root, skin) {
  root.innerHTML = `
    <details class="flow">
      <summary>${esc(flowSummary(skin))}</summary>
      <div class="flow-body">
        <ol class="flow-trunk" aria-label="${esc(flowText("everyChannel", "Every channel"))}">
          <li class="flow-node">${flowModelText(skin, "node1", "Input jack")}</li>
          <li class="flow-node">${flowModelText(skin, "node2", "GAIN <small>PAD / Hi-Z</small>")}</li>
          <li class="flow-node">${flowModelText(skin, "node3", "COMP")}</li>
          <li class="flow-node">${flowModelText(skin, "node4", "LOW CUT")}</li>
          <li class="flow-node">${flowModelText(skin, "node5", "EQ")}</li>
          <li class="flow-node">${flowModelText(skin, "node6", "MUTE")}</li>
          <li class="flow-node">${flowModelText(skin, "node7", "FADER <small>one per mix</small>")}</li>
          <li class="flow-node">${flowModelText(skin, "node8", "PAN")}</li>
          <li class="flow-node flow-end">${flowModelText(skin, "node9", "MASTER or MONITOR A–F")}</li>
        </ol>
        <ul class="flow-notes">
          <li>${flowModelText(skin, "note1", "<strong>FADER MODE</strong> picks which mix the faders control: MASTER, or one of six monitor mixes. Each channel has its own fader position in each mix, so MONITOR A can have the singer loud and the MASTER can have her quiet.")}</li>
          <li>${flowModelText(skin, "note2", "The channel's <strong>MUTE</strong> comes before all of those faders: a muted channel is silent in the MASTER and in every monitor mix.")}</li>
          <li>${flowModelText(skin, "note3", "<strong>SEND EFX 1 / 2</strong> take the signal after the MASTER fader. Each effect comes back through an <strong>EFX RTN</strong> fader that has its own position in every mix.")}</li>
          <li>${flowModelText(skin, "note4", "<strong>EQ OFF</strong> bypasses HIGH, MID, LOW and LOW CUT. The EQ is on until you press it.")}</li>
          <li>${flowModelText(skin, "note5", "Each <strong>MONITOR OUT</strong> jack carries its own mix (A to F) or, with its switch on MASTER, a copy of the MASTER mix. Its knob is the jack's volume.")}</li>
          <li>${flowModelText(skin, "note6", "The outputs are line level (balanced). A speaker only makes sound if an amplifier is somewhere in the chain.")}</li>
        </ul>
      </div>
    </details>`;
}

// The 01V96: the same flow, reached through LAYER, FADER MODE and display pages.
function renderFlow01v96(root, skin) {
  root.innerHTML = `
    <details class="flow">
      <summary>${esc(flowSummary(skin))}</summary>
      <div class="flow-body">
        <ol class="flow-trunk" aria-label="${esc(flowText("everyChannel", "Every channel"))}">
          <li class="flow-node">${flowModelText(skin, "node1", "INPUT (A XLR / B TRS)")}</li>
          <li class="flow-node">${flowModelText(skin, "node2", "PAD · GAIN")}</li>
          <li class="flow-node">${flowModelText(skin, "node3", "Ø · EQ · COMP")}</li>
          <li class="flow-node">${flowModelText(skin, "node4", "ON")}</li>
          <li class="flow-node">${flowModelText(skin, "node5", "FADER")}</li>
          <li class="flow-node">${flowModelText(skin, "node6", "PAN · TO ST")}</li>
          <li class="flow-node flow-end">${flowModelText(skin, "node7", "STEREO → STEREO OUT")}</li>
        </ol>
        <ul class="flow-notes">
          <li>${flowModelText(skin, "note1", "The analog part is still on top: <strong>GAIN</strong> knobs for inputs 1–16, a 20 dB <strong>PAD</strong> on 1–12 (for line-level sources), and <strong>+48V</strong> on the rear panel in groups of four.")}</li>
          <li>${flowModelText(skin, "note2", "<strong>ON</strong> is lit while a channel is on: the opposite of a MUTE key.")}</li>
          <li>${flowModelText(skin, "note3", "<strong>SEL</strong> a channel: the SELECTED CHANNEL knobs (PAN, one EQ band at a time) and the display act on it. The <strong>DISPLAY ACCESS</strong> keys choose the display page: ROUTING, EQ, DYNAMICS, AUX…")}</li>
          <li>${flowModelText(skin, "note4", "<strong>FADER MODE AUX 1–8</strong> turns the 16 faders into that aux's sends; HOME turns them back into channel levels. The <strong>MASTER</strong> layer shows the aux masters.")}</li>
          <li>${flowModelText(skin, "note5", "Each send is PRE or POST (AUX page). <strong>PRE POINT</strong> (AUX SETUP) decides whether a channel switched OFF still feeds its pre-fader sends (PRE ON) or not (POST ON).")}</li>
          <li>${flowModelText(skin, "note6", "AUX 1–4 come out of OMNI OUT 1–4; AUX 7 and 8 feed the effects, which come back on <strong>ST IN</strong> 1 and 2.")}</li>
        </ul>
      </div>
    </details>`;
}

// The X32: the same signal flow, plus DCAs and mute groups that act on channels.
function renderFlowF8(root, skin) {
  root.innerHTML = `
    <details class="flow">
      <summary>${esc(flowSummary(skin))}</summary>
      <div class="flow-body">
        <ol class="flow-trunk" aria-label="${esc(flowText("everyTrack", "Every track"))}">
          <li class="flow-node">${flowModelText(skin, "node1", "INPUT (XLR mic / TRS line)")}</li>
          <li class="flow-node">${flowModelText(skin, "node2", "TRIM, +48V")}</li>
          <li class="flow-node">${flowModelText(skin, "node3", "HPF · Ø")}</li>
          <li class="flow-node">${flowModelText(skin, "node4", "TRACK (recorded here: the iso)")}</li>
          <li class="flow-node">${flowModelText(skin, "node5", "Track knob (fader)")}</li>
          <li class="flow-node">${flowModelText(skin, "node6", "PAN")}</li>
          <li class="flow-node flow-end">${flowModelText(skin, "node7", "L/R mix → MAIN OUT 1/2 · SUB OUT · recorded L/R")}</li>
        </ol>
        <ul class="flow-notes">
          <li>${flowModelText(skin, "note1", "Each <strong>track records</strong> its input after TRIM, before the track knob. Set TRIM for the recording; the knobs only build the mix.")}</li>
          <li>${flowModelText(skin, "note2", "A dark <strong>track key</strong> means that input is off: not recorded, not in the mix.")}</li>
          <li>${flowModelText(skin, "note3", "<strong>MAIN OUT 1/2</strong> carry the L/R mix, or any tracks prefader or postfader (OUTPUT, MAIN OUT Routing). Output Level: LINE (+4) or NORMAL (−10).")}</li>
          <li>${flowModelText(skin, "note4", "<strong>SUB OUT</strong> (3.5 mm) carries the L/R mix at NORMAL or MIC level, for a camera's mic jack.")}</li>
          <li>${flowModelText(skin, "note5", "Beside a FOH desk the F8n is a <strong>submixer</strong>: its own mix for the cameras, its own recording of every input.")}</li>
        </ul>
      </div>
    </details>`;
}

function renderFlowDM2000(root, skin) {
  root.innerHTML = `
    <details class="flow">
      <summary>${esc(flowSummary(skin))}</summary>
      <div class="flow-body">
        <ol class="flow-trunk" aria-label="${esc(flowText("everyChannel", "Every channel"))}">
          <li class="flow-node">${flowModelText(skin, "node1", "INPUT (GAIN, PAD, +48V)")}</li>
          <li class="flow-node">${flowModelText(skin, "node2", "Ø")}</li>
          <li class="flow-node">${flowModelText(skin, "node3", "EQ (EQ ON)")}</li>
          <li class="flow-node">${flowModelText(skin, "node4", "COMP (COMP ON)")}</li>
          <li class="flow-node">${flowModelText(skin, "node5", "ON key")}</li>
          <li class="flow-node">${flowModelText(skin, "node6", "FADER")}</li>
          <li class="flow-node">${flowModelText(skin, "node7", "PAN · ROUTING")}</li>
          <li class="flow-node flow-end">${flowModelText(skin, "node8", "STEREO → STEREO OUT · BUS 1–8 → BUS TO ST")}</li>
        </ol>
        <ul class="flow-notes">
          <li>${flowModelText(skin, "note1", "<strong>SEL</strong> a channel: the whole SELECTED CHANNEL section (EQ, dynamics, aux sends, pan, routing) and the display follow it.")}</li>
          <li>${flowModelText(skin, "note2", "<strong>ROUTING</strong> keys send the channel to <strong>STEREO</strong> and/or <strong>BUS 1–8</strong>. A bus reaches the house only through <strong>BUS TO ST</strong> (the ROUTING display page): a subgroup.")}</li>
          <li>${flowModelText(skin, "note3", "The <strong>encoder</strong> above each fader is PAN or an AUX send (ENCODER MODE). <strong>FADER MODE</strong> AUX turns the faders into that aux's sends.")}</li>
          <li>${flowModelText(skin, "note4", "<strong>AUX 1–6</strong> reach the stage only through the <strong>OUTPUT PATCH</strong> (OMNI OUT 1–8). AUX 7 and 8 feed the effects, back on channels 73–76.")}</li>
          <li>${flowModelText(skin, "note5", "<strong>Fader groups</strong> (A–H): move one fader, the others follow. <strong>Mute groups</strong> (I–P): press one ON key, the others follow. No masters, unlike DCAs.")}</li>
          <li>${flowModelText(skin, "note6", "Layers: 1-24 (the analog inputs), 73-96 (effects returns and 2TR IN), MASTER (BUS, AUX, MATRIX masters).")}</li>
        </ul>
      </div>
    </details>`;
}

function renderFlowCL(root, skin) {
  root.innerHTML = `
    <details class="flow">
      <summary>${esc(flowSummary(skin))}</summary>
      <div class="flow-body">
        <ol class="flow-trunk" aria-label="${esc(flowText("everyChannel", "Every channel"))}">
          <li class="flow-node">${flowModelText(skin, "node1", "Mic → Rio IN (HA GAIN, +48V)")}</li>
          <li class="flow-node">${flowModelText(skin, "node2", "Dante → channel")}</li>
          <li class="flow-node">${flowModelText(skin, "node3", "HPF")}</li>
          <li class="flow-node">${flowModelText(skin, "node4", "DYNAMICS (ON)")}</li>
          <li class="flow-node">${flowModelText(skin, "node5", "EQ (ON)")}</li>
          <li class="flow-node">${flowModelText(skin, "node6", "ON key")}</li>
          <li class="flow-node">${flowModelText(skin, "node7", "FADER (+ DCA)")}</li>
          <li class="flow-node">${flowModelText(skin, "node8", "PAN · ST/MONO")}</li>
          <li class="flow-node flow-end">${flowModelText(skin, "node9", "STEREO → OUTPUT PATCH → Rio OUT 15/16")}</li>
        </ol>
        <ul class="flow-notes">
          <li>${flowModelText(skin, "note1", "The mics plug into the <strong>Rio</strong> stage box; its preamps (GAIN, +48V) are set from the console. Rio IN 1 feeds channel 1, and so on.")}</li>
          <li>${flowModelText(skin, "note2", "<strong>SEL</strong> a channel: the SELECTED CHANNEL knobs (left of the screen) and the screen's <strong>SELECTED CHANNEL VIEW</strong> edit it. <strong>OVERVIEW</strong> shows the eight Centralogic channels side by side.")}</li>
          <li>${flowModelText(skin, "note3", "The <strong>EQ</strong> and the compressor (<strong>DYNAMICS</strong>) each have an ON button. Their knobs move even while they're off, so check the curves.")}</li>
          <li>${flowModelText(skin, "note4", "<strong>ON</strong> keys are lit when the channel is on. Off cuts the channel from the STEREO bus and every MIX, pre-fader sends too.")}</li>
          <li>${flowModelText(skin, "note5", "<strong>Centralogic</strong>'s Bank Select keys put any eight channels, DCAs, MIX masters or matrices on the faders under the screen.")}</li>
          <li>${flowModelText(skin, "note6", "<strong>SENDS ON FADER</strong>: SEL a MIX and the faders become each channel's send to it. MIX 13–16 feed the effects rack, which returns on ST IN 2–5.")}</li>
          <li>${flowModelText(skin, "note7", "Nothing leaves the Rio outputs until the <strong>OUTPUT PATCH</strong> puts a bus on them. A <strong>MATRIX</strong> mixes STEREO and the MIX buses for lobbies and fills.")}</li>
        </ul>
      </div>
    </details>`;
}

function renderFlowX32(root, skin) {
  root.innerHTML = `
    <details class="flow">
      <summary>${esc(flowSummary(skin))}</summary>
      <div class="flow-body">
        <ol class="flow-trunk" aria-label="${esc(flowText("everyChannel", "Every channel"))}">
          <li class="flow-node">${esc(flowText("flowXlrInput", "XLR input"))}</li>
          <li class="flow-node">GAIN</li>
          <li class="flow-node">LOW CUT</li>
          <li class="flow-node">DYN</li>
          <li class="flow-node">EQ</li>
          <li class="flow-node">MUTE</li>
          <li class="flow-node">FADER (+ DCA)</li>
          <li class="flow-node">PAN · MAIN LR</li>
          <li class="flow-node flow-end">MAIN LR → XLR OUT 7/8</li>
        </ol>
        <ul class="flow-notes">
          <li>${flowModelText(skin, "note1", "<strong>SEL</strong> a channel: the channel strip on the left edits its GAIN, 48V, LOW CUT, EQ, compressor, pan, MAIN LR and sends.")}</li>
          <li>${flowModelText(skin, "note2", "The input faders show one <strong>layer</strong> at a time: CH 1-8, CH 9-16, AUX/FX. The right-hand faders show DCA 1-8 or BUS 1-8 (the MIX masters).")}</li>
          <li>${flowModelText(skin, "note3", "<strong>MIX 1–6</strong> are buses (wedges, recorders); XLR OUT 1–6 carry them. Each channel's send to each MIX is PRE or POST.")}</li>
          <li>${flowModelText(skin, "note4", "<strong>SENDS ON FADERS</strong>: SEL a MIX and the input faders become sends to it; SEL a channel and the BUS faders become its sends.")}</li>
          <li>${flowModelText(skin, "note5", "A <strong>DCA</strong> sums nothing: its fader just moves its channels' faders (and their post-fader sends). A muted DCA, or an active <strong>mute group</strong>, mutes its channels.")}</li>
          <li>${flowModelText(skin, "note6", "<strong>MAIN LR</strong> off keeps a channel out of the house but still in its sends. <strong>MUTE</strong> takes it out of everything, wedges included.")}</li>
        </ul>
      </div>
    </details>`;
}

// The generic digital mixer: what every digital desk shares, in no brand's words.
function renderFlowGdig(root, skin) {
  root.innerHTML = `
    <details class="flow">
      <summary>${esc(flowSummary(skin))}</summary>
      <div class="flow-body">
        <ol class="flow-trunk" aria-label="${esc(flowText("everyChannel", "Every channel"))}">
          <li class="flow-node">${esc(flowText("flowXlrInput", "XLR input"))}</li>
          <li class="flow-node">GAIN</li>
          <li class="flow-node">LOW CUT</li>
          <li class="flow-node">COMP</li>
          <li class="flow-node">EQ</li>
          <li class="flow-node">MUTE</li>
          <li class="flow-node">FADER</li>
          <li class="flow-node">PAN · TO MAIN</li>
          <li class="flow-node flow-end">MAIN → XLR OUT 5/6</li>
        </ol>
        <ul class="flow-notes">
          <li>${flowModelText(skin, "note1", "<strong>SEL</strong> a channel: the channel strip on the left edits its GAIN, 48V, LOW CUT, EQ, compressor, pan, TO MAIN and sends. There are no knobs on the channels themselves.")}</li>
          <li>${flowModelText(skin, "note2", "The input faders show one <strong>layer</strong> at a time: CH 1-8, CH 9-16, AUX / FX. The right-hand faders are the MIX masters and the MAIN fader.")}</li>
          <li>${flowModelText(skin, "note3", "<strong>MIX 1–4</strong> are buses for wedges; XLR OUT 1–4 carry them. Each channel's send to each MIX is PRE or POST.")}</li>
          <li>${flowModelText(skin, "note4", "<strong>SENDS ON FADERS</strong>: SEL a MIX and the input faders become sends to it; SEL a channel and the MIX faders become its sends.")}</li>
          <li>${flowModelText(skin, "note5", "<strong>EQ ON</strong> and <strong>COMP ON</strong> must be pressed before the knobs do anything. The curves show what is switched in.")}</li>
          <li>${flowModelText(skin, "note6", "<strong>TO MAIN</strong> off keeps a channel out of the house but still in its sends. <strong>MUTE</strong> takes it out of everything, wedges included.")}</li>
        </ul>
      </div>
    </details>`;
}

// A compact mixer, described from its definition: what each send hears.
function renderFlowCompact(root, skin, def) {
  const sendKey = (label) => ({ AUX: "sendAux", AUX1: "sendAux1", AUX2: "sendAux2", "AUX 1": "sendAux1", FX: "sendFx" }[label]);
  const tapWord = {
    pre: flowText("compactPre", "before the channel LEVEL (pre-fader)"),
    post: flowText("compactPost", "after the channel LEVEL (post-fader)"),
    switch: flowText("compactSwitch", "pre- or post-fader, by the PRE switch beside its master"),
    channel: flowText("compactChannel", "pre- or post-fader, by the PRE switch on each channel (post-fader, MUTE/ALT 3-4 cuts it too)"),
    fader: flowText("compactFader", "after the channel fader, but MUTE/ALT 3-4 doesn't cut it"),
  };
  const sends = Object.values(def.sends).map((s) =>
    sendKey(s.label) && flowModelText(skin, sendKey(s.label), "")
      ? `<li>${flowModelText(skin, sendKey(s.label), "")}</li>`
      :
    s.bipolar
      ? `<li><strong>${esc(s.label)}</strong>: ${flowText("flowBipolarSend", "one knob. Left of centre feeds {left} ({leftTap}); right feeds {right} ({rightTap}). A channel can feed one or the other, not both.", { left: esc(def.buses[s.bipolar.left.bus].label), leftTap: tapWord[s.bipolar.left.tap], right: esc(def.buses[s.bipolar.right.bus].label), rightTap: tapWord[s.bipolar.right.tap] })}</li>`
      : `<li><strong>${esc(s.label)}</strong>${flowText("flowSendTap", " is taken {tap}.", { tap: tapWord[s.tap] })}${s.bus === "reverb" ? ` ${flowText("compactReverb", "It feeds the built-in reverb.")}` : def.fx && s.bus === def.fx.send ? ` ${flowText("compactEffects", "Through its master (AUX SEND 2) it feeds the built-in effects, which come back on STEREO AUX RETURN 2.")}` : ""}</li>`,
  );
  const notes = [
    def.field ? "" : def.channels.some((c) => c.gain.switch) ? `<li>${flowText("noGain", "There is no gain knob: the MIC/LINE switch sets the input gain, and each channel LEVEL does the rest.")}</li>` : `<li>${flowText("gainLevel", "GAIN/TRIM sets how hot the signal is; the channel LEVEL sets how much goes to the mix.")}</li>`,
    ...sends,
    def.channels.some((c) => c.comp) ? flowText("compactComp", "<li><strong>COMP</strong> is a one-knob compressor: turn it up and loud peaks are pulled down (the LED lights while it works) and quiet parts come up.</li>") : "",
    def.channels.some((c) => c.gain.minus10) ? flowText("compactStereo", "<li>The stereo channels have a <strong>+4 dBu / −10 dBV</strong> switch: −10 is 12 dB more sensitive, for consumer gear such as a laptop or phone.</li>") : "",
    def.returns?.some((r) => r.toMonitor) ? `<li>${flowModelText(skin, "returnMon", "<strong>RETURN 1 MON</strong> puts an effects return into AUX 1, so the singer can have reverb in the wedge.")}</li>` : "",
    def.alt?.fader
      ? flowText("compactAltMix", "<li><strong>MUTE/ALT 3-4</strong> takes a channel out of MAIN MIX and puts it on the ALT 3-4 bus, with its own fader and outputs (and the C-R SOURCE ALT 3-4).</li>")
      : def.alt
        ? flowText("compactAlt", "<li><strong>MUTE/ALT 3-4</strong> takes a channel out of MAIN and puts it on the ALT 3-4 bus (its own outputs, or back into MAIN with ASSIGN TO MAIN).</li>")
        : "",
    def.solo?.mode === "switch"
      ? flowText("compactSoloSwitch", "<li><strong>SOLO</strong> puts a channel in the PHONES/CTRL R and the meters: with <strong>MODE</strong> on PFL, before the fader (for setting TRIM); otherwise in place, after the fader and pan. The AUX SEND masters have SOLO switches too, to check a monitor mix.</li>")
      : def.solo
        ? flowText("compactSolo", "<li><strong>SOLO</strong> is PFL: the channel before its LEVEL, in the C-R/PHONES and the meters.</li>")
        : "",
    def.monitorOut ? `<li>${flowText("monitorWholeMix", "MONITOR OUT carries the whole mix (no per-channel monitor sends) and ignores MASTER LEVEL.")}</li>` : "",
    def.field ? flowText("compactTwoGain", "<li>Two gain stages: <strong>GAIN</strong> (+22…+60 dB, MIC/LINE takes 40 dB off) is set once, then you mix on the <strong>FADER</strong>, whose centre is 0 dB (it goes up to +15).</li>") : "",
    def.channels.some((c) => c.hpf) ? flowText("compactHpf", "<li><strong>HPF</strong> sweeps from 80 to 240 Hz (off at the detent): wind, rumble, and a close mic's boom.</li>") : "",
    def.outputLimiter ? flowText("compactLim", "<li><strong>LIM</strong> turns on a safety limiter on every input and on the outputs: ON limits left and right apart, LINK as one stereo pair. The LEDs show it working; if they light a lot, turn the GAIN or faders down.</li>") : "",
    def.link ? flowText("compactLink", "<li><strong>1+2 LINK</strong> makes channels 1 and 2 one stereo pair: channel 1's fader runs both, its PAN becomes a balance, and 1 goes left, 2 right. <strong>Ø</strong> flips channel 2's polarity: listen in <strong>M</strong> (mono) to hear what that does to a pair.</li>") : "",
    def.outLevel ? flowText("compactOut", "<li>The XLR outputs carry <strong>MIC, −10 or LINE</strong> level. The camera's input switch must match: line into a MIC input distorts; mic into a LINE input is 40 dB too quiet.</li>") : "",
    def.tone ? flowText("compactTone", "<li><strong>TONE</strong> puts a 1 kHz sine at 0 dBu on the outputs (instead of the mix) to line up the next device's meters; the headphones get it 20 dB down.</li>") : "",
    def.poweredAmp ? `<li>${translate(`ui.flowModels.${skin.id}.poweredAmpNote`, "The amplifier is inside the mixer: SPEAKERS L/R carry speaker level, straight into the passive STAGEPAS speakers. Never into a powered speaker or a line input.")}</li>` : def.outLevel ? "" : `<li>${flowText("compactOutput", "The outputs are line level. A speaker only makes sound if an amplifier is somewhere in the chain: inside it (powered) or in front of it (passive + power amp).")}</li>`,
  ];
  root.innerHTML = `
    <details class="flow">
      <summary>${esc(flowSummary(skin))}</summary>
      <div class="flow-body">
        <ol class="flow-trunk" aria-label="${esc(flowText("everyChannel", "Every channel"))}">
          <li class="flow-node">${esc(flowModelText(skin, "node1", flowText("inputJack", "Input jack")))}</li>
          <li class="flow-node">${flowModelText(skin, "node2", def.channels.some((c) => c.gain.switch) ? "MIC/LINE" : "GAIN")}</li>
          ${def.channels.some((c) => c.hpf) ? `<li class="flow-node">${flowModelText(skin, "node3", "HPF")}</li><li class="flow-node">${flowModelText(skin, "node4", "LIMITER")}</li>` : `<li class="flow-node">${flowModelText(skin, "node3", "EQ")}</li>`}
          <li class="flow-node">${flowModelText(skin, "node5", def.levelLaw || def.layout.level === "fader" ? "FADER" : "LEVEL")}</li>
          <li class="flow-node">${flowModelText(skin, "node6", def.channels.some((c) => c.kind === "stereo") ? "PAN / BAL" : "PAN")}</li>
          <li class="flow-node flow-end">${esc(flowModelText(skin, "node7", `${def.main.label} → ${def.poweredAmp ? flowText("flowAmpSpeakers", "amp → speakers") : def.outLevel ? flowText("xlrOut", "XLR OUT (MIC/−10/LINE)") : "MAIN OUT"}`))}</li>
        </ol>
        <ul class="flow-notes">${notes.join("")}</ul>
      </div>
    </details>`;
}
