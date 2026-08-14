/**
 * pitch-detector.test.mjs
 * يختبر detectPitch بإشارات جيبية اصطناعية معروفة التردد مسبقًا — بلا
 * ميكروفون، بلا متصفح. يُشغَّل بـ: node src/calibration/pitch-detector.test.mjs
 */
import assert from "node:assert/strict";
import { detectPitch, centsBetween } from "./pitch-detector.js";

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(err);
    process.exitCode = 1;
  }
}

/** يبني إشارة جيبية اصطناعية بتردد وسعة معطاة. */
function makeSineWave(frequencyHz, sampleRate, durationSec, amplitude = 0.5) {
  const n = Math.floor(sampleRate * durationSec);
  const buf = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    buf[i] = amplitude * Math.sin((2 * Math.PI * frequencyHz * i) / sampleRate);
  }
  return buf;
}

test("يكشف تردد A4 (440 هرتز) ضمن دقة سنت واحد تقريبًا", () => {
  const sampleRate = 44100;
  const buf = makeSineWave(440, sampleRate, 0.05);
  const { hz } = detectPitch(buf, sampleRate);
  assert.notEqual(hz, null);
  const cents = Math.abs(centsBetween(hz, 440));
  assert.ok(cents < 5, `الانحراف ${cents} سنت أكبر من المتوقع`);
});

test("يكشف تردد منخفض ضمن نطاق الناي (D4 ≈ 293.66 هرتز)", () => {
  const sampleRate = 44100;
  const buf = makeSineWave(293.66, sampleRate, 0.05);
  const { hz } = detectPitch(buf, sampleRate);
  assert.notEqual(hz, null);
  const cents = Math.abs(centsBetween(hz, 293.66));
  assert.ok(cents < 5, `الانحراف ${cents} سنت أكبر من المتوقع`);
});

test("يرجع hz=null على إشارة صمت (سعة صفر)", () => {
  const sampleRate = 44100;
  const buf = new Float32Array(2048); // كله أصفار
  const { hz, rms } = detectPitch(buf, sampleRate);
  assert.equal(hz, null);
  assert.equal(rms, 0);
});

test("يرجع hz=null على ضجيج منخفض السعة جدًا (دون حد الصمت)", () => {
  const sampleRate = 44100;
  const buf = makeSineWave(440, sampleRate, 0.05, 0.0001); // سعة ضعيفة جدًا
  const { hz } = detectPitch(buf, sampleRate);
  assert.equal(hz, null);
});

test("centsBetween: نفس التردد = صفر سنت بالضبط", () => {
  assert.equal(centsBetween(440, 440), 0);
});

test("centsBetween: أوكتاف كامل أعلى = 1200 سنت بالضبط", () => {
  const cents = centsBetween(880, 440);
  assert.ok(Math.abs(cents - 1200) < 1e-9);
});

test("centsBetween: أوكتاف كامل أدنى = -1200 سنت بالضبط", () => {
  const cents = centsBetween(220, 440);
  assert.ok(Math.abs(cents - -1200) < 1e-9);
});

console.log(`\n${passed} اختبارًا ناجحًا.`);
