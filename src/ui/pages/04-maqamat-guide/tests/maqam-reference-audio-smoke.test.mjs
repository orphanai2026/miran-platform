/**
 * maqam-reference-audio-smoke.test.mjs
 * ============================================================
 * اختبار دخان لقسم "استماع مرجعي — المقام المحدَّد" في صفحة #4 (القرار
 * 9.2) — حالة فارغة حاليًا (لا ملفات بعد)، ويتحقق من أن تغيير اختيار
 * المقام يُحدِّث الرسالة (اسم المقام يظهر في نص الحالة الفارغة).
 * منفصل عن page-smoke/theory-reference/glossary الحالية (لا يلمسها).
 *
 * يُشغَّل بـ: node src/ui/pages/04-maqamat-guide/tests/maqam-reference-audio-smoke.test.mjs
 * يتطلب خادمًا محليًا يخدم جذر المستودع.
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

await test("عند التحميل: حالة فارغة تذكر اسم أول مقام محدَّد تلقائيًا (عجم)", async (page) => {
  const empty = page.locator("#maqamReferenceAudio .reference-audio-empty");
  await assert.doesNotReject(empty.waitFor({ state: "visible", timeout: 2000 }));
  assert.match(await empty.textContent(), /"عجم"/);
});

await test("اختيار مقام آخر (صبا) يُحدِّث نص الحالة الفارغة تلقائيًا لاسم المقام الجديد", async (page) => {
  await page.locator('.maqam-list-btn[data-maqam-name="صبا"]').click();
  await page.waitForTimeout(50);
  const empty = page.locator("#maqamReferenceAudio .reference-audio-empty");
  assert.match(await empty.textContent(), /"صبا"/);
});

await test("لا عناصر <audio> تظهر حين تكون المكتبة فارغة", async (page) => {
  assert.equal(await page.locator("#maqamReferenceAudio audio").count(), 0);
});

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
