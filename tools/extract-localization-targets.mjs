import fs from "node:fs";
import { ALL_BOARD_SCENARIOS, SCENARIOS } from "../js/scenarios.js";
import { THEMES } from "../js/themes.js";
import { CONNECTOR_GUIDE } from "../js/ui/icons.js";
import { CABLES, DEVICE_TYPES, JACKS, PLUGS, SIGNAL_LEVELS } from "../js/connection-model.js";
import { LANGUAGES } from "../js/i18n/index.js";
import { SKINS } from "../js/mixer-models.js";
import { flowModelEn } from "../js/i18n/flow-model-ui.js";
import { SOURCES_BY_ID } from "../audio/source-manifest.js";

const rows = [];
const get = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
const add = (kind, id, field, english, source) => {
  if (english == null || english === "") return;
  const key = kind === "scenario" ? `scenarios.${id}.${field}` : `ui.${kind}.${id}${field ? `.${field}` : ""}`;
  const dict = kind === "scenario" ? get(LANGUAGES.ja.scenarios?.[id], field) : kind === "gear" ? (get(LANGUAGES.ja.ui?.gearById?.[id], field) ?? LANGUAGES.ja.ui?.gear?.[english]) : kind === "source" ? get(LANGUAGES.ja.ui?.sources?.[id], field) : kind === "consoleFlow" ? get(LANGUAGES.ja.ui?.flowModels?.[id], field) : field ? LANGUAGES.ja.ui?.[kind]?.[id]?.[field] : LANGUAGES.ja.ui?.[kind]?.[id];
  rows.push({ kind, id, field, english, source, key, translated: typeof dict === "string" && dict !== english });
};

const scenarios = [...SCENARIOS.filter((s) => s.number > 0), ...ALL_BOARD_SCENARIOS];
for (const s of scenarios) {
  for (const field of ["title", "prompt", "goal", "complete"]) add("scenario", s.id, field, s[field], "js/scenarios.js or js/board-scenarios.js");
  for (const c of s.conditions || []) add("scenario", s.id, `conditions.${c.id}`, c.label, "scenario definition conditions");
  (s.hints || []).forEach((h, i) => add("scenario", s.id, `hints.${i}`, h, "scenario definition hints"));
  if (s.quiz) {
    add("scenario", s.id, "quiz.q", s.quiz.q, "scenario definition quiz");
    s.quiz.options?.forEach((o, i) => add("scenario", s.id, `quiz.options.${i}`, o, "scenario definition quiz"));
    add("scenario", s.id, "quiz.why", s.quiz.why, "scenario definition quiz");
  }
}

for (const theme of THEMES) {
  add("theme", theme.id, "title", theme.title, "js/themes.js");
  add("theme", theme.id, "question", theme.question, "js/themes.js");
  add("theme", theme.id, "concept", theme.concept, "js/themes.js");
}
const connectorKey = { "xlr-m": "xlrMale", "xlr-f": "xlrFemale", trs14: "trs14", ts14: "ts14", trs35: "trs35", rca: "rca", speakon: "speakon", ethercon: "ethercon", iec: "iec" };
for (const [name, title, description] of CONNECTOR_GUIDE) {
  const id = connectorKey[name] || name;
  add("connectors", id, "title", title, "js/ui/icons.js CONNECTOR_GUIDE");
  add("connectors", id, "description", description, "js/ui/icons.js CONNECTOR_GUIDE");
}
for (const [id, cable] of Object.entries(CABLES)) {
  add("cables", id, "name", cable.name, "js/connection-model.js CABLES");
  add("cables", id, "blurb", cable.blurb, "js/connection-model.js CABLES");
}
for (const [id, type] of Object.entries(DEVICE_TYPES)) {
  add("gear", id, "name", type.name, "js/connection-model.js DEVICE_TYPES");
  add("gear", id, "blurb", type.blurb, "js/connection-model.js DEVICE_TYPES");
  for (const port of type.ports || []) {
    add("gear", `${id}.${port.id}`, "name", port.name, "DEVICE_TYPES port definition");
    add("gear", `${id}.${port.id}`, "blurb", port.blurb, "DEVICE_TYPES port definition");
  }
}
for (const [id, value] of Object.entries(JACKS)) add("gear", `jack.${id}`, "name", value.name, "js/connection-model.js JACKS");
for (const [id, value] of Object.entries(PLUGS)) add("gear", `plug.${id}`, "name", value.name, "js/connection-model.js PLUGS");
for (const [id, value] of Object.entries(SIGNAL_LEVELS)) {
  add("gear", `level.${id}`, "name", value.name, "js/connection-model.js SIGNAL_LEVELS");
  add("gear", `level.${id}`, "blurb", value.blurb, "js/connection-model.js SIGNAL_LEVELS");
}
for (const [id, skin] of Object.entries(SKINS)) {
  add("console", id, "name", skin.name, "js/mixer-models.js SKINS");
  add("console", id, "subtitle", skin.subtitle, "js/mixer-models.js SKINS");
  add("console", id, "blurb", skin.blurb, "js/mixer-models.js SKINS");
}
for (const [id, value] of Object.entries(LANGUAGES.ja.ui?.flowModels || {})) {
  for (const field of Object.keys(value)) add("consoleFlow", id, field, flowModelEn[id]?.[field], "js/i18n/flow-model-ui.js");
}
// Model renderers still contain some literal English in template markup. This
// conservative scan reports those literals for follow-up; it deliberately
// does not claim that dynamic/template expressions have been fully resolved.
const flowSource = fs.readFileSync(new URL("../js/ui/flow.js", import.meta.url), "utf8");
for (const [lineNumber, line] of flowSource.split(/\r?\n/).entries()) {
  if (line.includes("flowText(") || line.includes("flowModelText(") || line.includes("translate(")) continue;
  const literals = [...line.matchAll(/"((?:\\.|[^"\\\n]){12,})"/g)].map((match) => match[1]);
  if (line.includes("return ") || line.includes("if (")) continue;
  for (const literal of literals) {
    if (!/[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(literal) || /^(class|flow|branch|flow-node|flow-end)/.test(literal)) continue;
    add("consoleFlowDirect", `line-${lineNumber + 1}`, "literal", literal, "js/ui/flow.js direct literal scan");
  }
}
for (const [id, source] of Object.entries(SOURCES_BY_ID)) {
  for (const field of ["name", "device", "note"]) add("source", id, field, source[field], "audio/source-manifest.js SOURCES_BY_ID");
}

const summary = rows.reduce((out, row) => {
  const bucket = out[row.kind] || (out[row.kind] = { total: 0, translated: 0, missing: 0 });
  bucket.total++;
  bucket[row.translated ? "translated" : "missing"]++;
  return out;
}, {});
const topicIds = new Set(THEMES.flatMap((theme) => theme.ids));
const report = { generatedAt: new Date().toISOString(), total: rows.length, summary, topicScenarioIds: [...topicIds], targets: rows };
if (process.argv.includes("--human")) {
  console.log(`Localization targets: ${rows.length}`);
  for (const [kind, value] of Object.entries(summary)) console.log(`${kind}: ${value.translated}/${value.total} translated, ${value.missing} missing`);
} else console.log(JSON.stringify(report, null, 2));
