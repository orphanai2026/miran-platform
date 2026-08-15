/**
 * maqam-schema.test.mjs
 * يُشغَّل بـ: node src/maqamat/maqam-schema.test.mjs
 */
import assert from "node:assert/strict";
import { defineJins, defineMaqam, SayrEntry, validateSayr, VALIDATION_STATUS, INTERVAL_TYPES } from "./maqam-schema.js";
import { MAQAM_SABA, MAQAM_AJAM, MAQAM_RAST, ALL_MAQAMAT, ALL_JINS, JINS_SABA, JINS_UPPER_RAST } from "./maqam-data.js";

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

// ============ defineJins ============

test("defineJins: يرفض جنسًا بلا مصدر موثَّق (القرار 5)", () => {
  assert.throws(() => defineJins({ name: "تجريبي", intervalPattern: [INTERVAL_TYPES.WHOLE] }), /مصدر/);
});

test("defineJins: يرفض نوع بُعد غير معروف", () => {
  assert.throws(
    () => defineJins({ name: "تجريبي", intervalPattern: ["unknown_type"], source: "test" }),
    /نوع بُعد غير معروف/
  );
});

test("defineJins: يرفض نمط أبعاد فارغ", () => {
  assert.throws(() => defineJins({ name: "تجريبي", intervalPattern: [], source: "test" }));
});

// ============ defineMaqam: سلسلة الأجناس ============

test("defineMaqam: يرفض مقامًا بلا أي جنس (سلسلة فارغة)", () => {
  assert.throws(() => {
    defineMaqam({
      name: "تجريبي",
      jinsChain: [],
      qarar: "دو",
      ghammaz: "صول",
    });
  });
});

test("defineMaqam: يقبل سلسلة من 3 أجناس (حالة صبا)", () => {
  assert.equal(MAQAM_SABA.jinsChain.length, 3);
});

test("defineMaqam: يرفض startDegree غير صحيح (صفر، سالب، غير عدد صحيح)", () => {
  assert.throws(() =>
    defineMaqam({
      name: "تجريبي",
      jinsChain: [
        { jins: JINS_SABA, startDegree: 0 },
        { jins: JINS_SABA, startDegree: 3 },
      ],
      qarar: "دو",
      ghammaz: "صول",
    })
  );
});

// ============ القرار الصريح: صبا يستخدم عجم لا نكريز ============

test("مقام صبا: الجنس الثالث هو عجم (لا نكريز) — القرار الصريح في سجل القرارات", () => {
  const thirdSegment = MAQAM_SABA.jinsChain[2];
  assert.equal(thirdSegment.jins.name, "عجم");
  assert.notEqual(thirdSegment.jins.name, "نكريز");
});

test("مقام صبا: الجنس الثالث يبدأ على الدرجة 6 كما وثّقته MaqamWorld", () => {
  assert.equal(MAQAM_SABA.jinsChain[2].startDegree, 6);
});

test("مقام صبا: الجنس الثاني (حجاز) يبدأ على الدرجة 3 كما وثّقته MaqamWorld", () => {
  assert.equal(MAQAM_SABA.jinsChain[1].jins.name, "حجاز");
  assert.equal(MAQAM_SABA.jinsChain[1].startDegree, 3);
});

// ============ السِّير اللحني ومصادقته (القرار 5) ============

test("SayrEntry: يبدأ دائمًا بحالة غير مصادَق عليها (؟) حتى لو لم تُستدعَ validateSayr", () => {
  const sayr = new SayrEntry({
    qarar: "ري",
    ghammaz: "فا",
    direction: "ascending",
    startingJins: "lower",
    source: "اختبار",
  });
  assert.equal(sayr.validationStatus, VALIDATION_STATUS.UNVALIDATED);
  assert.equal(sayr.isValidated, false);
  assert.equal(sayr.displayLabel(), "ascending ؟");
});

test("SayrEntry: يرفض اتجاهًا غير معروف", () => {
  assert.throws(() =>
    new SayrEntry({ qarar: "ري", ghammaz: "فا", direction: "sideways", startingJins: "lower", source: "test" })
  );
});

test("SayrEntry: يرفض جنس بداية بلا مصدر (القرار 5: يحتاج مصدرًا قبل الاستخراج)", () => {
  assert.throws(() =>
    new SayrEntry({ qarar: "ري", ghammaz: "فا", direction: "ascending", startingJins: "lower" })
  );
});

test("validateSayr: توافق ثنائي كامل → مصادَق، بلا علامة ؟", () => {
  const sayr = new SayrEntry({
    qarar: "ري",
    ghammaz: "فا",
    direction: "mixed",
    startingJins: "upper",
    source: "اختبار",
  });
  validateSayr(sayr, { ownerAgrees: true, expertAgrees: true, expertName: "خبير تجريبي" });
  assert.equal(sayr.isValidated, true);
  assert.equal(sayr.displayLabel(), "mixed");
});

test("validateSayr: موافقة المالك وحده بلا الخبير → يبقى ؟ (توافق ثنائي مطلوب)", () => {
  const sayr = new SayrEntry({
    qarar: "ري",
    ghammaz: "فا",
    direction: "descending",
    startingJins: "lower",
    source: "اختبار",
  });
  validateSayr(sayr, { ownerAgrees: true, expertAgrees: false });
  assert.equal(sayr.isValidated, false);
  assert.equal(sayr.displayLabel(), "descending ؟");
});

// ============ سلامة بيانات المصدر الموثّق ============

test("جميع الأجناس المُعرَّفة تحمل مصدرًا موثَّقًا غير فارغ", () => {
  for (const jins of ALL_JINS) {
    assert.ok(jins.source && jins.source.length > 0, `الجنس "${jins.name}" بلا مصدر`);
  }
});

test("جميع المقامات المُعرَّفة: sayr = null (لم تُصادَق عليه بعد) — لا اعتماد افتراضي", () => {
  for (const maqam of ALL_MAQAMAT) {
    assert.equal(maqam.sayr, null, `المقام "${maqam.name}" لا يجب أن يحمل سِّيرًا مُعتمَدًا مسبقًا بلا مصادقة صريحة`);
  }
});

test("جنس عجم: نمط الأبعاد whole-whole-half كما هو موثّق (الأكثر اتفاقًا بين المصادر)", () => {
  assert.deepEqual(MAQAM_AJAM.jinsChain[0].jins.intervalPattern, [
    INTERVAL_TYPES.WHOLE,
    INTERVAL_TYPES.WHOLE,
    INTERVAL_TYPES.HALF,
  ]);
});

// ============ إكمال الفجوة الموثَّقة: جنس راست العلوي في مقام راست ============

test("مقام راست: مكتمل الآن بجنسين لا جنس واحد فقط (الفجوة الموثَّقة سابقًا مُغلَقة)", () => {
  assert.equal(MAQAM_RAST.jinsChain.length, 2);
});

test("مقام راست: الجنس الثاني هو راست علوي، يبدأ على الدرجة 5 (غماز جنس راست الأول)", () => {
  const secondSegment = MAQAM_RAST.jinsChain[1];
  assert.equal(secondSegment.jins.name, "راست علوي");
  assert.equal(secondSegment.startDegree, 5);
});

test("جنس راست علوي: نمط أبعاده أول 3 أبعاد من راست فقط (4 درجات لا 5) كما وثّقته MaqamWorld", () => {
  assert.deepEqual(JINS_UPPER_RAST.intervalPattern, [
    INTERVAL_TYPES.WHOLE,
    INTERVAL_TYPES.THREE_QUARTER,
    INTERVAL_TYPES.THREE_QUARTER,
  ]);
});

console.log(`\n${passed} اختبارًا ناجحًا.`);
