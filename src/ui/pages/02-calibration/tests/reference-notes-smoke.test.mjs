/**
 * reference-notes-smoke.test.mjs
 * ============================================================
 * اختبار دخان لقسم "استماع مرجعي" في صفحة #2 (القرار 9.2) — حالة فارغة
 * حاليًا (لا ملفات بعد)، يتحقق من الرسالة اللطيفة بدل أي خطأ أو فراغ صامت.
 * منفصل عن page-smoke.test.mjs الأصلي (لا يلمسه).
 *
 * يُشغَّل بـ: node src/ui/pages/02-calibration/tests/reference-notes-smoke.test.mjs
 * يتطلب خادمًا محليًا يخدم جذر المستودع.
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL =
  process.env.MIRAN_TEST_URL || "http://127.0.0.1:8934/src/ui/pages/02-calibration/index.html";

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

await test("قسم الاستماع المرجعي يظهر برسالة الحالة الفارغة (لا ملفات بعد)", async (page) => {
  const empty = page.locator("#calibReferenceNotes .reference-audio-empty");
  await assert.doesNotReject(empty.waitFor({ state: "visible", timeout: 2000 }));
  assert.match(await empty.textContent(), /لا تسجيلات مرجعية بعد/);
});

await test("لا عناصر <audio> تظهر حين تكون المكتبة فارغة", async (page) => {
  assert.equal(await page.locator("#calibReferenceNotes audio").count(), 0);
});

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
