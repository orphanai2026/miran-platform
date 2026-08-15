/**
 * page-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) لصفحة #1 (الرئيسية) — نظرة عامة، تقدّم المتعلم،
 * دخول سريع للمرحلة الحالية (القسم 7).
 *
 * **نطاق مقصود:** حالة فارغة (لا بيانات تقدّم من أي نوع)، حالة مع بيانات
 * منهج مزروعة (مفتاح localStorage الخام miran_prog كما يكتبه persistence.js
 * المحمي — قراءة فقط، بلا استيراد لذلك الملف)، حالة مع بيانات معايرة مزروعة
 * (نفس مفتاح صفحة #2)، وجود كل روابط الدخول السريع السبعة بمساراتها
 * الصحيحة، وثبات المعرّف المحلي (نفس منطق صفحة #7).
 *
 * يُشغَّل بـ: node src/ui/pages/01-home/tests/page-smoke.test.mjs
 * **يتطلب خادمًا محليًا** يخدم جذر المستودع (المسارات النسبية للوحدات
 * تتجاوز مجلد الصفحة نفسها إلى src/calibration/، 02-calibration/،
 * و07-settings-sync/):
 *   python3 -m http.server 8934   # من جذر المستودع
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL = process.env.MIRAN_TEST_URL || "http://127.0.0.1:8934/src/ui/pages/01-home/index.html";
const CALIBRATION_KEY = "miran_calibration_samples_v1";
const LEGACY_PROGRESS_KEY = "miran_prog";

let passed = 0;
let failed = 0;

async function test(name, fn, { seedCalibration, seedProgress } = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  try {
    if (seedCalibration || seedProgress) {
      await page.addInitScript(
        ([calKey, calVal, progKey, progVal]) => {
          if (calVal) window.localStorage.setItem(calKey, calVal);
          if (progVal) window.localStorage.setItem(progKey, progVal);
        },
        [
          CALIBRATION_KEY,
          seedCalibration ? JSON.stringify(seedCalibration) : null,
          LEGACY_PROGRESS_KEY,
          seedProgress ? JSON.stringify(seedProgress) : null,
        ]
      );
    }
    await page.goto(BASE_URL, { waitUntil: "load" });
    await fn(page, consoleErrors);
    passed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
  } finally {
    await browser.close();
  }
}

function realErrors(consoleErrors) {
  return consoleErrors.filter(
    (e) => !e.includes("fonts.googleapis.com") && !e.includes("fonts.gstatic.com") && !e.includes("403")
  );
}

await test("الصفحة تُحمَّل بلا أخطاء JS حقيقية (بلا أي بيانات مسبقة)", async (page, consoleErrors) => {
  assert.equal(realErrors(consoleErrors).length, 0, `أخطاء كونسول: ${realErrors(consoleErrors).join(" | ")}`);
});

await test("حالة فارغة: عدّادات التقدّم كلها صفر، ومرحلة النفَس 'لم تبدأ'", async (page) => {
  assert.equal((await page.locator("#homeCurriculumDone").textContent()).trim(), "0");
  assert.equal((await page.locator("#homeFoundationStatus").textContent()).trim(), "لم تبدأ");
  assert.equal((await page.locator("#homeCalibrationNotes").textContent()).trim(), "0");
  assert.equal((await page.locator("#homeCalibrationFrozen").textContent()).trim(), "0");
});

await test(
  "روابط الدخول السريع السبعة كلها موجودة بمساراتها النسبية الصحيحة",
  async (page) => {
    const links = page.locator(".home-quick-link");
    assert.equal(await links.count(), 7);
    const expectedHrefs = [
      "../03-exercises/index.html",
      "../02-calibration/index.html",
      "../04-maqamat-guide/index.html",
      "../05-metronome/index.html",
      "../06-library-export/index.html",
      "../08-teaching-guide/index.html",
      "../09-about/index.html",
    ];
    for (const href of expectedHrefs) {
      const link = page.locator(`.home-quick-link[href="${href}"]`);
      await assert.doesNotReject(link.waitFor({ state: "visible", timeout: 2000 }), `رابط مفقود: ${href}`);
    }
    const primary = page.locator(".home-quick-link.primary");
    assert.equal(await primary.getAttribute("href"), "../03-exercises/index.html");
  }
);

await test(
  "المعرّف المحلي يظهر ويبقى ثابتًا بعد إعادة التحميل (نفس منطق صفحة #7)",
  async (page) => {
    const before = (await page.locator("#homeUserId").textContent()).trim();
    assert.match(before, /^[0-9a-f-]{20,}$/i);
    await page.reload({ waitUntil: "load" });
    const after = (await page.locator("#homeUserId").textContent()).trim();
    assert.equal(before, after);
  }
);

await test(
  "تقدّم منهج مزروع (3 أيام مُتقنة، مرحلة النفَس بدأت) يظهر بشكل صحيح",
  async (page) => {
    assert.equal((await page.locator("#homeCurriculumDone").textContent()).trim(), "3");
    assert.equal((await page.locator("#homeFoundationStatus").textContent()).trim(), "بدأت");
  },
  { seedProgress: { done: { 1: true, 2: true, 3: true }, foundation: { breath: true } } }
);

await test(
  "بيانات معايرة مزروعة (نغمتان، واحدة معتمدة) تظهر بشكل صحيح",
  async (page) => {
    assert.equal((await page.locator("#homeCalibrationNotes").textContent()).trim(), "2");
    assert.equal((await page.locator("#homeCalibrationFrozen").textContent()).trim(), "1");
  },
  {
    seedCalibration: {
      samples: [
        { pitchHz: 293.5, fingering: "ري", register: "قرار", toleranceCents: 12, neyType: "دوكاه", timestampMs: Date.now() },
      ],
      snapshots: {
        "دو::قرار": { pitchHz: 261.6, toleranceCents: 15, approvedAtMs: Date.now() },
      },
      taughtNames: {},
    },
  }
);

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
