/**
 * calibration-engine.test.mjs
 * يختبر تطبيق القرارات 1-3 حرفيًا. يُشغَّل بـ:
 * node src/calibration/calibration-engine.test.mjs
 */
import assert from "node:assert/strict";
import {
  CalibrationSample,
  PersonalReferenceStore,
  MIN_ATTEMPTS_FOR_ADOPTION,
} from "./calibration-engine.js";

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

// ============ القرار 3: أبعاد بيانات العينة إلزامية ============

test("القرار 3: يرفض عينة بلا fingering", () => {
  assert.throws(
    () => new CalibrationSample({ pitchHz: 293, register: "low", toleranceCents: 15 }),
    /الإصبعة/
  );
});

test("القرار 3: يرفض عينة بلا register", () => {
  assert.throws(
    () => new CalibrationSample({ pitchHz: 293, fingering: "دو", toleranceCents: 15 }),
    /السجل/
  );
});

test("القرار 3: neyType الافتراضي = دوكاه", () => {
  const s = new CalibrationSample({ pitchHz: 293, fingering: "دو", register: "low", toleranceCents: 15 });
  assert.equal(s.neyType, "دوكاه");
});

test("القرار 3: pitchHz غير صالح (صفر أو سالب) يُرفض", () => {
  assert.throws(() => new CalibrationSample({ pitchHz: 0, fingering: "دو", register: "low", toleranceCents: 15 }));
  assert.throws(() => new CalibrationSample({ pitchHz: -5, fingering: "دو", register: "low", toleranceCents: 15 }));
});

// ============ القرار 2: الوزن والسماحية المشتقة ============

test("القرار 2: المتوسط المُرجَّح يعطي وزنًا أكبر للعينة الأدق (سماحية أضيق)", () => {
  const store = new PersonalReferenceStore();
  // عينة دقيقة جدًا عند 293.66 (سماحية ضيقة = وزن عالٍ)
  store.addSample(new CalibrationSample({ pitchHz: 293.66, fingering: "دو", register: "low", toleranceCents: 5 }));
  // عينة أقل دقة عند 300 (سماحية واسعة = وزن منخفض)
  store.addSample(new CalibrationSample({ pitchHz: 300, fingering: "دو", register: "low", toleranceCents: 25 }));
  const avg = store.computeWeightedAverage("دو", "low");
  // المتوسط يجب أن يكون أقرب لـ293.66 (الوزن الأعلى) من المتوسط الحسابي البسيط (296.83)
  assert.ok(avg < 296.83, `المتوسط ${avg} لم ينحز كفاية نحو العينة الأدق`);
  assert.ok(avg > 293.66);
});

test("القرار 2: السماحية المشتقة من التفاوت الفعلي، لا رقم ثابت", () => {
  const store = new PersonalReferenceStore();
  // عينات متقاربة جدًا → سماحية مشتقة ضيقة (لكن لا تقل عن الحد الأدنى البحثي 10)
  for (let i = 0; i < 5; i++) {
    store.addSample(
      new CalibrationSample({ pitchHz: 293.66 + i * 0.01, fingering: "دو", register: "low", toleranceCents: 15 })
    );
  }
  const derived = store.computeDerivedTolerance("دو", "low");
  assert.ok(derived >= 10 && derived <= 25, `السماحية المشتقة ${derived} خارج النطاق البحثي [10,25]`);
});

test("القرار 2: عينة واحدة فقط → لا سماحية مشتقة محسوبة (null)", () => {
  const store = new PersonalReferenceStore();
  store.addSample(new CalibrationSample({ pitchHz: 293.66, fingering: "دو", register: "low", toleranceCents: 15 }));
  assert.equal(store.computeDerivedTolerance("دو", "low"), null);
});

// ============ القرار 1: ثبات المرجع الشخصي ============

function addNSamplesAcrossDays(store, n, distinctDays, fingering = "دو", register = "low") {
  const dayMs = 24 * 60 * 60 * 1000;
  const baseTime = Date.parse("2026-01-01T00:00:00Z");
  for (let i = 0; i < n; i++) {
    const day = i % distinctDays;
    store.addSample(
      new CalibrationSample({
        pitchHz: 293.66 + (Math.random() - 0.5) * 0.5,
        fingering,
        register,
        toleranceCents: 15,
        timestampMs: baseTime + day * dayMs,
      })
    );
  }
}

test("القرار 1: أقل من 15 محاولة → غير مؤهل حتى لو موزّعة على أيام كثيرة", () => {
  const store = new PersonalReferenceStore();
  addNSamplesAcrossDays(store, MIN_ATTEMPTS_FOR_ADOPTION - 1, 5);
  assert.equal(store.isEligibleForAdoption("دو", "low", "beginner"), false);
});

test("القرار 1: 15 محاولة لكن يوم واحد فقط (مبتدئ) → غير مؤهل", () => {
  const store = new PersonalReferenceStore();
  addNSamplesAcrossDays(store, MIN_ATTEMPTS_FOR_ADOPTION, 1);
  assert.equal(store.isEligibleForAdoption("دو", "low", "beginner"), false);
});

test("القرار 1: 15 محاولة موزّعة على 3 أيام مختلفة (مبتدئ) → مؤهل", () => {
  const store = new PersonalReferenceStore();
  addNSamplesAcrossDays(store, MIN_ATTEMPTS_FOR_ADOPTION, 3);
  assert.equal(store.isEligibleForAdoption("دو", "low", "beginner"), true);
});

test("القرار 1: الاقتراح لا يُعتمد تلقائيًا — approveReference صريح ومنفصل", () => {
  const store = new PersonalReferenceStore();
  addNSamplesAcrossDays(store, MIN_ATTEMPTS_FOR_ADOPTION, 3);
  const suggestion = store.suggestAdoption("دو", "low", "beginner");
  assert.notEqual(suggestion, null);
  // مجرد الاقتراح لا يُنشئ لقطة معتمدة
  assert.equal(store.getFrozenReference("دو", "low"), null);
  store.approveReference("دو", "low", "beginner");
  assert.notEqual(store.getFrozenReference("دو", "low"), null);
});

test("القرار 1: اللقطة الثابتة لا تتحرك تلقائيًا مع عينات جديدة بعد الاعتماد", () => {
  const store = new PersonalReferenceStore();
  addNSamplesAcrossDays(store, MIN_ATTEMPTS_FOR_ADOPTION, 3);
  store.approveReference("دو", "low", "beginner");
  const frozenBefore = store.getFrozenReference("دو", "low").pitchHz;
  // إضافة عينة جديدة متطرفة بعد الاعتماد
  store.addSample(
    new CalibrationSample({ pitchHz: 500, fingering: "دو", register: "low", toleranceCents: 15 })
  );
  const frozenAfter = store.getFrozenReference("دو", "low").pitchHz;
  assert.equal(frozenBefore, frozenAfter, "اللقطة الثابتة تحرّكت تلقائيًا — يجب ألا تتحرك دون اعتماد يدوي جديد");
});

test("القرار 1: الاعتماد يفشل صراحة إذا لم تُستوفَ الشروط بعد", () => {
  const store = new PersonalReferenceStore();
  addNSamplesAcrossDays(store, 5, 1); // غير كافٍ
  assert.throws(() => store.approveReference("دو", "low", "beginner"));
});

test("القرار 1: محترف — جلسة واحدة (يوم واحد) بتقارب أعلى تكفي دون حاجة 3 أيام", () => {
  const store = new PersonalReferenceStore();
  const baseTime = Date.parse("2026-01-01T00:00:00Z");
  // عينات شديدة التقارب في يوم واحد فقط
  for (let i = 0; i < MIN_ATTEMPTS_FOR_ADOPTION; i++) {
    store.addSample(
      new CalibrationSample({
        pitchHz: 293.66 + i * 0.001, // تفاوت ضئيل جدًا
        fingering: "دو",
        register: "low",
        toleranceCents: 15,
        timestampMs: baseTime,
      })
    );
  }
  assert.equal(store.isEligibleForAdoption("دو", "low", "professional"), true);
});

test("القرار 1: محترف بتفاوت واسع في يوم واحد → غير مؤهل (التقارب غير كافٍ)", () => {
  const store = new PersonalReferenceStore();
  const baseTime = Date.parse("2026-01-01T00:00:00Z");
  for (let i = 0; i < MIN_ATTEMPTS_FOR_ADOPTION; i++) {
    store.addSample(
      new CalibrationSample({
        pitchHz: 293.66 + (i % 2 === 0 ? -8 : 8), // تفاوت واسع متذبذب
        fingering: "دو",
        register: "low",
        toleranceCents: 15,
        timestampMs: baseTime,
      })
    );
  }
  assert.equal(store.isEligibleForAdoption("دو", "low", "professional"), false);
});

test("استثناء القرار 1: عينة صوت واحدة تكفي لتعليم *اسم* النغمة فقط، لا مرجعها الرقمي", () => {
  const store = new PersonalReferenceStore();
  store.teachPitchName("دو", "low", "دو الجواب");
  assert.equal(store.getTaughtName("دو", "low"), "دو الجواب");
  // تعليم الاسم لا يُنشئ أي مرجع رقمي معتمد أو مقترح
  assert.equal(store.getFrozenReference("دو", "low"), null);
  assert.equal(store.suggestAdoption("دو", "low", "beginner"), null);
});

console.log(`\n${passed} اختبارًا ناجحًا.`);
