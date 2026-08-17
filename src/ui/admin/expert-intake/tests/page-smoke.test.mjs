/**
 * page-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) لصفحة الخبير — يستخدم جهاز ميكروفون وهمي مدمج في
 * Chromium (`--use-fake-device-for-media-stream`) + منح صلاحية الميكروفون
 * برمجيًا (`context.grantPermissions`) لتفادي أي نافذة إذن تفاعلية.
 *
 * **نطاق مقصود:** تدفّق الجلسة الكامل (تسجيل → إيقاف → معاينة → قبول/
 * إعادة/تخطّ → انتقال تلقائي → نهاية الجلسة → تنزيل الكل)، بلا تسجيل كل
 * الـ116 عنصرًا فعليًا (بطيء وغير ضروري؛ 100 نغمة = 25 × 4 قيم إيقاعية،
 * القرار 13.1 — + 16 تسجيل مقام إلزامي = 8 مقامات × صعود+هبوط شائع،
 * القرار 13.2) — يقبل عنصرين، يتخطّى الباقي، ثم يتحقق من شاشة النهاية
 * وأحداث التنزيل. اختبار منفصل يغطي زر "أضف هبوطًا بديلًا؟" (القرار 13.2).
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

await test("العنصر الأول يظهر صحيحًا: التقدّم 1/116، تسمية أول نغمة (روند) مطابقة لـNOTES_24TET", async (page) => {
  const progress = await page.locator("#intakeProgress").textContent();
  assert.match(progress, /^1 \/ 116/);
  const label = await page.locator("#intakeItemLabel").textContent();
  assert.equal(label.trim(), "دو — روند (كامل)");
});

await test("زر 'تخطّ' يتقدّم للعنصر التالي بلا أي تسجيل", async (page) => {
  await page.locator("#intakeControls button", { hasText: "تخطّ" }).click();
  const progress = await page.locator("#intakeProgress").textContent();
  assert.match(progress, /^2 \/ 116/);
  const label = await page.locator("#intakeItemLabel").textContent();
  assert.equal(label.trim(), "دو — بلانش (نصف)");
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
  assert.match(progress, /^2 \/ 116/);
  const summary = await page.locator("#intakeSummary").textContent();
  assert.match(summary, /مقبول حتى الآن: 1 \/ 116/);
});

await test("إنهاء الجلسة كاملة (قبول عنصرين، تخطّي الباقي) يعرض شاشة النهاية بالعدد الصحيح", async (page) => {
  // نقبل أول عنصرين فعليًا
  for (let i = 0; i < 2; i++) {
    await page.locator("#intakeControls button", { hasText: "ابدأ التسجيل" }).click();
    await page.waitForTimeout(300);
    await page.locator("#intakeControls button", { hasText: "إيقاف وحفظ المحاولة" }).click();
    await page.locator("#intakeReview button", { hasText: "قبول والمتابعة" }).click();
  }
  // نتخطّى باقي الـ114 عنصرًا
  for (let i = 0; i < 114; i++) {
    await page.locator("#intakeControls button", { hasText: "تخطّ" }).click();
  }
  const progress = await page.locator("#intakeProgress").textContent();
  assert.equal(progress, "اكتملت الجلسة");
  const summaryText = await page.locator("#intakeSummary").textContent();
  assert.match(summaryText, /تم قبول 2 من أصل 116/);
});

await test("زر 'تنزيل الكل' يُطلق تنزيل ملفي WAV + بيان JSON واحد (3 أحداث تنزيل لعنصرين مقبولين)", async (page) => {
  for (let i = 0; i < 2; i++) {
    await page.locator("#intakeControls button", { hasText: "ابدأ التسجيل" }).click();
    await page.waitForTimeout(300);
    await page.locator("#intakeControls button", { hasText: "إيقاف وحفظ المحاولة" }).click();
    await page.locator("#intakeReview button", { hasText: "قبول والمتابعة" }).click();
  }
  for (let i = 0; i < 114; i++) {
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


await test(
  "القرار 13.2 — زر 'أضف هبوطًا بديلًا؟' يظهر فقط عند 'هبوط شائع'، يُدرِج عنصرًا جديدًا فورًا، ويختفي بعد استخدامه",
  async (page) => {
    // نتخطّى كل النغمات المئة (لا زر هبوط بديل هناك) لنصل لأول عنصر مقام (صعود عجم، فهرس 100).
    for (let i = 0; i < 100; i++) {
      await page.locator("#intakeControls button", { hasText: "تخطّ" }).click();
    }
    let progress = await page.locator("#intakeProgress").textContent();
    assert.match(progress, /^101 \/ 116/);
    // العنصر 101 = صعود — لا يجب أن يظهر زر الهبوط البديل هنا.
    assert.equal(await page.locator("#intakeAddAlternateBtn").count(), 0);

    // نتخطّى للعنصر التالي: هبوط شائع (فهرس 101، يظهر 102/116).
    await page.locator("#intakeControls button", { hasText: "تخطّ" }).click();
    progress = await page.locator("#intakeProgress").textContent();
    assert.match(progress, /^102 \/ 116/);
    await assert.doesNotReject(
      page.locator("#intakeAddAlternateBtn").waitFor({ state: "visible", timeout: 2000 })
    );

    // نضغط الزر: يُفترض إدراج عنصر جديد فورًا، يكبر الإجمالي إلى 117، والعنصر الحالي يبقى نفسه (هبوط شائع).
    await page.locator("#intakeAddAlternateBtn").click();
    progress = await page.locator("#intakeProgress").textContent();
    assert.match(progress, /^102 \/ 117/);
    const label = await page.locator("#intakeItemLabel").textContent();
    assert.equal(label.trim(), "مقام عجم — هبوط شائع");
    // الزر يجب أن يختفي فورًا — لا يُسمح بإضافة هبوط بديل ثانٍ لنفس المقام.
    assert.equal(await page.locator("#intakeAddAlternateBtn").count(), 0);

    // نتخطّى للعنصر التالي: يجب أن يكون الهبوط البديل المُدرَج حديثًا مباشرة.
    await page.locator("#intakeControls button", { hasText: "تخطّ" }).click();
    progress = await page.locator("#intakeProgress").textContent();
    assert.match(progress, /^103 \/ 117/);
    const altLabel = await page.locator("#intakeItemLabel").textContent();
    assert.equal(altLabel.trim(), "مقام عجم — هبوط بديل");
  }
);

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
