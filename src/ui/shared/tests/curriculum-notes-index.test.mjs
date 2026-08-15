/**
 * curriculum-notes-index.test.mjs
 * ============================================================
 * اختبار وحدة خالص لفهرس `curriculum-notes-index.js` — يتحقق من صحة
 * الاستخراج البرمجي من `curriculum-data.js` (لا متصفح، بلا Playwright)
 * عبر مقارنة بضع نقاط بيانات معروفة يدويًا بالملف الأصلي.
 *
 * يُشغَّل بـ: node src/ui/shared/tests/curriculum-notes-index.test.mjs
 */
import assert from "node:assert/strict";
import { CURRICULUM_NOTES_INDEX } from "../curriculum-notes-index.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
  }
}

test("49 بندًا مستخرَجًا (longtone/transition/exchange فقط، لا إيقاعية)", () => {
  assert.equal(CURRICULUM_NOTES_INDEX.length, 49);
});

test("اليوم 1: نغمة طويلة 'دو' على القرار (semis=0)، سماحية 20", () => {
  const e = CURRICULUM_NOTES_INDEX.find((x) => x.id === 1);
  assert.deepEqual(e, { id: 1, kind: "longtone", targetSemis: 0, targetLabel: "دو", toleranceCents: 20 });
});

test("اليوم 3: نغمة طويلة 'مي نصف بيمول' (ربع صوت، semis=3.5)، سماحية 26", () => {
  const e = CURRICULUM_NOTES_INDEX.find((x) => x.id === 3);
  assert.equal(e.targetSemis, 3.5);
  assert.equal(e.targetLabel, "مي نصف بيمول");
  assert.equal(e.toleranceCents, 26);
});

test("اليوم 11 (انتقال دو←ري): الهدف هو 'to' (ري، semis=2) لا 'from' (دو)", () => {
  const e = CURRICULUM_NOTES_INDEX.find((x) => x.id === 11);
  assert.equal(e.kind, "transition");
  assert.equal(e.targetLabel, "ري");
  assert.equal(e.targetSemis, 2);
});

test("اليوم 18 (تبادل دو⇄ري): الهدف هو 'to' (ري) لا 'from' (دو)", () => {
  const e = CURRICULUM_NOTES_INDEX.find((x) => x.id === 18);
  assert.equal(e.kind, "exchange");
  assert.equal(e.targetLabel, "ري");
});

test("لا بند إيقاعي واحد مُستخرَج (لا rhythm/rhythmdrop/tongue/sustainRhythm)", () => {
  const kinds = new Set(CURRICULUM_NOTES_INDEX.map((e) => e.kind));
  for (const k of kinds) {
    assert.ok(["longtone", "transition", "exchange"].includes(k), `نوع غير متوقَّع: ${k}`);
  }
});

test("كل معرّفات id فريدة (بلا تكرار من الاستخراج)", () => {
  const ids = CURRICULUM_NOTES_INDEX.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
});

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
