/**
 * silence-split.test.mjs
 * ============================================================
 * اختبار وحدة لدالة الفصل عند فجوة الصمت الخالصة (بلا متصفح، بلا
 * Playwright — دالة حسابية بحتة قابلة للاختبار مباشرة بـ Node، القرار 13.6).
 *
 * يُشغَّل بـ: node src/ui/admin/expert-intake/tests/silence-split.test.mjs
 */
import assert from "node:assert/strict";
import { splitBySilenceGap } from "../silence-split.js";

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

const SAMPLE_RATE = 44100;

/** يبني مقطع "صوت" اصطناعي (موجة جيبية بسعة معطاة) بطول معطى بالمللي ثانية. */
function toneSegment(durationMs, amplitude = 0.5, freq = 440) {
  const n = Math.round((durationMs / 1000) * SAMPLE_RATE);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
  }
  return out;
}

/** يبني مقطع "صمت" اصطناعي (سعة قريبة من الصفر جدًا) بطول معطى بالمللي ثانية. */
function silenceSegment(durationMs) {
  const n = Math.round((durationMs / 1000) * SAMPLE_RATE);
  return new Float32Array(n); // كله أصفار — RMS = 0
}

function concat(...segments) {
  const total = segments.reduce((s, seg) => s + seg.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const seg of segments) {
    out.set(seg, offset);
    offset += seg.length;
  }
  return out;
}

test("صمت كامل بلا أي كلام: لا فجوة، النسخة النظيفة = الخام (splitIndex=0)", () => {
  const samples = silenceSegment(1000);
  const result = splitBySilenceGap(samples, SAMPLE_RATE);
  assert.equal(result.hasSplit, false);
  assert.equal(result.splitIndex, 0);
});

test("صوت متواصل بلا أي فجوة صمت: لا انقسام (splitIndex=0)", () => {
  const samples = toneSegment(1000);
  const result = splitBySilenceGap(samples, SAMPLE_RATE);
  assert.equal(result.hasSplit, false);
  assert.equal(result.splitIndex, 0);
});

test("كلام (300مم) ← فجوة صمت طويلة (400مم) ← نغمة (500مم): يُكتشَف الانقسام في بداية النغمة تقريبًا", () => {
  const speech = toneSegment(300);
  const gap = silenceSegment(400);
  const note = toneSegment(500);
  const samples = concat(speech, gap, note);
  const result = splitBySilenceGap(samples, SAMPLE_RATE);
  assert.equal(result.hasSplit, true);
  // بداية النغمة الفعلية = طول الكلام + طول الفجوة (بالعيّنات)
  const expectedStart = speech.length + gap.length;
  // نسمح بهامش خطأ بحدود نافذة قياس واحدة (30مم افتراضيًا)
  const toleranceSamples = Math.round((30 / 1000) * SAMPLE_RATE) * 2;
  assert.ok(
    Math.abs(result.splitIndex - expectedStart) <= toleranceSamples,
    `splitIndex=${result.splitIndex} بعيد جدًا عن البداية المتوقعة ${expectedStart}`
  );
  // النسخة النظيفة (من splitIndex فصاعدًا) يجب أن تقع بالكامل ضمن مقطع النغمة أو قريبًا منه
  assert.ok(result.splitIndex >= speech.length, "الانقسام وقع قبل نهاية الكلام");
  assert.ok(result.splitIndex <= samples.length, "الانقسام تجاوز نهاية التسجيل");
});

test("استراحة تنفّس قصيرة أثناء الكلام (80مم فقط) لا تُحتسَب فجوة كافية — تُتخطّى، لا انقسام مبكّر خاطئ", () => {
  const speechPart1 = toneSegment(300);
  const briefBreath = silenceSegment(80); // أقل من الحد الأدنى الافتراضي (250مم)
  const speechPart2 = toneSegment(300);
  const samples = concat(speechPart1, briefBreath, speechPart2);
  const result = splitBySilenceGap(samples, SAMPLE_RATE);
  // بلا فجوة صمت كافية لاحقًا، النتيجة: لا انقسام
  assert.equal(result.hasSplit, false);
  assert.equal(result.splitIndex, 0);
});

test("استراحة تنفّس قصيرة، ثم فجوة صمت حقيقية كافية بعدها: يُكتشَف الانقسام عند الفجوة الحقيقية فقط", () => {
  const speechPart1 = toneSegment(300);
  const briefBreath = silenceSegment(80);
  const speechPart2 = toneSegment(300);
  const realGap = silenceSegment(400);
  const note = toneSegment(500);
  const samples = concat(speechPart1, briefBreath, speechPart2, realGap, note);
  const result = splitBySilenceGap(samples, SAMPLE_RATE);
  assert.equal(result.hasSplit, true);
  const expectedStart = speechPart1.length + briefBreath.length + speechPart2.length + realGap.length;
  const toleranceSamples = Math.round((30 / 1000) * SAMPLE_RATE) * 2;
  assert.ok(
    Math.abs(result.splitIndex - expectedStart) <= toleranceSamples,
    `splitIndex=${result.splitIndex} بعيد جدًا عن البداية المتوقعة ${expectedStart}`
  );
});

test("كلام قصير جدًا (50مم فقط، أقل من الحد الأدنى) قبل فجوة صمت: لا يُحتسَب كلامًا حقيقيًا، لا انقسام", () => {
  const tooShortSpeech = toneSegment(50); // أقل من الحد الأدنى الافتراضي (120مم)
  const gap = silenceSegment(400);
  const note = toneSegment(500);
  const samples = concat(tooShortSpeech, gap, note);
  const result = splitBySilenceGap(samples, SAMPLE_RATE);
  assert.equal(result.hasSplit, false);
  assert.equal(result.splitIndex, 0);
});

test("مصفوفة فارغة أو sampleRate غير صالح: ترجع نتيجة آمنة بلا استثناء", () => {
  assert.deepEqual(splitBySilenceGap(new Float32Array(0), SAMPLE_RATE), { splitIndex: 0, hasSplit: false });
  assert.deepEqual(splitBySilenceGap(new Float32Array(100), 0), { splitIndex: 0, hasSplit: false });
  assert.deepEqual(splitBySilenceGap(null, SAMPLE_RATE), { splitIndex: 0, hasSplit: false });
});

test("عتبات مخصَّصة (options) تُحترَم — عتبة صمت أعلى تجعل نفس المقطع 'صامتًا' رغم سعة صغيرة", () => {
  const quietTone = toneSegment(300, 0.01); // سعة صغيرة جدًا
  const gap = silenceSegment(400);
  const note = toneSegment(500);
  const samples = concat(quietTone, gap, note);
  // بالعتبة الافتراضية (0.006) هذا النغمة الهادئة قد تُحتسَب صوتًا (سعة > عتبة)
  const defaultResult = splitBySilenceGap(samples, SAMPLE_RATE);
  // بعتبة أعلى من سعة النغمة الهادئة، يصير المقطع كله "صامتًا" فتختفي إمكانية اكتشاف كلام أصلًا
  const highThresholdResult = splitBySilenceGap(samples, SAMPLE_RATE, { silenceRmsThreshold: 0.5 });
  assert.equal(highThresholdResult.hasSplit, false);
  // على الأقل نتأكد الدالة لا تكسر ولا ترمي استثناء بخيارات مخصَّصة، والنتيجتان قد تختلفان
  assert.ok(typeof defaultResult.hasSplit === "boolean");
});

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
