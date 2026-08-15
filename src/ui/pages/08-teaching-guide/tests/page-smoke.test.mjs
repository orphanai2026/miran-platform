/**
 * page-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) لصفحة #8 (الدليل التعليمي) — صفحة نص إرشادي ثابت
 * وغير تفاعلي (القرار 6)، بلا أي وحدة ES أو منطق برمجي.
 *
 * **نطاق مقصود:** تحميل بلا أخطاء، وجود الطبقات الثلاث بمحتواها الصحيح،
 * وظهور توصية المعلم البشري صراحة عند الطبقة 3. لا يوجد تفاعل لاختباره —
 * هذي الصفحة عمدًا بلا JavaScript (القرار 6: "نص إرشادي ثابت، لا تفاعلي").
 *
 * يُشغَّل بـ: node src/ui/pages/08-teaching-guide/tests/page-smoke.test.mjs
 * **يتطلب خادمًا محليًا** يخدم جذر المستودع:
 *   python3 -m http.server 8934   # من جذر المستودع
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL =
  process.env.MIRAN_TEST_URL || "http://127.0.0.1:8934/src/ui/pages/08-teaching-guide/index.html";

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

await test("الصفحة تُحمَّل بلا أخطاء JS حقيقية (صفحة ثابتة بلا سكربتات أصلًا)", async (page, consoleErrors) => {
  assert.equal(realErrors(consoleErrors).length, 0, `أخطاء كونسول: ${realErrors(consoleErrors).join(" | ")}`);
});

await test("الطبقات الثلاث الموثَّقة في القرار 6 موجودة كلها في الصفحة", async (page) => {
  const layerCards = page.locator(".layer-card");
  assert.equal(await layerCards.count(), 3);
  const layer1Text = await page.locator(".layer-1").textContent();
  assert.match(layer1Text, /دقة النغمة/);
  const layer2Text = await page.locator(".layer-2").textContent();
  assert.match(layer2Text, /النوتة الموسيقية/);
  const layer3Text = await page.locator(".layer-3").textContent();
  assert.match(layer3Text, /الارتجال/);
});

await test('توصية المعلم البشري تظهر صراحة عند الطبقة 3 (القرار 6)', async (page) => {
  const recommendation = await page.locator(".teacher-recommendation").textContent();
  assert.match(recommendation, /معلم بشري/);
});

await test("لا وحدات ES ولا سكربتات مُحمَّلة — الصفحة ثابتة وغير تفاعلية بتصميمها", async (page) => {
  const scriptTags = await page.locator("script").count();
  assert.equal(scriptTags, 0, "القرار 6 ينص صراحة: نص إرشادي ثابت، لا تفاعلي");
});

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
