/**
 * page-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) لصفحة #7 (الإعدادات + المزامنة) — كود المزامنة
 * (معرّف المستخدم المحلي)، إعدادات السماحية، ونقل البيانات.
 *
 * **نطاق مقصود:** تحميل بلا أخطاء، توليد/ثبات معرّف المستخدم المحلي عبر
 * إعادة التحميل (نفس نمط اختبار "بقاء الاسم المُعلَّم" في صفحة #2)، عرض
 * صحيح لحدود السماحية من calibration-engine.js، ورابط صحيح لصفحة
 * المكتبة/التصدير.
 *
 * يُشغَّل بـ: node src/ui/pages/07-settings-sync/tests/page-smoke.test.mjs
 * **يتطلب خادمًا محليًا** يخدم جذر المستودع (لأن الصفحة تستورد وحدات ES من
 * ../../../calibration/ بمسار نسبي يتجاوز مجلد الصفحة نفسها):
 *   python3 -m http.server 8934   # من جذر المستودع
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL =
  process.env.MIRAN_TEST_URL || "http://127.0.0.1:8934/src/ui/pages/07-settings-sync/index.html";

let passed = 0;
let failed = 0;

async function test(name, fn) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  try {
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

await test("الصفحة تُحمَّل بلا أخطاء JS حقيقية", async (page, consoleErrors) => {
  assert.equal(realErrors(consoleErrors).length, 0, `أخطاء كونسول: ${realErrors(consoleErrors).join(" | ")}`);
});

await test("كود المزامنة (معرّف المستخدم المحلي) يظهر بصيغة UUID غير فارغة", async (page) => {
  const idText = await page.locator("#settingsUserId").textContent();
  assert.match(idText.trim(), /^[0-9a-f-]{20,}$/i, `معرّف غير متوقَّع الشكل: "${idText}"`);
});

await test("معرّف المستخدم المحلي يبقى ثابتًا بعد إعادة تحميل الصفحة (نفس الجهاز/localStorage)", async (page) => {
  const before = (await page.locator("#settingsUserId").textContent()).trim();
  await page.reload({ waitUntil: "load" });
  const after = (await page.locator("#settingsUserId").textContent()).trim();
  assert.equal(before, after, "المعرّف يجب أن يبقى ثابتًا، لا يُعاد توليده مع كل تحميل");
});

await test("إعدادات السماحية تعرض حدود القرار 2 الصحيحة (±10 إلى ±25 سنت)", async (page) => {
  const min = await page.locator("#settingsToleranceMin").textContent();
  const max = await page.locator("#settingsToleranceMax").textContent();
  assert.match(min, /10/);
  assert.match(max, /25/);
});

await test("رابط 'اذهب لصفحة المكتبة/التصدير' يشير للمسار النسبي الصحيح", async (page) => {
  const href = await page.locator("#settingsExportLink").getAttribute("href");
  assert.equal(href, "../06-library-export/index.html");
});

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
