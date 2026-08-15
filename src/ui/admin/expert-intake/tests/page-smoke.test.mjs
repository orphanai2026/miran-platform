/**
 * page-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) لصفحة الخبير — يستخدم جهاز ميكروفون وهمي مدمج في
 * Chromium (`--use-fake-device-for-media-stream`) + منح صلاحية الميكروفون
 * برمجيًا (`context.grantPermissions`) لتفادي أي نافذة إذن تفاعلية.
 *
 * **نطاق مقصود:** تدفّق الجلسة الكامل (تسجيل → إيقاف → معاينة → قبول/
 * إعادة/تخطّ → انتقال تلقائي → نهاية الجلسة → تنزيل الكل)، بلا تسجيل كل
 * الـ33 عنصرًا فعليًا (بطيء وغير ضروري) — يقبل عنصرين، يتخطّى الباقي، ثم
 * يتحقق من شاشة النهاية وأحداث التنزيل.
 *
 * يُشغَّل بـ: node src/ui/admin/expert-intake/tests/page-smoke.test.mjs
 * يتطلب خادمًا محليًا يخدم جذر المستودع:
 *   python3 -m http.server 8934   # من جذر المستودع
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL =
  process.env.MIRAN_TEST_URL || "http://127.0.0.1:8934/src/ui/admin/expert-intake/index.html";
const ORIGIN = new URL(BASE_URL).origin;

let passed = 0;
let failed = 0;

async function withPage(fn) {
  const browser = await chromium.launch({
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
  });
  const context = await browser.newContext();
  await context.grantPermissions(["microphone"], { origin: ORIGIN });
  const page = await context.newPage();
  try {
    await page.goto(BASE_URL, { waitUntil: "load" });
    await fn(page);
  } finally {
    await browser.close();
  }
}

async function test(name, fn) {
  try {
    await withPage(fn);
    passed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
  }
}

await test("العنصر الأول يظهر صحيحًا: التقدّم 1/33، تسمية النغمة الأولى مطابقة لـNOTES_24TET", async (page) => {
  const progress = await page.locator("#intakeProgress").textContent();
  assert.match(progress, /^1 \/ 33/);
  const label = await page.locator("#intakeItemLabel").textContent();
  assert.equal(label.trim(), "دو");
});

await test("زر 'تخطّ' يتقدّم للعنصر التالي بلا أي تسجيل", async (page) => {
  await page.locator("#intakeControls button", { hasText: "تخطّ" }).click();
  const progress = await page.locator("#intakeProgress").textContent();
  assert.match(progress, /^2 \/ 33/);
});

await test("تسجيل → إيقاف يعرض لوحة معاينة (صوت + تردد مقاس)", async (page) => {
  await page.locator("#intakeControls button", { hasText: "ابدأ التسجيل" }).click();
  await page.waitForTimeout(600); // التقاط عيّنات كافية من الميكروفون الوهمي
  await page.locator("#intakeControls button", { hasText: "إيقاف وحفظ المحاولة" }).click();
  await assert.doesNotReject(
    page.locator(".intake-audio-preview").waitFor({ state: "visible", timeout: 2000 })
  );
  await assert.doesNotReject(
    page.locator("#intakeReview button", { hasText: "قبول والمتابعة" }).waitFor({ state: "visible" })
  );
});

await test("'إعادة المحاولة' تُخفي لوحة المعاينة وتُرجع أزرار التسجيل", async (page) => {
  await page.locator("#intakeControls button", { hasText: "ابدأ التسجيل" }).click();
  await page.waitForTimeout(300);
  await page.locator("#intakeControls button", { hasText: "إيقاف وحفظ المحاولة" }).click();
  await page.locator("#intakeReview button", { hasText: "إعادة المحاولة" }).click();
  assert.equal(await page.locator("#intakeReview").isHidden(), true);
  await assert.doesNotReject(
    page.locator("#intakeControls button", { hasText: "ابدأ التسجيل" }).waitFor({ state: "visible" })
  );
});

await test("'قبول والمتابعة' يحفظ العنصر في الملخّص وينتقل تلقائيًا للتالي", async (page) => {
  await page.locator("#intakeControls button", { hasText: "ابدأ التسجيل" }).click();
  await page.waitForTimeout(300);
  await page.locator("#intakeControls button", { hasText: "إيقاف وحفظ المحاولة" }).click();
  await page.locator("#intakeReview button", { hasText: "قبول والمتابعة" }).click();
  const progress = await page.locator("#intakeProgress").textContent();
  assert.match(progress, /^2 \/ 33/);
  const summary = await page.locator("#intakeSummary").textContent();
  assert.match(summary, /مقبول حتى الآن: 1 \/ 33/);
});

await test("إنهاء الجلسة كاملة (قبول عنصرين، تخطّي الباقي) يعرض شاشة النهاية بالعدد الصحيح", async (page) => {
  // نقبل أول عنصرين فعليًا
  for (let i = 0; i < 2; i++) {
    await page.locator("#intakeControls button", { hasText: "ابدأ التسجيل" }).click();
    await page.waitForTimeout(300);
    await page.locator("#intakeControls button", { hasText: "إيقاف وحفظ المحاولة" }).click();
    await page.locator("#intakeReview button", { hasText: "قبول والمتابعة" }).click();
  }
  // نتخطّى باقي الـ31 عنصرًا
  for (let i = 0; i < 31; i++) {
    await page.locator("#intakeControls button", { hasText: "تخطّ" }).click();
  }
  const progress = await page.locator("#intakeProgress").textContent();
  assert.equal(progress, "اكتملت الجلسة");
  const summaryText = await page.locator("#intakeSummary").textContent();
  assert.match(summaryText, /تم قبول 2 من أصل 33/);
});

await test("زر 'تنزيل الكل' يُطلق تنزيل ملفي WAV + بيان JSON واحد (3 أحداث تنزيل لعنصرين مقبولين)", async (page) => {
  for (let i = 0; i < 2; i++) {
    await page.locator("#intakeControls button", { hasText: "ابدأ التسجيل" }).click();
    await page.waitForTimeout(300);
    await page.locator("#intakeControls button", { hasText: "إيقاف وحفظ المحاولة" }).click();
    await page.locator("#intakeReview button", { hasText: "قبول والمتابعة" }).click();
  }
  for (let i = 0; i < 31; i++) {
    await page.locator("#intakeControls button", { hasText: "تخطّ" }).click();
  }
  const downloads = [];
  page.on("download", (d) => downloads.push(d.suggestedFilename()));
  await page.locator("#intakeDownloadAllBtn").click();
  await page.waitForTimeout(500);
  assert.equal(downloads.length, 3);
  assert.equal(downloads.filter((f) => f.endsWith(".wav")).length, 2);
  assert.equal(downloads.filter((f) => f.endsWith(".json")).length, 1);
});

await test("معرّف الخبير يظهر في الملخّص ويبقى ثابتًا داخل نفس الجلسة", async (page) => {
  const summary1 = await page.locator("#intakeSummary").textContent();
  const idMatch = summary1.match(/معرّف الخبير: ([\w-]+)/);
  assert.ok(idMatch, "لم يظهر معرّف خبير في الملخّص");
  await page.locator("#intakeControls button", { hasText: "تخطّ" }).click();
  const summary2 = await page.locator("#intakeSummary").textContent();
  assert.ok(summary2.includes(idMatch[1]), "معرّف الخبير تغيّر بين عنصرين بنفس الجلسة");
});

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
