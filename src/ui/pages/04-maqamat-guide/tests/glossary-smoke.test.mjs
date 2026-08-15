/**
 * glossary-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) لقاموس المصطلحات — مدمَج بالكامل داخل بطاقته الخاصة
 * ضمن لوحة "مرجع نظري سريع" (لا قسم مستقل أسفل الصفحة، بطلب صريح من
 * المالك). استفادةً من مكتبة مصطلحات RECORD-N (بصياغة مُعاد كتابتها، انظر
 * glossary-terms.js). منفصل تمامًا عن page-smoke.test.mjs (مستعرض المقامات)
 * وtheory-reference-smoke.test.mjs (بقية الأقسام السبعة).
 *
 * **نطاق مقصود:** فتح بطاقة "المصطلحات الموسيقية" يُحمِّل اللوحة بكل
 * المصطلحات الـ26 افتراضيًا، البحث (عربي وإنجليزي) يُصفّي فعليًا، فلترة
 * التصنيف تعمل، وحالة "لا نتائج" تظهر عند بحث غير مطابق.
 *
 * يُشغَّل بـ: node src/ui/pages/04-maqamat-guide/tests/glossary-smoke.test.mjs
 * يتطلب خادمًا محليًا يخدم جذر المستودع:
 *   python3 -m http.server 8934   # من جذر المستودع
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL =
  process.env.MIRAN_TEST_URL || "http://127.0.0.1:8934/src/ui/pages/04-maqamat-guide/index.html";

let passed = 0;
let failed = 0;

async function test(name, fn) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(BASE_URL, { waitUntil: "load" });
    // القاموس مدمَج داخل بطاقته — يحتاج فتحها أولًا قبل أي تحقق.
    await page.locator('[data-toggle="glossary"]').click();
    await page.locator("#glossarySearch").waitFor({ state: "visible", timeout: 3000 });
    await fn(page);
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

await test("اللوحة تُحمَّل بكل المصطلحات الـ26 افتراضيًا (بلا بحث ولا فلترة)", async (page) => {
  const cards = page.locator(".glossary-card");
  assert.equal(await cards.count(), 26);
});

await test(
  "البحث بالعربية ('الجنس') يُصفّي فعليًا (نتيجتان: مصطلح 'الجنس' نفسه، و'القرار' الذي يذكره في تعريفه)",
  async (page) => {
    await page.locator("#glossarySearch").fill("الجنس");
    await page.waitForTimeout(50);
    const cards = page.locator(".glossary-card");
    assert.equal(await cards.count(), 2);
    await assert.doesNotReject(page.locator(".glossary-ar", { hasText: "الجنس" }).waitFor({ state: "visible" }));
  }
);

await test("البحث بالإنجليزية ('Sayr') يجد نفس مصطلح 'السِّير' العربي", async (page) => {
  await page.locator("#glossarySearch").fill("Sayr");
  await page.waitForTimeout(50);
  const cards = page.locator(".glossary-card");
  assert.equal(await cards.count(), 1);
  await assert.doesNotReject(page.locator(".glossary-ar", { hasText: "السِّير" }).waitFor({ state: "visible" }));
});

await test("فلترة تصنيف 'المقام' تعرض فقط مصطلحات هذا التصنيف (6 مصطلحات)", async (page) => {
  await page.locator('.glossary-cat-pill[data-category="المقام"]').click();
  await page.waitForTimeout(50);
  const cards = page.locator(".glossary-card");
  assert.equal(await cards.count(), 6);
  const cats = await page.locator(".glossary-cat").allTextContents();
  for (const c of cats) assert.equal(c, "المقام");
});

await test("بحث بلا نتائج يعرض رسالة 'لا توجد مصطلحات مطابقة'", async (page) => {
  await page.locator("#glossarySearch").fill("zzz-not-a-term");
  await page.waitForTimeout(50);
  assert.equal(await page.locator(".glossary-card").count(), 0);
  await assert.doesNotReject(page.locator(".glossary-empty").waitFor({ state: "visible", timeout: 2000 }));
});

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
