/**
 * metronome-engine.test.mjs
 * اختبار رجعي للمنطق الخالص في المحرك — بلا AudioContext، بلا إطار اختبار خارجي
 * (Node.js assert المدمج فقط)، تماشيًا مع مبدأ "بلا اعتماديات" (القسم 4).
 *
 * يُشغَّل بـ: node src/metronome/metronome-engine.test.mjs
 * القرار المعماري: "ميزة واحدة لكل إصدار + اختبار رجعي كامل قبل كل دمج".
 */
import assert from "node:assert/strict";
import { MetronomeEngine } from "./metronome-engine.js";

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

test("secondsPerBeat: bpm=60 → ثانية واحدة بالضبط", () => {
  const m = new MetronomeEngine({ bpm: 60 });
  assert.equal(m.secondsPerBeat(), 1.0);
});

test("secondsPerBeat: bpm=120 → نصف ثانية", () => {
  const m = new MetronomeEngine({ bpm: 120 });
  assert.equal(m.secondsPerBeat(), 0.5);
});

test("computeNextNoteTime: يجمع secondsPerBeat على الوقت الحالي دون انجراف", () => {
  const m = new MetronomeEngine({ bpm: 80 });
  const t0 = 10.0;
  const t1 = m.computeNextNoteTime(t0);
  const t2 = m.computeNextNoteTime(t1);
  assert.ok(Math.abs(t1 - t0 - 60 / 80) < 1e-9);
  assert.ok(Math.abs(t2 - t1 - 60 / 80) < 1e-9);
});

test("advanceBeat: يدور ضمن beatsPerMeasure ويعود للصفر", () => {
  const m = new MetronomeEngine({ beatsPerMeasure: 4 });
  let beat = 0;
  const sequence = [];
  for (let i = 0; i < 9; i++) {
    sequence.push(beat);
    beat = m.advanceBeat(beat);
  }
  assert.deepEqual(sequence, [0, 1, 2, 3, 0, 1, 2, 3, 0]);
});

test("advanceBeat: يدعم beatsPerMeasure=3 (ميزان ثلاثي)", () => {
  const m = new MetronomeEngine({ beatsPerMeasure: 3 });
  let beat = 0;
  const sequence = [];
  for (let i = 0; i < 6; i++) {
    sequence.push(beat);
    beat = m.advanceBeat(beat);
  }
  assert.deepEqual(sequence, [0, 1, 2, 0, 1, 2]);
});

test("setBpm: يرفض قيمًا غير صالحة (صفر، سالب، NaN)", () => {
  const m = new MetronomeEngine();
  assert.throws(() => m.setBpm(0), RangeError);
  assert.throws(() => m.setBpm(-10), RangeError);
  assert.throws(() => m.setBpm(NaN), RangeError);
});

test("setBpm: يقبل قيمة صالحة ويحدّث secondsPerBeat فورًا", () => {
  const m = new MetronomeEngine({ bpm: 80 });
  m.setBpm(100);
  assert.equal(m.bpm, 100);
  assert.equal(m.secondsPerBeat(), 0.6);
});

test("setBeatsPerMeasure: يرفض قيمًا غير صحيحة (غير عدد صحيح موجب)", () => {
  const m = new MetronomeEngine();
  assert.throws(() => m.setBeatsPerMeasure(0), RangeError);
  assert.throws(() => m.setBeatsPerMeasure(2.5), RangeError);
  assert.throws(() => m.setBeatsPerMeasure(-1), RangeError);
});

test("onBeat: يسجّل المستمع في _beatListeners ويزيله عند إلغاء الاشتراك", () => {
  // اختبار بلا AudioContext عمدًا: نتحقق من إدارة قائمة المستمعين مباشرة
  // بدل استدعاء _scheduleNote (الذي يستدعي _playClick ويحتاج متصفحًا فعليًا).
  const m = new MetronomeEngine();
  const listener = () => {};
  const unsubscribe = m.onBeat(listener);
  assert.equal(m._beatListeners.includes(listener), true);
  unsubscribe();
  assert.equal(m._beatListeners.includes(listener), false);
});

test("isRunning: false افتراضيًا قبل start()", () => {
  const m = new MetronomeEngine();
  assert.equal(m.isRunning, false);
});

console.log(`\n${passed} اختبارًا ناجحًا.`);
