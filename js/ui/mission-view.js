// The scenario UI. Three ways in, side by side in the top bar:
//   by topic   (js/themes.js THEMES, shown as "Topics"): one idea, practised on
//              the generic mixer and then on real consoles; the scenario picks the console.
//   by mixer   (MIXERS): the desk in front of you, and its scenarios in order.
//   Chapman gigs (GIGS): one real MUS 248 gig's rig, band and faults (opened like a topic).
//   free play  any console, no goals.
// Views:
//   StartScreen   the first screen: Continue, the Canvas assignment, Free play,
//                 a topic (led by its question) or a mixer. Every card also starts the audio.
//   MissionView   the strip over the rig: where you are · step · console, the title,
//                 the story, the goal, the live checklist, hints, Solved → Next.
//                 When it scrolls away, a slim copy stays pinned under the top bar.
//   ThemeDrawer   Topics, Mixers or Chapman gigs, each with its scenarios and progress.
// Success is decided by js/scenarios.js from state; this only shows it.

import { fillTerms, shortTitle } from "../scenarios.js";
import { SKINS } from "../mixer-models.js";
import { CANVAS_SCENARIOS, GIGS, MIXERS, THEMES, consoleOf, mixerScenarios, skinOf, themeOf, themeScenarios } from "../themes.js";
import { legacyHref } from "../deploy-context.js";
import { count } from "../submission.js";
import { nameMode } from "../names.js";
import {
  conditionText,
  scenarioText,
  language,
  LANGUAGES,
  sourceText,
  t as translate,
} from "../i18n/index.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const skinName = (id, fallback = "") => {
  const name = SKINS[id]?.name || fallback;
  if (id === "analog") return translate("ui.genericAnalogMixer", name);
  if (id === "gdig") return translate("ui.genericDigitalMixer", name);
  return name;
};
const consoleName = (s) => skinName(skinOf(consoleOf(s)));
// The console a scenario id runs on (null for Free play or an unknown id).
const SCENARIO_CONSOLE = (id) => {
  const s = [...CANVAS_SCENARIOS, ...MIXERS.flatMap((m) => mixerScenarios(m.model))].find((x) => x.id === id);
  return s ? consoleOf(s) : null;
};
const listOf = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
// "An 8-bar loop" (or 6, FTW's): from a section's "a–b" bars label.
const barsLoop = (section) => {
  const [a, b] = section.bars.split(/[–-]/).map(Number);
  return b > a ? `${b - a + 1 === 8 ? "An" : "A"} ${b - a + 1}-bar loop` : "A loop";
};
// "bars 5–12", or a section with no bar numbers by name ("the intro": rubato, before the beat).
const barsText = (section) => (/\d/.test(section.bars) ? `bars ${section.bars}` : `the ${section.bars}`);
const sectionLabel = (section) => LANGUAGES[language()].ui.musicSections?.[section.label] ?? section.label;
const sectionBars = (section) => /\d/.test(section.bars)
  ? translate("ui.musicBars", barsText(section), { bars: section.bars })
  : translate("ui.musicSection", barsText(section), { bars: translate(`ui.musicBarNames.${section.bars}`, section.bars) });
const clock = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
const titleOf = (s) => scenarioText(s, "title", s.title);
const displayShortTitle = (s) => {
  const english = shortTitle(s);
  if (language() !== "ja") return english;
  const translated = scenarioText(s, "shortTitle", english);
  return translated !== english ? translated : titleOf(s);
};
const textOf = (s, field) => scenarioText(s, field, s[field]);
function conditionDetail(detail) {
  const counts = /^(\d+) of (\d+)$/.exec(detail);
  if (counts) return translate("ui.missionCountDetail", detail, { count: counts[1], total: counts[2] });
  const broken = /^(\d+) broken$/.exec(detail);
  if (broken) return translate("ui.missionBrokenDetail", detail, { count: broken[1] });
  return LANGUAGES[language()].ui.missionDetails?.[detail] ?? detail;
}
const progressText = (done, total) => done ? translate("ui.progressSolved", `${done} of ${total} solved`, { done, total }) : translate("ui.scenarioCount", count(total, "scenario"), { count: total });
const solvedProgress = (done, total) => translate("ui.progressSolved", "{done} of {total} solved", { done, total });
const compactProgress = (done, total) => translate("ui.compactProgress", "{done}/{total}", { done, total });
const solvedStatus = () => translate("ui.solvedStatus", "solved");
const topicText = (theme, field) => {
  if (!theme) return "";
  const key = GIGS.includes(theme)
    ? `ui.gigs.${theme.id}.${field}`
    : `ui.topic${theme.id[0].toUpperCase()}${theme.id.slice(1)}${field[0].toUpperCase()}${field.slice(1)}`;
  return translate(key, theme[field]);
};

// The consoles Free play offers, in learning order (the generic one first).
export const FREE_CONSOLES = ["analog", "b207mp3", "mix8", "stagepas400bt", "mg102", "vlz1202", "x1204usb", "mackie1604", "gdig", "ui16", "l20", "x32c", "yam01v96", "dm2000", "x32", "cl3", "sd442", "f8n"].filter((id) => SKINS[id]);

function themeProgress(t, progress) {
  const list = themeScenarios(t);
  return { done: list.filter((s) => progress.has(s.id)).length, total: list.length };
}

function mixerProgress(m, progress) {
  const list = mixerScenarios(m.model);
  return { done: list.filter((s) => progress.has(s.id)).length, total: list.length };
}

const mixerName = (m) => skinName(m.skin, m.model);
const mixerDescription = (m) => translate(`ui.mixerDescriptions.${m.model}`, m.why);

// A mixer card: its name, what makes it different (to get curious about), progress.
function mixerCard(m, p, attrs) {
  const { done, total } = mixerProgress(m, p);
  return `<button type="button" class="theme-card mixer-card" ${attrs}>
    <strong>${esc(mixerName(m))}</strong>
    <span class="theme-q">${esc(mixerDescription(m))}</span>
    <span class="theme-meter" aria-label="${esc(solvedProgress(done, total))}"><i style="width:${(100 * done) / total}%"></i></span>
    <small>${progressText(done, total)}</small>
  </button>`;
}

// A Chapman gig's card: its question, the gig and venue, progress. A planned
// gig (`soon`) shows, but can't be opened yet.
function gigCard(g, p, attrs) {
  if (g.soon) {
    return `<div class="theme-card gig-card gig-soon" aria-disabled="true">
      <strong>${esc(topicText(g, "title"))}</strong>
      <span class="theme-q">${esc(topicText(g, "concept"))}</span>
      <small>${translate("ui.comingLater", "Coming later")}</small>
    </div>`;
  }
  const { done, total } = themeProgress(g, p);
  return `<button type="button" class="theme-card gig-card" ${attrs}>
    <strong>${esc(topicText(g, "question"))}</strong>
    <span class="theme-q">${esc(topicText(g, "title"))} · ${esc(consoleName(themeScenarios(g)[0]))}</span>
    <span class="theme-meter" aria-label="${esc(solvedProgress(done, total))}"><i style="width:${(100 * done) / total}%"></i></span>
    <small>${progressText(done, total)}</small>
  </button>`;
}

// ---------- the first screen ----------

export class StartScreen {
  constructor(root, { progress, onChoose }) {
    this.root = root;
    this.progress = progress;
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-choose]");
      if (b) onChoose(b.dataset.choose);
    });
  }

  render({ resume } = {}) {
    const p = this.progress;
    const solved = (id) => p.has(id);
    // A topic leads with its question: something to wonder about, not a chapter title.
    const card = (t, i) => {
      const { done, total } = themeProgress(t, p);
      return `<button type="button" class="theme-card topic-card" data-choose="theme:${t.id}">
        <span class="theme-num">${i + 1}</span>
        <strong>${esc(topicText(t, "question"))}</strong>
        <span class="theme-q">${esc(topicText(t, "title"))}</span>
        <span class="theme-meter" aria-label="${esc(solvedProgress(done, total))}"><i style="width:${(100 * done) / total}%"></i></span>
        <small>${esc(progressText(done, total))}</small>
      </button>`;
    };
    this.root.innerHTML = `<div class="start-inner">
      <p class="start-overlay-kicker">Mixer Lab · MUS 248</p>
      <button type="button" class="chip" data-language-toggle aria-label="${language() === "ja" ? "Switch to English" : "日本語に切り替え"}" title="${language() === "ja" ? "Switch to English" : "日本語に切り替え"}">${language() === "ja" ? "日本語" : "English"}</button>
      <h1>${translate("ui.startQuestion", "What do you want to work on?")}</h1>
      <p class="start-overlay-sub">${translate("ui.startDescription", "Pick a question you want answered, or the mixer in front of you. Headphones recommended; on iPhone turn off Silent Mode.")}</p>
      <div class="start-top">
        ${resume ? `<button type="button" class="start-big start-resume" data-choose="resume"><strong>▶ ${translate("ui.continue", "Continue")}</strong><span>${esc(resume)}</span></button>` : ""}
        <button type="button" class="start-big start-free" data-choose="free"><strong>${translate("ui.freePlay", "Free play")}</strong><span>${translate("ui.freePlayDescription", "No goals: any console, the whole band, break things")}</span></button>
      </div>
      <p class="start-legacy">${translate("ui.legacyAssignmentIntro", "Late with Assignment 1 (the ten scenarios)? ")}<a href="${legacyHref()}">${translate("ui.legacyAssignmentLink", "Finish it in the original version")}</a>${translate("ui.legacyAssignmentProgress", ": your saved progress is there too.")}</p>
      <p class="start-legacy">${translate("ui.progressSaveNotice", "Your progress is saved in this browser only.")} ${translate("ui.switchingDevices", "Switching devices?")} <button type="button" class="linkish" data-open-canvas>${translate("ui.saveProgressFile", "Save a progress file")}</button>${translate("ui.progressTransferEnd", " to load on the other one.")}</p>
      <h2 class="start-h">${translate("ui.gigHeading", "Chapman gigs")} <small>${translate("ui.gigHeadingDescription", "a real MUS 248 gig: its room, its rig, its checklist")}</small></h2>
      <div class="theme-grid gig-grid">${GIGS.map((g) => gigCard(g, p, `data-choose="theme:${g.id}"`)).join("")}</div>
      <h2 class="start-h">${translate("ui.byTopic", "By topic")} <small>${translate("ui.byTopicDescription", "one question, answered on mixer after mixer")}</small></h2>
      <div class="theme-grid">${THEMES.map(card).join("")}</div>
      <h2 class="start-h">${translate("ui.byMixer", "By mixer")} <small>${translate("ui.byMixerDescription", "standing at one of these? Start with it")}</small></h2>
      <div class="theme-grid mixer-grid">${MIXERS.map((m) => mixerCard(m, p, `data-choose="mixer:${m.model}"`)).join("")}</div>
      <p class="start-overlay-note">${translate("ui.audioLoadNotice", "Loads about 4 MB of audio.")} <button type="button" class="linkish" data-open-credits>${translate("ui.musicCredits", "Music credits")}</button></p>
    </div>`;
  }
}

// ---------- the drawer: every topic or mixer and its scenarios ----------

export class ThemeDrawer {
  constructor(dialog, { progress, onSelect, onFree, onHome, onTopic }) {
    this.el = dialog;
    this.progress = progress;
    this.tab = "topic";
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog || e.target.closest("[data-close-drawer]")) return dialog.close();
      const tab = e.target.closest("[data-drawer-tab]");
      if (tab) return this.open(this.currentId, tab.dataset.drawerTab);
      const topic = e.target.closest("[data-topic]");
      if (topic) {
        dialog.close();
        return onTopic(topic.dataset.topic);
      }
      if (e.target.closest("[data-open-canvas]")) dialog.close();
      const s = e.target.closest("[data-scenario]");
      if (s) {
        dialog.close();
        onSelect(s.dataset.scenario, s.dataset.by);
      }
      const free = e.target.closest("[data-free]");
      if (free) {
        dialog.close();
        onFree(free.dataset.free || undefined);
      }
      if (e.target.closest("[data-home]")) {
        dialog.close();
        onHome();
      }
    });
  }

  syncLanguage() {
    if (!this.el.open) return;
    const controls = "button, a, summary";
    const focused = [...this.el.querySelectorAll(controls)].indexOf(document.activeElement);
    const expanded = [...this.el.querySelectorAll("details")].map((el) => el.open);
    const scrollTop = this.el.scrollTop;
    this.open(this.currentId, this.tab, { keepPosition: true });
    this.el.querySelectorAll("details").forEach((el, i) => { el.open = expanded[i]; });
    this.el.querySelectorAll(controls)[focused]?.focus({ preventScroll: true });
    this.el.scrollTop = scrollTop;
  }

  // The caller chooses the initial tab; clicks and language refreshes use
  // the selected tab ID directly, regardless of the current scenario.
  open(currentId, tab = this.tab, { keepPosition = false } = {}) {
    const p = this.progress;
    this.currentId = currentId;
    this.tab = tab;
    const by = tab === "mixer" ? "mixer" : "topic";
    const row = (s, n, { console = true } = {}) => `<li><button type="button" class="drawer-row ${s.id === currentId ? "current" : ""} ${p.has(s.id) ? "done" : ""}" data-scenario="${esc(s.id)}" data-by="${by}" ${s.id === currentId ? 'aria-current="true"' : ""}>
      <span class="dr-tick" aria-hidden="true">${p.has(s.id) ? "✓" : n}</span>
      <span class="dr-title">${esc(displayShortTitle(s))}</span>
      <span class="dr-console">${esc(console ? consoleName(s) : topicText(themeOf(s.id), "title"))}</span>
      ${p.has(s.id) ? `<span class="visually-hidden">${esc(solvedStatus())}</span>` : ""}
    </button></li>`;
    const current = themeOf(currentId)?.id;
    const theme = (t, i) => {
      const { done, total } = themeProgress(t, p);
      return `<details class="drawer-theme" ${t.id === current ? "open" : ""}>
        <summary><span class="theme-num">${i + 1}</span><span class="dt-name"><strong>${esc(topicText(t, "question"))}</strong><small>${esc(topicText(t, "title"))}</small></span><span class="dt-prog">${esc(compactProgress(done, total))}</span></summary>
        <p class="dt-concept">${esc(topicText(t, "concept"))}</p>
        <ol class="drawer-list">${themeScenarios(t).map((s, k) => row(s, k + 1)).join("")}</ol>
      </details>`;
    };
    const currentConsole = SCENARIO_CONSOLE(currentId);
    const mixer = (m) => {
      const { done, total } = mixerProgress(m, p);
      return `<details class="drawer-theme" ${m.model === currentConsole ? "open" : ""}>
        <summary><span class="dt-name"><strong>${esc(mixerName(m))}</strong><small>${esc(mixerDescription(m))}</small></span><span class="dt-prog">${esc(compactProgress(done, total))}</span></summary>
        <ol class="drawer-list">${mixerScenarios(m.model).map((s, k) => row(s, k + 1, { console: false })).join("")}</ol>
        <p class="dt-concept"><button type="button" class="linkish" data-free="${esc(m.skin)}">${esc(translate("ui.navigationMixerFree", "Free play on the {mixer}", { mixer: mixerName(m) }))}</button></p>
      </details>`;
    };
    const gig = (g) => {
      if (g.soon) return `<div class="drawer-theme gig-soon"><p class="dt-concept">${esc(translate("ui.gigComingLater", "{title}: coming later.", { title: topicText(g, "title") }))}</p></div>`;
      const { done, total } = themeProgress(g, p);
      return `<details class="drawer-theme" ${g.id === current ? "open" : ""}>
        <summary><span class="dt-name"><strong>${esc(topicText(g, "title"))}</strong><small>${esc(topicText(g, "venue"))} · ${esc(consoleName(themeScenarios(g)[0]))}</small></span><span class="dt-prog">${esc(compactProgress(done, total))}</span></summary>
        <p class="dt-concept">${esc(topicText(g, "concept"))}${g.checklist ? ` <a href="${esc(g.checklist)}" target="_blank" rel="noopener">${translate("ui.gigChecklist", "The gig checklist ↗")}</a>` : ""}</p>
        <ol class="drawer-list">${themeScenarios(g).map((s, k) => row(s, k + 1)).join("")}</ol>
      </details>`;
    };
    const tabBtn = (id, label) => `<button type="button" role="tab" class="mode-btn ${tab === id ? "active" : ""}" aria-selected="${tab === id}" data-drawer-tab="${id}">${label}</button>`;
    this.el.innerHTML = `<div class="drawer-inner">
      <header class="drawer-head"><h2 id="drawer-title">${translate("ui.navigationScenarios", "Scenarios")}</h2>
        <button type="button" class="chip" data-home>${translate("ui.startScreen", "Start screen")}</button>
        <button type="button" class="chip" data-language-toggle aria-label="${language() === "ja" ? "Switch to English" : "日本語に切り替え"}" title="${language() === "ja" ? "Switch to English" : "日本語に切り替え"}">${language() === "ja" ? "日本語" : "English"}</button>
        <button type="button" class="patch-x" data-close-drawer aria-label="${esc(translate("ui.navigationClose", "Close"))}">✕</button>
        <div class="mode-switch drawer-tabs" role="tablist" aria-label="${esc(translate("ui.navigationGroup", "Group the scenarios"))}">${tabBtn("topic", translate("ui.byTopic", "By topic"))}${tabBtn("mixer", translate("ui.byMixer", "By mixer"))}${tabBtn("gig", translate("ui.gigHeading", "Chapman gigs"))}</div></header>
      ${
        tab === "mixer"
          ? MIXERS.map(mixer).join("")
          : tab === "gig"
            ? GIGS.map(gig).join("")
            : THEMES.map(theme).join("")
      }
    </div>`;
    if (!this.el.open) this.el.showModal();
    if (keepPosition) return;
    // Scroll the drawer itself to the current scenario. (scrollIntoView would
    // also scroll the page behind the dialog, which made it jump.)
    const cur = this.el.querySelector(".drawer-row.current");
    const head = this.el.querySelector(".drawer-head");
    this.el.scrollTop = cur ? Math.max(0, cur.getBoundingClientRect().top - this.el.getBoundingClientRect().top + this.el.scrollTop - head.offsetHeight - 80) : 0;
  }
}

// ---------- the mission strip ----------

export class MissionView {
  // `dock`: the slim copy pinned under the top bar while the strip is scrolled away.
  constructor(root, { dock, progress, getTerms, getMusic, onSelect, onReset, onClear, onMusicMode, onSong, onSeek, onFreeConsole, onMixer, onOpenDrawer, onUndo, canUndo }) {
    Object.assign(this, { root, dock, progress, getTerms, getMusic, onSelect, onReset, onClear, onMusicMode, onSong, onSeek, onFreeConsole, onMixer, onOpenDrawer, onUndo, canUndo });
    this.hints = 0;
    this.more = false;
    this.mode = "topic";
    this.result = null;
    const onClick = (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const act = b.dataset.act;
      if (act === "hint") {
        // From the pinned bar, open it so the hint is visible there.
        if (e.currentTarget === dock) this.dockOpen = true;
        this.showHint();
      } else if (act === "undo") this.onUndo();
      else if (act === "dock-more") this.toggleDock();
      else if (act === "dock-top") {
        this.toggleDock(false);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      else if (act === "reset") this.onReset();
      else if (act === "clear") this.onClear();
      else if (act === "next" || act === "go") this.onSelect(b.dataset.id);
      else if (act === "music") this.onMusicMode(b.dataset.mode);
      else if (act === "song") this.onSong(b.dataset.song);
      else if (act === "more") this.toggleMore();
      else if (act === "quiz") {
        this.quizPick = Number(b.dataset.k);
        if (this.result) this.updateStrip(this.result);
      }
      else if (act === "drawer") this.onOpenDrawer(this.mode === "mixer" ? "mixer" : "topic");
    };
    root.addEventListener("click", onClick);
    if (dock) {
      dock.addEventListener("click", onClick);
      // The dock shows once the strip's goals have scrolled up under the top bar.
      let queued = false;
      const check = () => {
        queued = false;
        const mark = root.querySelector(".mission-goalrow, .mission-goal, .mission-head");
        const bar = dock.parentElement.getBoundingClientRect().bottom;
        this.setDocked(!!mark && mark.getBoundingClientRect().top < bar);
      };
      const later = () => {
        if (!queued) requestAnimationFrame(check);
        queued = true;
      };
      window.addEventListener("scroll", later, { passive: true });
      window.addEventListener("resize", later);
      this.recheckDock = later;
    }
    root.addEventListener("change", (e) => {
      if (e.target.matches(".free-console")) this.onFreeConsole(e.target.value);
      if (e.target.matches(".mixer-console")) this.onMixer(e.target.value);
      if (e.target.matches(".seek")) {
        this.seeking = false;
        this.onSeek(Number(e.target.value));
      }
    });
    root.addEventListener("input", (e) => {
      if (!e.target.matches(".seek")) return;
      this.seeking = true;
      this.showTime(Number(e.target.value), Number(e.target.max));
    });
  }

  // Where this scenario sits: its mixer's list (by mixer), the Canvas ten, or its topic's list.
  sequence(def) {
    if (this.mode === "mixer") return { label: consoleName(def), list: mixerScenarios(consoleOf(def)), mixer: true };
    const t = themeOf(def.id);
    return t ? { label: topicText(t, "title"), list: themeScenarios(t), theme: t } : { label: "", list: [def] };
  }

  render(def, result, { skinId, mode = "topic" } = {}) {
    this.def = def;
    this.mode = mode;
    this.result = result;
    this.skinId = skinId;
    if (this.hintsFor !== def.id) {
      this.hints = 0;
      this.solved = null;
    }
    this.hintsFor = def.id;
    const t = this.getTerms();
    const free = !def.conditions.length;
    if (free) {
      this.renderFree(def, skinId);
      return this.renderDock();
    }
    const seq = this.sequence(def);
    const i = seq.list.findIndex((s) => s.id === def.id);
    // Every step of this topic (or this mixer, or the Canvas ten), one tap away.
    const steps = seq.list
      .map((s, k) => {
        const done = this.progress.has(s.id);
        const here = s.id === def.id;
        const where = seq.mixer || consoleOf(s) === consoleOf(def) ? "" : `<small>${esc(consoleName(s))}</small>`;
        return `<li><button type="button" class="mstep-chip ${here ? "current" : ""} ${done ? "done" : ""}" data-act="go" data-id="${esc(s.id)}" ${here ? 'aria-current="step"' : ""} title="${esc(titleOf(s))}${done ? ` (${esc(solvedStatus())})` : ""}">
          <span class="ms-num" aria-hidden="true">${done ? "✓" : k + 1}</span><span class="ms-name">${esc(displayShortTitle(s))}${where}</span>${done ? `<span class="visually-hidden">, ${esc(solvedStatus())}</span>` : ""}</button></li>`;
      })
      .join("");
    // Who's on stage, when it isn't simply the whole band (doors, speeches, someone sitting out).
    const stageLine = scenarioText(def, "stageNote", this.getMusic().stageNote ?? "");
    // By mixer, the console is yours to choose; by topic, the scenario chooses it.
    const mixerPrefix = esc(translate("ui.missionMixerPrefix", "on the "));
    const on = seq.mixer
      ? `<label class="mixer-pick">${mixerPrefix}<select class="mixer-console" aria-label="${esc(translate("ui.missionMixerLabel", "Mixer"))}">${MIXERS.map((m) => `<option value="${esc(m.model)}" ${m.model === consoleOf(def) ? "selected" : ""}>${esc(mixerName(m))}</option>`).join("")}</select></label>`
      : `${mixerPrefix}<strong>${esc(consoleName(def))}</strong>`;
    this.root.innerHTML = `<div class="mission-inner">
      <div class="mission-head">
        <button type="button" class="mission-theme" data-act="drawer" title="${esc(seq.mixer ? translate("ui.missionMixerPickerTitle", "Every scenario on this mixer") : translate("ui.missionTopicPickerTitle", "Every topic and scenario"))}">
          <span class="mt-label">${esc(seq.mixer ? translate("ui.byMixer", "By mixer") : seq.label)}</span><span class="mt-step">${translate("ui.scenarioStep", "{current} of {total}", { current: i + 1, total: seq.list.length })}</span>
        </button>
        <div class="mission-title">
          <h1>${esc(titleOf(def))}</h1>
          <p class="mission-on">${on}${def.who ? ` · ${esc(textOf(def, "who"))}` : ""}</p>
        </div>
      </div>
      <ol class="mission-steps" aria-label="${esc(seq.mixer ? translate("ui.missionMixerSteps", "Scenarios on the {mixer}", { mixer: consoleName(def) }) : seq.label)}">${steps}</ol>
      <p class="mission-prompt">${esc(fillTerms(textOf(def, "prompt"), t))}${stageLine ? `<span class="mission-stage">${esc(stageLine)}</span>` : ""}</p>
      <div class="mission-goalrow">
        <p class="mission-goal"><strong>${translate("ui.goal", "Goal:")}</strong> ${esc(fillTerms(textOf(def, "goal"), t))}</p>
        <ul class="checklist" aria-label="${esc(translate("ui.scenarioProgress", "Progress"))}"></ul>
      </div>
      <div class="complete-banner" hidden></div>
      <ol class="hint-list"></ol>
      <div class="mission-actions">
        ${def.hints.length ? `<button type="button" class="chip hint-btn" data-act="hint"></button>` : ""}
        <button type="button" class="chip" data-act="reset">${translate("ui.startOver", "Start over")}</button>
        <button type="button" class="chip" data-act="more" aria-expanded="${this.more}">${this.more ? translate("ui.less", "Less") : translate("ui.aboutTopic", "About this topic & the music")}</button>
      </div>
      <div class="mission-more" ${this.more ? "" : "hidden"}>
        ${seq.theme ? `<p class="mission-concept"><strong>${esc(topicText(seq.theme, "title"))}:</strong> ${esc(topicText(seq.theme, "concept"))}</p>` : ""}
        <section class="music" aria-label="Band audio"></section>
      </div>
    </div>`;
    this.renderHints();
    this.renderMusic();
    if (result) this.update(result);
    else this.renderDock();
    this.recheckDock?.();
    // Scroll the step row (only the row, never the page) so this step shows.
    const row = this.root.querySelector(".mission-steps");
    const cur = row?.querySelector(".current");
    if (cur) row.scrollLeft = cur.parentElement.offsetLeft - row.clientWidth / 2 + cur.offsetWidth / 2;
  }

  renderFree(def, skinId) {
    const t = this.getTerms();
    const prompt = LANGUAGES[language()].ui.freePlaySetups?.[def.prompt] ?? def.prompt;
    const goalKey = def.goal.startsWith("No objective — try muting") ? "ui.freePlayGoalAnalog" : "ui.freePlayGoalMixer";
    this.root.innerHTML = `<div class="mission-inner mission-free">
      <div class="mission-head">
        <button type="button" class="mission-theme" data-act="drawer" title="${esc(translate("ui.missionTopicPickerTitle", "Every topic and scenario"))}"><span class="mt-label">${translate("ui.freePlay", "Free play")}</span><span class="mt-step">${translate("ui.freePlayNoGoals", "no goals")}</span></button>
        <div class="mission-title">
          <label class="free-pick"><span>Console</span>
            <select class="free-console" aria-label="${esc(translate("ui.freePlayConsole", "Free play console"))}">${FREE_CONSOLES.map((id) => `<option value="${id}" ${id === skinId ? "selected" : ""}>${esc(skinName(id))}</option>`).join("")}</select></label>
        </div>
        <div class="mission-nav">
          <button type="button" class="chip" data-act="reset">${translate("ui.freePlayReset", "Reset the band")}</button>
          <button type="button" class="chip" data-act="clear">${translate("ui.freePlayUnplug", "Unplug everything")}</button>
        </div>
      </div>
      <p class="mission-prompt">${esc(fillTerms(prompt, t))}</p>
      <p class="mission-goal"><strong>${translate("ui.freePlayTry", "Try:")}</strong> ${esc(fillTerms(translate(goalKey, def.goal), t))}</p>
      <section class="music" aria-label="Band audio"></section>
    </div>`;
    this.renderMusic();
  }

  toggleMore() {
    this.more = !this.more;
    const box = this.root.querySelector(".mission-more");
    const b = this.root.querySelector('[data-act="more"]');
    if (box) box.hidden = !this.more;
    if (b) {
      b.setAttribute("aria-expanded", String(this.more));
      b.textContent = this.more ? translate("ui.less", "Less") : translate("ui.aboutTopic", "About this topic & the music");
    }
  }

  renderHints() {
    const def = this.def;
    const list = this.root.querySelector(".hint-list");
    const btn = this.root.querySelector(".hint-btn");
    if (!list || !btn) return;
    const t = this.getTerms();
    list.innerHTML = def.hints
      .slice(0, this.hints)
      .map((h, i) => `<li><span class="hint-num">${translate("ui.hint", "Hint")} ${i + 1}</span> ${esc(fillTerms(scenarioText(def, `hints.${i}`, h), t))}</li>`)
      .join("");
    btn.hidden = this.hints >= def.hints.length;
    btn.textContent = this.hints === 0 ? translate("ui.needHint", "Need a hint?") : translate("ui.anotherHint", "Another hint", { n: this.hints + 1, total: def.hints.length });
    this.renderDock();
  }

  showHint() {
    this.hints = Math.min(this.def.hints.length, this.hints + 1);
    this.renderHints();
  }

  resetHints() {
    this.hints = 0;
    this.solved = null;
    this.quizPick = null;
    if (this.def) this.renderHints();
  }

  update(result) {
    this.result = result;
    this.updateStrip(result);
    this.renderDock();
  }

  updateStrip(result) {
    const list = this.root.querySelector(".checklist");
    if (!list) return;
    const t = this.getTerms();
    list.innerHTML = result.items
      .map(
        (i) => `<li class="check ${i.met ? "met" : "unmet"} kind-${i.kind}">
          <span class="check-box" aria-hidden="true">${i.met ? "✓" : i.kind === "keep" ? "!" : ""}</span>
          <span class="check-text">${i.kind === "keep" ? `<em>${translate("ui.keep", "Keep:")}</em> ` : ""}${esc(fillTerms(conditionText(this.def, i.id, i.label), t))}
            <span class="visually-hidden">${i.met ? translate("ui.conditionMet", "— done") : translate("ui.conditionUnmet", "— not yet")}</span>
            ${i.detail && !i.met ? `<small>${esc(conditionDetail(i.detail))}</small>` : ""}
            ${i.kind === "keep" && !i.met ? `<span class="keep-fix">${translate("ui.keepBroken", "That broke something you had to keep.")} ${this.canUndo() ? `<button type="button" class="chip" data-act="undo">${translate("ui.undo", "Undo")}</button>` : ""}<button type="button" class="chip" data-act="reset">${translate("ui.startOver", "Start over")}</button></span>` : ""}
          </span>
        </li>`,
      )
      .join("");
    // Once solved the banner stays, so experimenting afterwards doesn't lose it.
    const banner = this.root.querySelector(".complete-banner");
    if (result.complete) this.solved = this.def.id;
    this.root.classList.toggle("is-solved", this.solved === this.def.id);
    if (this.solved !== this.def.id) {
      banner.hidden = true;
      return;
    }
    const seq = this.sequence(this.def);
    const i = seq.list.findIndex((s) => s.id === this.def.id);
    const next = seq.list.slice(i + 1).find((s) => !this.progress.has(s.id)) || seq.list[i + 1];
    banner.hidden = false;
    const still = result.complete ? "" : `<p class="complete-note">${translate("ui.changedSince", "You've changed things since: the checklist shows what's true right now.")}</p>`;
    banner.innerHTML = `<div><p class="complete-title">${translate("ui.solved", "Solved ✓")}</p><p>${esc(fillTerms(textOf(this.def, "complete"), t))}</p>${still}${this.quiz(t)}</div>
      ${next ? `<button type="button" class="btn btn-start" data-act="next" data-id="${esc(next.id)}">${translate("ui.next", "Next:")} ${esc(displayShortTitle(next))}${consoleOf(next) !== consoleOf(this.def) ? ` <small>${translate("ui.onMixer", "on")} ${esc(consoleName(next))}</small>` : ""} →</button>` : `<button type="button" class="btn btn-start" data-act="drawer">${esc(seq.label)} ${translate("ui.done", "done:")} ${seq.mixer ? translate("ui.tryAnotherMixer", "try another mixer") : translate("ui.pickAnotherTopic", "pick another topic")} →</button>`}`;
  }

  // An optional one-question check after the solve (def.quiz): pick an answer, see why.
  quiz(t) {
    const c = this.def.quiz;
    if (!c) return "";
    const pick = this.quizPick;
    const opts = c.options
      .map((o, k) => scenarioText(this.def, `quiz.options.${k}`, o))
      .map((o, k) => `<button type="button" class="chip${pick === k ? (k === c.answer ? " is-right" : " is-wrong") : ""}" data-act="quiz" data-k="${k}" aria-pressed="${pick === k}">${esc(fillTerms(o, t))}</button>`)
      .join("");
    const why = pick == null ? "" : `<p class="cc-why" role="status"><strong>${pick === c.answer ? translate("ui.right", "Right.") : translate("ui.notQuite", "Not quite.")}</strong> ${esc(fillTerms(scenarioText(this.def, "quiz.why", c.why), t))}</p>`;
    return `<div class="concept-check"><p class="cc-q">${translate("ui.quickCheck", "Quick check (optional):")} ${esc(fillTerms(scenarioText(this.def, "quiz.q", c.q), t))}</p><div class="cc-opts">${opts}</div>${why}</div>`;
  }

  // ---------- the pinned copy ----------

  setDocked(on) {
    if (!this.dock || on === this.docked) return;
    this.docked = on;
    this.dock.hidden = !on;
    if (!on) this.toggleDock(false);
  }

  toggleDock(open = !this.dockOpen) {
    this.dockOpen = open;
    const more = this.dock?.querySelector(".dock-more");
    if (more) more.hidden = !open;
    this.dock?.querySelector('[data-act="dock-more"]')?.setAttribute("aria-expanded", String(open));
  }

  // Title, the goals as ticks, the next thing to do, and a hint: enough to keep
  // working on the console without scrolling back up.
  renderDock() {
    const dock = this.dock;
    const def = this.def;
    if (!dock || !def) return;
    const t = this.getTerms();
    if (!def.conditions.length) {
      dock.innerHTML = `<div class="dock-inner"><span class="dock-where">${translate("ui.freePlay", "Free play")}</span><strong class="dock-title">${esc(skinName(this.skinId))}</strong><span class="dock-next">${translate("ui.freePlayDockGuide", "No goals: try anything.")}</span>
        <button type="button" class="chip dock-btn" data-act="dock-top">${translate("ui.backToTop", "Back to the top ↑")}</button></div>`;
      return;
    }
    const seq = this.sequence(def);
    const i = seq.list.findIndex((s) => s.id === def.id);
    const items = this.result?.items || [];
    const goals = items.filter((x) => x.kind === "goal");
    const broken = items.find((x) => x.kind === "keep" && !x.met);
    const todo = broken || goals.find((x) => !x.met);
    const solved = this.solved === def.id;
    const ticks = goals.map((g) => `<i class="${g.met ? "met" : ""}" aria-hidden="true"></i>`).join("");
    const next = solved ? translate("ui.solved", "Solved ✓") : todo ? `${broken ? `${translate("ui.keep", "Keep:")} ` : `${translate("ui.next", "Next:")} `}${fillTerms(conditionText(def, todo.id, todo.label), t)}` : "";
    const hintsLeft = this.hints < def.hints.length;
    const nextUp = seq.list.slice(i + 1).find((x) => !this.progress.has(x.id)) || seq.list[i + 1];
    const shown = def.hints.slice(0, this.hints).map((h, i) => scenarioText(def, `hints.${i}`, h));
    dock.innerHTML = `<div class="dock-inner ${solved ? "is-solved" : ""}">
      <span class="dock-where">${esc(seq.mixer ? translate("ui.byMixer", "By mixer") : seq.label)} · ${i + 1}/${seq.list.length}</span>
      <strong class="dock-title">${esc(titleOf(def))}</strong>
      <span class="dock-ticks" role="img" aria-label="${esc(translate("ui.goalProgress", `{done} of ${count(goals.length, "goal")} met`, { done: goals.filter((g) => g.met).length, total: goals.length }))}">${ticks}</span>
      <span class="dock-next ${broken && !solved ? "is-broken" : ""}">${esc(next)}</span>
      <span class="dock-actions">
        ${hintsLeft && !solved && !broken ? `<button type="button" class="chip dock-btn" data-act="hint">${this.hints ? translate("ui.dockAnotherHint", "Another hint") : translate("ui.hint", "Hint")}</button>` : ""}
        ${broken && !solved ? `${this.canUndo() ? `<button type="button" class="chip dock-btn" data-act="undo">${translate("ui.undo", "Undo")}</button>` : ""}<button type="button" class="chip dock-btn" data-act="reset">${translate("ui.startOver", "Start over")}</button>` : ""}
        ${solved && nextUp ? `<button type="button" class="btn btn-start dock-btn" data-act="next" data-id="${esc(nextUp.id)}">${translate("ui.dockNext", "Next:")} ${esc(displayShortTitle(nextUp))} →</button>` : ""}
        <button type="button" class="chip dock-btn" data-act="dock-more" aria-expanded="${!!this.dockOpen}">${esc(translate("ui.storyAndGoals", "Story & goals"))}</button>
      </span>
      <div class="dock-more" ${this.dockOpen ? "" : "hidden"}>
        <p class="mission-prompt">${esc(fillTerms(textOf(def, "prompt"), t))}</p>
        <ul class="checklist">${items.map((x) => `<li class="check ${x.met ? "met" : "unmet"} kind-${x.kind}"><span class="check-box" aria-hidden="true">${x.met ? "✓" : x.kind === "keep" ? "!" : ""}</span><span class="check-text">${x.kind === "keep" ? `<em>${translate("ui.keep", "Keep:")}</em> ` : ""}${esc(fillTerms(conditionText(def, x.id, x.label), t))}</span></li>`).join("")}</ul>
        ${shown.length ? `<ol class="hint-list">${shown.map((h, k) => `<li><span class="hint-num">${translate("ui.hint", "Hint")} ${k + 1}</span> ${esc(fillTerms(h, t))}</li>`).join("")}</ol>` : ""}
        <button type="button" class="linkish" data-act="dock-top">${translate("ui.backToFullScenario", "Back to the full scenario ↑")}</button>
      </div>
    </div>`;
  }

  // Which song and which part of it is playing; Free play chooses the song, and a section or the whole song.
  renderMusic() {
    const box = this.root.querySelector(".music");
    if (!box) return;
    const { mode, song, songs, duration, sections, section, out, silent } = this.getMusic();
    const restingSources = out.map((s) => {
      if (nameMode() === "musicians" && s.musician) return s.musician;
      return language() === "ja" ? sourceText(s, "name", s.name.toLowerCase()) : s.name.toLowerCase();
    });
    const resting = out.length ? translate("ui.musicSittingOut", ` Sitting out here: ${listOf(restingSources)}.`, { sources: restingSources.join("、") }) : "";
    const songName = translate("ui.musicSongArtist", `“${song.title}” by ${song.artist}`, { song: song.title, artist: song.artist });
    if (!this.def || this.def.id !== "free-play") {
      box.classList.add("music-now");
      const note = silent ? translate("ui.musicSilent", "♪ The band isn't playing in this one.") : section
        ? translate("ui.musicScenarioLoop", `♪ ${songName}: the band loops ${barsText(section)} of the song (${clock(section.start)}), ${section.label.toLowerCase()}.${resting}`, {
          song: songName, bars: sectionBars(section), start: clock(section.start), section: sectionLabel(section), resting,
        }) : "";
      box.innerHTML = note ? `<p class="music-note">${esc(note)}</p>` : "";
      this.seekEl = this.timeEl = null;
      return;
    }
    box.classList.remove("music-now");
    const opt = (m, label, sub) => `<button type="button" role="radio" class="chip music-chip ${mode === m ? "active" : ""}" aria-checked="${mode === m}" data-act="music" data-mode="${m}">${esc(label)} <small>${esc(sub)}</small></button>`;
    const songOpt = (sg) => `<button type="button" role="radio" class="chip music-chip ${sg.id === song.id ? "active" : ""}" aria-checked="${sg.id === song.id}" data-act="song" data-song="${esc(sg.id)}">${esc(sg.title)} <small>${esc(sg.artist)}</small></button>`;
    const len = clock(duration);
    box.innerHTML = `
      <div class="music-modes" role="radiogroup" aria-label="Song"><span class="music-title">Song</span>
        ${songs.map(songOpt).join("")}
      </div>
      <div class="music-modes" role="radiogroup" aria-label="Band audio"><span class="music-title">Band audio</span>
        ${sections.map((s) => opt(s.id, sectionLabel(s), sectionBars(s))).join("")}${opt("full", translate("ui.musicFull", "Full song"), len)}
      </div>
      <div class="music-pos" ${mode === "full" ? "" : "hidden"}>
        <input type="range" class="seek" min="0" max="${Math.round(duration * 2) / 2}" step="0.5" value="0" aria-label="${esc(translate("ui.musicPosition", "Song position"))}" />
        <span class="music-time" aria-hidden="true">0:00 / ${len}</span>
      </div>
      <p class="music-note">${esc(mode === "full" ? translate("ui.musicFullHelp", "The whole song streams about 20 seconds ahead. Drag to jump to any part.")
        : translate("ui.musicLoopAt", `${barsLoop(section)} from ${clock(section.start)} into the song.${resting}`, { time: clock(section.start), section: sectionBars(section), resting }))}</p>`;
    this.seekEl = box.querySelector(".seek");
    this.timeEl = box.querySelector(".music-time");
  }

  updatePosition(pos, mode) {
    if (!this.seekEl || mode !== "full" || this.seeking) return;
    this.seekEl.max = String(Math.round(pos.duration * 2) / 2);
    this.seekEl.value = String(pos.t);
    this.showTime(pos.t, pos.duration);
  }

  showTime(t, duration) {
    if (this.timeEl) this.timeEl.textContent = `${clock(t)} / ${clock(duration)}`;
    if (this.seekEl) this.seekEl.setAttribute("aria-valuetext", clock(t));
  }
}
