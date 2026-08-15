/**
 * page-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) لصفحة #3 (التمارين) — نقطة دخول رقيقة (meta refresh)
 * تُعيد التوجيه فورًا لـ src/exercises/legacy-miran/index.html الموجود
 * والمُختبر فعليًا (baseline-regression.test.mjs، 9/9 ناجح).
 *
 * **لماذا نقطة دخول لا صفحة مبنية من جديد:** القرار الصريح في سجل القرارات
 * (القسم 4 والقسم 7) هو "منقول كاملًا من مِران، بلا تعديل بنيوي" — منهج
 * الـ74 يومًا منقول ومُختبر بالفعل في `src/exercises/legacy-miran/`، وهو
 * ملف محمي (`src/exercises/**` في ARCHITECTURE.md) لا يُعدَّل إلا بقرار
 * صريح جديد. إعادة بنائه هنا كانت ستخالف "بلا تعديل بنيوي" حرفيًا.
 *
 * **نطاق مقصود:** التحقق أن التوجيه يعمل فعليًا ويصل لصفحة المنهج الحقيقية
 * العاملة (لا رابط معطَّل)، بلا تكرار اختبارات baseline-regression نفسها.
 *
 * يُشغَّل بـ: node src/ui/pages/03-exercises/tests/page-smoke.test.mjs
 * **يتطلب خادمًا محليًا** يخدم جذر المستودع:
 *   python3 -m http.server 8934   # من جذر المستودع
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const ENTRY_URL =
  process.env.MIRAN_TEST_URL || "http://127.0.0.1:8934/src/ui/pages/03-exercises/index.html";

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
  }
}

function realErrors(consoleErrors) {
  return consoleErrors.filter(
    (e) => !e.includes("fonts.googleapis.com") && !e.includes("fonts.gstatic.com") && !e.includes("403")
  );
}

await test("مصدر الصفحة يحتوي meta refresh ورابط رجوع يدوي للمسار النسبي الصحيح", async () => {
  // نقرأ HTML الخام مباشرة (لا متصفحًا) — التحويل فوري (content="0") لذا أي
  // فحص DOM حي في متصفح يتسابق مع التنقّل التلقائي نفسه.
  const res = await fetch(ENTRY_URL);
  const html = await res.text();
  assert.match(html, /http-equiv="refresh"/);
  assert.match(html, /url=\.\.\/\.\.\/\.\.\/exercises\/legacy-miran\/index\.html/);
  assert.match(html, /href="\.\.\/\.\.\/\.\.\/exercises\/legacy-miran\/index\.html"/);
});

await test(
  "التنقّل الفعلي من نقطة الدخول يصل لصفحة المنهج الحقيقية العاملة (بلا 404، بلا استثناء JS)",
  async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on("pageerror", (err) => consoleErrors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    try {
      await page.goto(ENTRY_URL);
      // ننتظر وصول الرابط النهائي فعليًا (قد يحدث فورًا أو خلال أجزاء من الثانية).
      await page.waitForURL(/legacy-miran\/index\.html/, { timeout: 5000 });
      await page.waitForLoadState("load");
      assert.equal(
        realErrors(consoleErrors).length,
        0,
        `أخطاء كونسول بعد التوجيه: ${realErrors(consoleErrors).join(" | ")}`
      );
      await assert.doesNotReject(page.locator("#view-home").waitFor({ state: "visible", timeout: 3000 }));
    } finally {
      await browser.close();
    }
  }
);

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
