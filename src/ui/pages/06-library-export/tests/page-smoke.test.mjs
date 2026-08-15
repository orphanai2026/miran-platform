/**
 * page-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) لصفحة #6 (المكتبة/التصدير) بعد ربطها فعليًا بـ
 * sample-store.js (صفحة #2) و PersonalReferenceStore (src/calibration/).
 *
 * **نطاق مقصود:** حالة فارغة (لا بيانات)، حالة مع بيانات مزروعة مسبقًا في
 * localStorage (نفس مفتاح صفحة #2)، عرض حالة كل نغمة (عدد العينات/الأيام/
 * الاعتماد/الاسم المُعلَّم)، وتصدير JSON فعلي (تحقق من محتوى الملف المُنزَّل).
 *
 * يُشغَّل بـ: node src/ui/pages/06-library-export/tests/page-smoke.test.mjs
 * **يتطلب خادمًا محليًا** يخدم جذر المستودع (لأن الصفحة تستورد وحدات ES من
 * ../../../calibration/ و ../02-calibration/ بمسارات نسبية تتجاوز مجلد
 * الصفحة نفسها):
 *   python3 -m http.server 8934   # من جذر المستودع
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const BASE_URL =
  process.env.MIRAN_TEST_URL || "http://127.0.0.1:8934/src/ui/pages/06-library-export/index.html";
const STORAGE_KEY = "miran_calibration_samples_v1";

let passed = 0;
let failed = 0;

async function test(name, fn, { seed } = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  try {
    if (seed) {
      // نزرع الحالة في localStorage **قبل** تحميل أي سكربت في الصفحة، لأن
      // mountLibraryPage يقرأها بشكل متزامن عند التحميل.
      await page.addInitScript(
        ([key, value]) => {
          window.localStorage.setItem(key, value);
        },
        [STORAGE_KEY, JSON.stringify(seed)]
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

const SEED_STATE = {
  samples: [
    { pitchHz: 293.5, fingering: "ري", register: "قرار", toleranceCents: 12, neyType: "دوكاه", timestampMs: Date.now() },
    { pitchHz: 294.0, fingering: "ري", register: "قرار", toleranceCents: 10, neyType: "دوكاه", timestampMs: Date.now() },
  ],
  snapshots: {
    "دو::قرار": { pitchHz: 261.6, toleranceCents: 15, approvedAtMs: Date.now() },
  },
  taughtNames: {
    "فا::جواب": "فا",
  },
};

await test("الصفحة تُحمَّل بلا أخطاء JS حقيقية (بلا بيانات مسبقة)", async (page, consoleErrors) => {
  assert.equal(realErrors(consoleErrors).length, 0, `أخطاء كونسول: ${realErrors(consoleErrors).join(" | ")}`);
});

await test("حالة فارغة: رسالة 'لا توجد بيانات' تظهر وزر التصدير معطَّل", async (page) => {
  await assert.doesNotReject(page.locator("#libraryEmpty").waitFor({ state: "visible", timeout: 3000 }));
  const disabled = await page.locator("#libraryExportBtn").isDisabled();
  assert.equal(disabled, true);
  const entries = page.locator(".library-entry");
  assert.equal(await entries.count(), 0);
});

await test(
  "مع بيانات مزروعة: تظهر 3 تركيبات (إصبعة+سجل) بعدد العينات والحالة الصحيحة",
  async (page) => {
    const entries = page.locator(".library-entry");
    assert.equal(await entries.count(), 3);

    const riEntry = page.locator('.library-entry[data-pitch-key="ري::قرار"]');
    await assert.doesNotReject(riEntry.waitFor({ state: "visible", timeout: 3000 }));
    const riCounts = await riEntry.locator(".library-counts").textContent();
    assert.match(riCounts, /عدد العينات: 2/);

    const doEntry = page.locator('.library-entry[data-pitch-key="دو::قرار"]');
    const doBadge = await doEntry.locator(".library-badge").textContent();
    assert.match(doBadge, /مُعتمَد/);

    const faEntry = page.locator('.library-entry[data-pitch-key="فا::جواب"]');
    const faTaught = await faEntry.locator(".library-taught").textContent();
    assert.match(faTaught, /فا/);
  },
  { seed: SEED_STATE }
);

await test(
  "زر تصدير JSON ينزّل ملفًا يحتوي العينات واللقطات والأسماء المزروعة",
  async (page) => {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.locator("#libraryExportBtn").click(),
    ]);
    const path = await download.path();
    const content = JSON.parse(await fs.readFile(path, "utf-8"));
    assert.equal(content.samples.length, 2);
    assert.equal(content.frozenSnapshots["دو::قرار"].pitchHz, 261.6);
    assert.equal(content.taughtNames["فا::جواب"], "فا");

    const hint = await page.locator("#libraryExportHint").textContent();
    assert.match(hint, /2 عينة/);
  },
  { seed: SEED_STATE }
);

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
