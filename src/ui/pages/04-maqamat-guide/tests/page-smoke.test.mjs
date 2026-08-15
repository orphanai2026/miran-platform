/**
 * page-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) لصفحة #4 (دليل المقامات) بعد ربطها فعليًا بـ
 * ALL_MAQAMAT من src/maqamat/maqam-data.js عبر maqamat-page.js.
 *
 * **نطاق مقصود:** تحميل، عناصر DOM أساسية (قائمة المقامات، لوحة التفاصيل)،
 * تحديد مقام أول تلقائيًا عند التحميل، التنقّل بين المقامات عبر الضغط،
 * وعرض علامة "؟" الصريحة لكل سِّير غير مصادَق عليه (كل بيانات maqam-data.js
 * الحالية sayr=null، لذا كل مقام يجب أن يعرض هذي العلامة — القرار 5).
 *
 * يُشغَّل بـ: node src/ui/pages/04-maqamat-guide/tests/page-smoke.test.mjs
 * **يتطلب خادمًا محليًا** يخدم جذر المستودع (لأن الصفحة تستورد وحدات ES من
 * ../../../maqamat/ بمسارات نسبية تتجاوز مجلد الصفحة نفسها):
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

await test("قائمة المقامات تعرض 9 أزرار (عدد ALL_MAQAMAT الحالي — تسعة، بعد إضافة سيكا وكرد ونهاوند ونكريز)", async (page) => {
  const buttons = page.locator(".maqam-list-btn");
  assert.equal(await buttons.count(), 9);
});

await test("أول مقام مُحدَّد تلقائيًا عند التحميل (عجم، أول عنصر في ALL_MAQAMAT)", async (page) => {
  const detailsName = await page.locator("#maqamDetailsName").textContent();
  assert.equal(detailsName, "عجم");
  const activeBtn = page.locator(".maqam-list-btn.active");
  assert.equal(await activeBtn.textContent(), "عجم");
});

await test("الضغط على مقام آخر (صبا) يحدّث لوحة التفاصيل: القرار/الغماز وسلسلة الأجناس", async (page) => {
  await page.locator('.maqam-list-btn[data-maqam-name="صبا"]').click();
  await page.waitForTimeout(50);
  const detailsName = await page.locator("#maqamDetailsName").textContent();
  assert.equal(detailsName, "صبا");
  const qarar = await page.locator("#maqamQarar").textContent();
  assert.match(qarar, /ري/);
  const jinsSegments = page.locator("#maqamJinsChain .jins-segment");
  // صبا موثّق بثلاثة أجناس متتالية (صبا ← حجاز ← عجم، لا نكريز — القرار 5)
  assert.equal(await jinsSegments.count(), 3);
});

await test('كل مقام يعرض علامة "؟" صريحة للسِّير غير المصادَق عليه (كل sayr=null حاليًا)', async (page) => {
  const buttons = page.locator(".maqam-list-btn");
  const count = await buttons.count();
  for (let i = 0; i < count; i++) {
    await buttons.nth(i).click();
    await page.waitForTimeout(30);
    const sayrText = await page.locator("#maqamSayrStatus").textContent();
    assert.match(sayrText, /؟/, `المقام رقم ${i} يجب أن يعرض علامة "؟" في حالة السِّير`);
  }
});

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
