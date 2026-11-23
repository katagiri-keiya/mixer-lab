import { ALL_BOARD_SCENARIOS, SCENARIOS } from "../js/scenarios.js";
import { LANGUAGES } from "../js/i18n/index.js";

const all = [...SCENARIOS.filter((s) => s.number > 0), ...ALL_BOARD_SCENARIOS];
const ja = LANGUAGES.ja.scenarios || {};
const fields = ["title", "prompt", "goal", "complete"];
const placeholders = (value) => [...String(value ?? "").matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((m) => m[1]).sort();
const same = (a, b) => JSON.stringify(placeholders(a)) === JSON.stringify(placeholders(b));
const result = { total: all.length, translated: 0, partial: 0, untranslated: 0, canvas: [], boards: {}, fields: {}, missing: [], placeholderMismatches: [], invalidReferences: [], duplicateKeys: [] };
result.shortTitles = { explicit: 0, titleFallback: 0, englishFallback: 0, missing: [] };
for (const field of fields) result.fields[field] = { translated: 0, missing: 0 };
const boardStats = new Map();
for (const def of all) {
  const tr = ja[def.id];
  const englishShort = ({ preshow: "Preshow music", "build-rig": "Band into the house", "find-amp": "Find the amp", "more-vocal": "Singer's wedge", "drummer-wedge": "Drummer's wedge", "more-piano": "More piano", "monitor-quiet": "Too quiet", "foh-vocal": "Vocal too loud", "missing-guitar": "Missing guitar", "drummer-mix": "Drummer's mix", "free-play": "Free play" })[def.id] || def.short || def.title;
  if (typeof tr?.shortTitle === "string") result.shortTitles.explicit++;
  else if (typeof tr?.title === "string") result.shortTitles.titleFallback++;
  else if (englishShort) { result.shortTitles.englishFallback++; result.shortTitles.missing.push(def.id); }
  const checks = [];
  for (const field of fields) {
    const present = typeof tr?.[field] === "string";
    checks.push(present);
    result.fields[field][present ? "translated" : "missing"]++;
    if (!present && def[field] != null) result.missing.push({ id: def.id, field });
    if (present && !same(def[field], tr[field])) result.placeholderMismatches.push({ id: def.id, field, source: placeholders(def[field]), translation: placeholders(tr[field]) });
  }
  const conditionTranslations = tr?.conditions || {};
  for (const condition of def.conditions || []) {
    const present = typeof conditionTranslations[condition.id] === "string";
    if (!present) result.missing.push({ id: def.id, field: `conditions.${condition.id}` });
    else if (!same(condition.label, conditionTranslations[condition.id])) result.placeholderMismatches.push({ id: def.id, field: `conditions.${condition.id}`, source: placeholders(condition.label), translation: placeholders(conditionTranslations[condition.id]) });
  }
  const hints = def.hints || [];
  const translatedHints = tr?.hints;
  if (translatedHints != null && (!Array.isArray(translatedHints) || translatedHints.length !== hints.length)) result.invalidReferences.push({ id: def.id, field: "hints", expected: hints.length, actual: Array.isArray(translatedHints) ? translatedHints.length : "not an array" });
  if (Array.isArray(translatedHints)) hints.forEach((h, i) => { if (typeof translatedHints[i] !== "string") result.missing.push({ id: def.id, field: `hints.${i}` }); else if (!same(h, translatedHints[i])) result.placeholderMismatches.push({ id: def.id, field: `hints.${i}`, source: placeholders(h), translation: placeholders(translatedHints[i]) }); });
  if (def.quiz) {
    const q = tr?.quiz;
    for (const field of ["q", "why"]) {
      if (q?.[field] != null && !same(def.quiz[field], q[field])) result.placeholderMismatches.push({ id: def.id, field: `quiz.${field}`, source: placeholders(def.quiz[field]), translation: placeholders(q[field]) });
      else if (q?.[field] == null) result.missing.push({ id: def.id, field: `quiz.${field}` });
    }
    if (q?.options != null && (!Array.isArray(q.options) || q.options.length !== def.quiz.options.length)) result.invalidReferences.push({ id: def.id, field: "quiz.options", expected: def.quiz.options.length, actual: Array.isArray(q.options) ? q.options.length : "not an array" });
    if (Array.isArray(q?.options)) def.quiz.options.forEach((o, i) => { if (!same(o, q.options[i])) result.placeholderMismatches.push({ id: def.id, field: `quiz.options.${i}`, source: placeholders(o), translation: placeholders(q.options[i]) }); });
  }
  const count = checks.filter(Boolean).length;
  if (count === fields.length) result.translated++;
  else if (count) result.partial++;
  else result.untranslated++;
  const bucket = def.board || "canvas";
  if (bucket === "canvas") result.canvas.push({ id: def.id, translatedFields: count, totalFields: fields.length });
  else { const x = boardStats.get(bucket) || { total: 0, translated: 0, partial: 0, untranslated: 0 }; x.total++; x[ count === fields.length ? "translated" : count ? "partial" : "untranslated" ]++; boardStats.set(bucket, x); }
}
result.boards = Object.fromEntries(boardStats);
console.log(JSON.stringify(result, null, 2));
if (result.placeholderMismatches.length || result.invalidReferences.length || result.duplicateKeys.length) process.exitCode = 1;
