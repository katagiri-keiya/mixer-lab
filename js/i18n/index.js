import { en } from "./en.js";
import { ja } from "./ja.js";
import { uiEn, uiJa } from "./ui.js";
import { commonExtraEn, commonExtraJa } from "./common-extra.js";
import { patchUiEn, patchUiJa } from "./patch-ui.js";
import { stageUiEn, stageUiJa } from "./stage-ui.js";
import { connectorEn, connectorJa } from "./connector-ui.js";
import { flowEn, flowJa } from "./flow-ui.js";
import { connectionEn, connectionJa } from "./connection-ui.js";
import { dialogEn, dialogJa } from "./dialog-ui.js";
import { cableEn, cableJa, gearEn, gearJa } from "./gear-ui.js";
import { outputEn, outputJa } from "./output-ui.js";
import { inputUiEn, inputUiJa } from "./input-ui.js";
import { outputStatusEn, outputStatusJa } from "./output-status-ui.js";
import { scenarioTemplatesEn, scenarioTemplatesJa } from "./scenario-templates.js";
import { canvasJa } from "./canvas-ja.js";
import { stageGearEn, stageGearJa } from "./stage-gear-ui.js";
import { stageTextEn, stageTextJa } from "./stage-text-ui.js";
import { stageCableEn, stageCableJa } from "./stage-cable-ui.js";
import { gearTypeJa } from "./gear-type-ja.js";
import { flowModelEn, flowModelJa } from "./flow-model-ui.js";
import { sourceEn, sourceJa } from "./source-ui.js";
export const LANGUAGES = { ja: { ...ja, scenarios: { ...ja.scenarios, ...canvasJa }, ui: { ...ja.ui, ...uiJa, ...patchUiJa, ...stageUiJa, ...stageTextJa, ...flowJa, ...connectionJa, ...dialogJa, ...inputUiJa, ...outputStatusJa, cables: { ...cableJa, ...stageCableJa }, gear: { ...gearJa, ...outputJa, ...stageGearJa }, gearById: gearTypeJa, flowModels: flowModelJa, sources: sourceJa, connectors: connectorJa }, common: { ...ja.common, ...commonExtraJa } }, en: { ...en, ui: { ...en.ui, ...uiEn, ...patchUiEn, ...stageUiEn, ...stageTextEn, ...flowEn, ...connectionEn, ...dialogEn, ...inputUiEn, ...outputStatusEn, cables: { ...cableEn, ...stageCableEn }, gear: { ...gearEn, ...outputEn, ...stageGearEn }, gearById: {}, flowModels: flowModelEn, sources: sourceEn, connectors: connectorEn }, common: { ...en.common, ...commonExtraEn } } };
export const LANGUAGE_KEY = "mixer-lab-language";
let current = "ja";
const listeners = new Set();
const missingTranslations = new Map();
const originalText = new WeakMap();
const originalAttributes = new WeakMap();
function readLanguage() { try { return localStorage.getItem(LANGUAGE_KEY); } catch (e) { return null; } }
function writeLanguage(value) { try { localStorage.setItem(LANGUAGE_KEY, value); } catch (e) {} }
export function language() { return current; }
export function setLanguage(value) { const next = LANGUAGES[value] ? value : "ja"; writeLanguage(next); if (next === current) return; current = next; for (const listener of listeners) listener(next); }
export function onLanguageChange(listener) { listeners.add(listener); return () => listeners.delete(listener); }
export function initLanguage() { const saved = readLanguage(); current = LANGUAGES[saved] ? saved : "ja"; return current; }
function get(object, path) { return path.split(".").reduce((value, key) => value?.[key], object); }
export function t(key, fallback = key, vars = {}) { let value = get(LANGUAGES[current], key) ?? get(en, key) ?? fallback; if (typeof value === "function") value = value(vars.n, vars.total); return String(value).replace(/\{(\w+)\}/g, (_, name) => vars[name] ?? `{${name}}`); }
export function localized(kind, id, field, fallback = "", vars = {}) {
  const key = `ui.${kind}.${id}${field ? `.${field}` : ""}`;
  const value = get(LANGUAGES[current], key);
  const english = get(en, key);
  if (current === "ja" && value == null && english == null && fallback !== "") {
    const diagnosticKey = `${kind}|${id}|${field}`;
    if (!missingTranslations.has(diagnosticKey)) missingTranslations.set(diagnosticKey, { kind, id, field, key, fallback });
  }
  return t(key, fallback, vars);
}
export function getMissingTranslations() { return [...missingTranslations.values()]; }
export function clearMissingTranslations() { missingTranslations.clear(); }
function scenarioTemplateText(def, field) {
  const template = def?.translationTemplate;
  if (!template) return undefined;
  return get(current === "ja" ? scenarioTemplatesJa : scenarioTemplatesEn, `${template}.${field}`) ?? get(scenarioTemplatesEn, `${template}.${field}`);
}
export function scenarioText(def, field, fallback = get(def, field) ?? "") {
  return t(`scenarios.${def?.id}.${field}`, scenarioTemplateText(def, field) ?? fallback);
}
export function conditionText(def, id, fallback = "") {
  return t(`scenarios.${def?.id}.conditions.${id}`, scenarioTemplateText(def, `conditions.${id}`) ?? fallback);
}

export function localizeDom(root = document) {
  const source = LANGUAGES[current]?.common || {};
  const fallback = en.common || {};
  const table = new Map(Object.keys(fallback).map((key) => [key, source[key] ?? fallback[key]]));
  const translateValue = (value) => table.get(value) ?? value;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (node.parentElement?.closest("script,style")) continue;
    const currentValue = node.nodeValue;
    const trimmed = currentValue.trim();
    if (!trimmed) continue;
    const original = originalText.get(node) ?? trimmed;
    originalText.set(node, original);
    const translated = translateValue(original);
    if (translated !== trimmed) node.nodeValue = currentValue.replace(trimmed, translated);
  }
  for (const el of root.querySelectorAll?.("[aria-label], [title], [placeholder]") || []) {
    for (const attr of ["aria-label", "title", "placeholder"]) {
      if (!el.hasAttribute(attr)) continue;
      let originals = originalAttributes.get(el);
      if (!originals) originalAttributes.set(el, (originals = new Map()));
      const original = originals.get(attr) ?? el.getAttribute(attr);
      originals.set(attr, original);
      el.setAttribute(attr, translateValue(original));
    }
  }
  for (const el of root.querySelectorAll?.("[data-i18n]") || []) {
    const key = el.dataset.i18n;
    const fallback = get(en, key) ?? el.textContent;
    el.textContent = t(key, fallback);
  }
}
