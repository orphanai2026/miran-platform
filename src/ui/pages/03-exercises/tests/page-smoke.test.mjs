/**
 * page-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) لصفحة #3 (التمارين) — إطار مضمّن (iframe) يحمّل
 * src/exercises/legacy-miran/index.html الموجود والمُختبر فعليًا
 * (baseline-regression.test.mjs، 9/9 ناجح)، تحت شريط علوي ثابت برابط رجوع
 * لصفحة #1 (الرئيسية) — القضية المُصلَحة هذي المرحلة: التوجيه الفوري القديم
 * (meta refresh) كان يُخرج المستخدم من المنصة كليًا بلا أي طريق رجوع سوى
 * زر رجوع المتصفح.
 *
 * **لماذا إطار مضمّن لا صفحة مبنية من جديد:** القرار الصريح في سجل القرارات
 * (القسم 4 والقسم 7) هو "منقول كاملًا من مِران، بلا تعديل بنيوي" — منهج
 * الـ74 يومًا منقول ومُختبر بالفعل في src/exercises/legacy-miran/، وهو
 * ملف محمي (src/exercises/** في ARCHITECTURE.md) لا يُعدَّل إلا بقرار
 * صريح جديد. الإطار المضمّن يحمّل ذلك الملف حرفيًا بلا أي تعديل عليه —
 * شريط الرجوع عنصر في صفحة #3 نفسها فقط (آمنة للتعديل الحر).
 *
 * نطاق مقصود: الإطار المضمّن يحمّل صفحة المنهج الحقيقية العاملة بلا 404 ولا
 * استثناء JS، شريط الرجوع موجود ويشير لصفحة #1 بالمسار النسبي الصحيح، بلا
 * تكرار اختبارات baseline-regression نفسها.
 *
 * يُشغَّل بـ: node src/ui/pages/03-exercises/tests/page-smoke.test.mjs
 * يتطلب خادمًا محليًا يخدم جذر المستودع:
 *   python3 -m http.server 8934   # من جذر المستودع
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const ENTRY_URL =
  process.env.MIRAN_TEST_URL || "http://127.0.0.1:8934/src/ui/pages/03-exercises/index.html";

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

await test("شريط الرجوع موجود ويشير لصفحة #1 (الرئيسية) بالمسار الصحيح", async (page) => {
  await page.goto(ENTRY_URL, { waitUntil: "load" });
  const back = page.locator(".exercises-back");
  await assert.doesNotReject(back.waitFor({ state: "visible", timeout: 2000 }));
  assert.equal(await back.getAttribute("href"), "../01-home/index.html");
});

await test(
  "الإطار المضمّن يحمّل صفحة المنهج الحقيقية العاملة (بلا 404، بلا استثناء JS)",
  async (page, consoleErrors) => {
    await page.goto(ENTRY_URL, { waitUntil: "load" });
    const frame = page.frameLocator(".exercises-frame");
    await assert.doesNotReject(
      frame.locator("#view-home").waitFor({ state: "visible", timeout: 5000 }),
      "لم يظهر #view-home داخل الإطار المضمّن — تحقق من مسار src"
    );
    assert.equal(
      realErrors(consoleErrors).length,
      0,
      `أخطاء كونسول بعد تحميل الإطار: ${realErrors(consoleErrors).join(" | ")}`
    );
  }
);

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
