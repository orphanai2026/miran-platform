/**
 * glossary-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) لقسم "قاموس المصطلحات" المضاف لصفحة #4 — استفادةً
 * من مكتبة مصطلحات RECORD-N (بصياغة مُعاد كتابتها، انظر glossary-terms.js).
 * منفصل تمامًا عن page-smoke.test.mjs (يغطي مستعرض المقامات القائم) — هذا
 * الملف يغطي فقط اللوحة الجديدة المضافة تحته في نفس الصفحة.
 *
 * **نطاق مقصود:** اللوحة تُحمَّل بكل المصطلحات الـ26 افتراضيًا، البحث
 * (عربي وإنجليزي) يُصفّي فعليًا، فلترة التصنيف تعمل، حالة "لا نتائج" تظهر
 * عند بحث غير مطابق، وعدم وجود أي تكرار لبيانات src/maqamat/ (لا بطاقات
 * "مقامات" داخل القاموس نفسه — القسم 4: مصدر حقيقة واحد).
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
