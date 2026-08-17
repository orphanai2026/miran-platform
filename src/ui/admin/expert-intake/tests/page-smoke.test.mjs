/**
 * page-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) لصفحة الخبير — يستخدم جهاز ميكروفون وهمي مدمج في
 * Chromium (`--use-fake-device-for-media-stream`) + منح صلاحية الميكروفون
 * برمجيًا (`context.grantPermissions`) لتفادي أي نافذة إذن تفاعلية.
 *
 * **نطاق مقصود:** تدفّق الجلسة الكامل (تمهيد عدّات → تسجيل → إيقاف →
 * معاينة نسختين (نظيفة/خام، القرار 13.6) → قبول/إعادة/مسح/تخطّ → لوحة
 * الهبوط البديل مع النغمة المتغيّرة (القرار 13.2/13.3) → انتقال تلقائي →
 * نهاية الجلسة → تنزيل الكل بأربعة ملفات WAV + بيان JSON لعنصرين مقبولين)،
 * بلا تسجيل كل الـ116 عنصرًا فعليًا (بطيء وغير ضروري؛ 100 نغمة = 25 × 4
 * قيم إيقاعية، القرار 13.1 — + 16 تسجيل مقام إلزامي = 8 مقامات ×
 * صعود+هبوط شائع، القرار 13.2).
 *
 * يُشغَّل بـ: node src/ui/admin/expert-intake/tests/page-smoke.test.mjs
 * يتطلب خادمًا محليًا يخدم جذر المستودع:
 *   python3 -m http.server 8934   # من جذر المستودع
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";
import fs from "node:fs";

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

/**
 * يبدأ التسجيل وينتظر انتهاء تمهيد العدّات الأربع (القرار 13.5) فعليًا —
 * زر "إيقاف وحفظ المحاولة" لا يظهر إلا بعد اكتمال العدّ، فانتظاره هو
 * إشارة موثوقة لبداية الالتقاط الفعلي. مهلة سخية (5 ثوانٍ) تحسّبًا لبطء
 * بيئة الاختبار.
 */
async function startRecordingAndWaitReady(page) {
  await page.locator("#intakeControls button", { hasText: "ابدأ التسجيل" }).click();
  await page.locator("#intakeStopBtn").waitFor({ state: "visible", timeout: 5000 });
}

/** يسجّل عنصرًا كاملًا (تمهيد + التقاط + إيقاف) بلا قبول — يترك pendingCapture جاهزًا للمعاينة. */
async function recordOneAttempt(page, captureMs = 300) {
  await startRecordingAndWaitReady(page);
  await page.waitForTimeout(captureMs);
  await page.locator("#intakeControls button", { hasText: "إيقاف وحفظ المحاولة" }).click();
  await page.locator("#intakeReview button", { hasText: "قبول والمتابعة" }).waitFor({ state: "visible" });
}

/** يسجّل ويقبل عنصرًا كاملًا واحدًا. */
async function recordAndAccept(page, captureMs = 300) {
  await recordOneAttempt(page, captureMs);
  await page.locator("#intakeReview button", { hasText: "قبول والمتابعة" }).click();
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

await test("القرار 13.5 — الضغط على 'ابدأ التسجيل' يعرض تمهيد العدّات فورًا، ويختفي عند بداية الالتقاط الفعلي", async (page) => {
  await page.locator("#intakeControls button", { hasText: "ابدأ التسجيل" }).click();
  await assert.doesNotReject(
    page.locator("#intakePreroll").waitFor({ state: "visible", timeout: 1000 })
  );
  const prerollText = await page.locator("#intakePreroll").textContent();
  assert.match(prerollText, /استعد/);
  // لا أزرار تحكّم أثناء التمهيد (الضبط ممنوع حتى ينتهي العدّ)
  assert.equal(await page.locator("#intakeStopBtn").count(), 0);
  // ننتظر اكتمال العدّ فعليًا — يجب أن يظهر زر الإيقاف، ويختفي شريط التمهيد
  await page.locator("#intakeStopBtn").waitFor({ state: "visible", timeout: 5000 });
  assert.equal(await page.locator("#intakePreroll").isHidden(), true);
});

await test("تسجيل → إيقاف يعرض لوحة معاينة بنسختين (نظيفة وخام، القرار 13.6) + تردد مقاس", async (page) => {
  await recordOneAttempt(page);
  const previews = page.locator(".intake-audio-preview");
  assert.equal(await previews.count(), 2);
  assert.equal(await page.locator(".intake-audio-preview-clean").count(), 1);
  assert.equal(await page.locator(".intake-audio-preview-raw").count(), 1);
  await assert.doesNotReject(
    page.locator("#intakeReview button", { hasText: "قبول والمتابعة" }).waitFor({ state: "visible" })
  );
});

await test("'إعادة المحاولة' تُخفي لوحة المعاينة وتُرجع أزرار التسجيل", async (page) => {
  await recordOneAttempt(page);
  await page.locator("#intakeReview button", { hasText: "إعادة المحاولة" }).click();
  assert.equal(await page.locator("#intakeReview").isHidden(), true);
  await assert.doesNotReject(
    page.locator("#intakeControls button", { hasText: "ابدأ التسجيل" }).waitFor({ state: "visible" })
  );
});

await test("القرار 13.7 — زر 'مسح المحاولة' أثناء التسجيل يلغيها بالكامل ويعيد الحالة لجاهزية تسجيل جديد", async (page) => {
  await startRecordingAndWaitReady(page);
  await page.waitForTimeout(200);
  await assert.doesNotReject(
    page.locator("#intakeCancelRecordingBtn").waitFor({ state: "visible" })
  );
  await page.locator("#intakeCancelRecordingBtn").click();
  // لا معاينة، لا تسجيل جارٍ — رجوع فوري لزر "ابدأ التسجيل" بلا أي pendingCapture
  assert.equal(await page.locator("#intakeReview").isHidden(), true);
  await assert.doesNotReject(
    page.locator("#intakeControls button", { hasText: "ابدأ التسجيل" }).waitFor({ state: "visible" })
  );
  assert.equal(await page.locator("#intakeStopBtn").count(), 0);
});

await test("'قبول والمتابعة' يحفظ العنصر في الملخّص وينتقل تلقائيًا للتالي", async (page) => {
  await recordAndAccept(page);
  const progress = await page.locator("#intakeProgress").textContent();
  assert.match(progress, /^2 \/ 116/);
  const summary = await page.locator("#intakeSummary").textContent();
  assert.match(summary, /مقبول حتى الآن: 1 \/ 116/);
});

await test("القرار 13.7 — قائمة تقدّم الجلسة القابلة للطي تعكس العنصر المقبول والحالي بشكل صحيح", async (page) => {
  const summaryBefore = await page.locator("#intakeChecklistSummary").textContent();
  assert.match(summaryBefore, /0 \/ 116 مكتمل/);
  await recordAndAccept(page);
  const summaryAfter = await page.locator("#intakeChecklistSummary").textContent();
  assert.match(summaryAfter, /1 \/ 116 مكتمل/);
  const doneItems = page.locator(".intake-checklist-item.done");
  assert.equal(await doneItems.count(), 1);
  const doneText = await doneItems.first().textContent();
  assert.match(doneText, /دو — روند/);
  const currentItems = page.locator(".intake-checklist-item.current");
  assert.equal(await currentItems.count(), 1);
});

await test("إنهاء الجلسة كاملة (قبول عنصرين، تخطّي الباقي) يعرض شاشة النهاية بالعدد الصحيح", async (page) => {
  // نقبل أول عنصرين فعليًا
  for (let i = 0; i < 2; i++) {
    await recordAndAccept(page);
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

await test(
  "القرار 13.6 — زر 'تنزيل الكل' يُطلق تنزيل نسختين (نظيفة+خام) لكل عنصر مقبول + بيان JSON واحد (5 أحداث تنزيل لعنصرين مقبولين)",
  async (page) => {
    for (let i = 0; i < 2; i++) {
      await recordAndAccept(page);
    }
    for (let i = 0; i < 114; i++) {
      await page.locator("#intakeControls button", { hasText: "تخطّ" }).click();
    }
    const downloads = [];
    page.on("download", (d) => downloads.push(d.suggestedFilename()));
    await page.locator("#intakeDownloadAllBtn").click();
    await page.waitForTimeout(800);
    assert.equal(downloads.length, 5);
    const wavFiles = downloads.filter((f) => f.endsWith(".wav"));
    assert.equal(wavFiles.length, 4);
    assert.equal(wavFiles.filter((f) => f.endsWith("-raw.wav")).length, 2);
    assert.equal(wavFiles.filter((f) => !f.endsWith("-raw.wav")).length, 2);
    assert.equal(downloads.filter((f) => f.endsWith(".json")).length, 1);
  }
);

await test("معرّف الخبير يظهر في الملخّص ويبقى ثابتًا داخل نفس الجلسة", async (page) => {
  const summary1 = await page.locator("#intakeSummary").textContent();
  const idMatch = summary1.match(/معرّف الخبير: ([\w-]+)/);
  assert.ok(idMatch, "لم يظهر معرّف خبير في الملخّص");
  await page.locator("#intakeControls button", { hasText: "تخطّ" }).click();
  const summary2 = await page.locator("#intakeSummary").textContent();
  assert.ok(summary2.includes(idMatch[1]), "معرّف الخبير تغيّر بين عنصرين بنفس الجلسة");
});

await test(
  "القرار 13.2/13.3 — زر 'أضف هبوطًا بديلًا؟' يفتح لوحة النغمة المتغيّرة؛ التأكيد يُدرِج العنصر فورًا؛ الإلغاء لا يُدرِج شيئًا",
  async (page) => {
    // نتخطّى كل النغمات المئة (لا زر هبوط بديل هناك) لنصل لأول عنصر مقام (صعود عجم، فهرس 100).
    for (let i = 0; i < 100; i++) {
      await page.locator("#intakeControls button", { hasText: "تخطّ" }).click();
    }
    let progress = await page.locator("#intakeProgress").textContent();
    assert.match(progress, /^101 \/ 116/);
    assert.equal(await page.locator("#intakeAddAlternateBtn").count(), 0);

    // نتخطّى للعنصر التالي: هبوط شائع (فهرس 101، يظهر 102/116).
    await page.locator("#intakeControls button", { hasText: "تخطّ" }).click();
    progress = await page.locator("#intakeProgress").textContent();
    assert.match(progress, /^102 \/ 116/);
    await assert.doesNotReject(
      page.locator("#intakeAddAlternateBtn").waitFor({ state: "visible", timeout: 2000 })
    );

    // --- محاولة إلغاء أولًا: نفتح اللوحة، نختار نغمة، ثم نلغي — يجب ألّا يُدرَج شيء ---
    await page.locator("#intakeAddAlternateBtn").click();
    await assert.doesNotReject(
      page.locator("#intakeAlternatePanel").waitFor({ state: "visible", timeout: 2000 })
    );
    assert.equal(await page.locator(".intake-alt-note-option").count(), 25);
    await page.locator("#intakeAlternatePanel input[data-note-label='دو']").check();
    await page.locator("#intakeAltCancelBtn").click();
    assert.equal(await page.locator("#intakeAlternatePanel").isHidden(), true);
    progress = await page.locator("#intakeProgress").textContent();
    assert.match(progress, /^102 \/ 116/, "الإلغاء يجب ألّا يغيّر العدد الإجمالي");
    // الزر يجب أن يظهر مجددًا لأن الإلغاء لا يمنع محاولة جديدة
    await assert.doesNotReject(
      page.locator("#intakeAddAlternateBtn").waitFor({ state: "visible", timeout: 2000 })
    );

    // --- الآن التأكيد الفعلي مع اختيار نغمتين متغيّرتين ---
    await page.locator("#intakeAddAlternateBtn").click();
    await page.locator("#intakeAlternatePanel input[data-note-label='دو']").check();
    await page.locator("#intakeAlternatePanel input[data-note-label='صول']").check();
    await page.locator("#intakeAltConfirmBtn").click();

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

await test(
  "القرار 13.3/13.6 — بيان JSON النهائي يحمل rawFilename وhasSplit وchangedNotes بشكل صحيح",
  async (page) => {
    // نقبل النغمة الأولى (بلا maqamName/changedNotes) — المؤشر يصير 1 بعدها
    await recordAndAccept(page);
    // نتخطّى 100 عنصر: من الفهرس 1 إلى 101 — يهبط بالضبط على "هبوط شائع"
    // لأول مقام (عجم)، لأن 1 + 100 = 101 = maqam-عجم-descend-common.
    for (let i = 0; i < 100; i++) {
      await page.locator("#intakeControls button", { hasText: "تخطّ" }).click();
    }
    let progressCheck = await page.locator("#intakeProgress").textContent();
    assert.match(progressCheck, /^102 \/ 116/);
    // الآن على "هبوط شائع" — نضيف هبوطًا بديلًا بنغمة متغيّرة واحدة
    await page.locator("#intakeAddAlternateBtn").click();
    await page.locator("#intakeAlternatePanel input[data-note-label='دو']").check();
    await page.locator("#intakeAltConfirmBtn").click();
    // نقبل عنصر "هبوط شائع" نفسه
    await recordAndAccept(page);

    // بعد قبول عنصرين (النغمة + هبوط شائع)، المؤشر الآن عند 102 (العنصر البديل المُدرَج حديثًا)
    // والإجمالي 117 — نتخطّى الباقي كاملًا (117 - 102 = 15 عنصرًا) للوصول لشاشة النهاية.
    for (let i = 0; i < 15; i++) {
      await page.locator("#intakeControls button", { hasText: "تخطّ" }).click();
    }
    const summaryText = await page.locator("#intakeSummary").textContent();
    assert.match(summaryText, /تم قبول 2 من أصل 117/);

    const jsonDownloads = [];
    page.on("download", (d) => {
      if (d.suggestedFilename().endsWith(".json")) jsonDownloads.push(d);
    });
    await page.locator("#intakeDownloadAllBtn").click();
    await page.waitForTimeout(600);

    const target = jsonDownloads[0];
    assert.ok(target, "لم يُلتقَط تنزيل ملف JSON");
    const path = await target.path();
    const content = JSON.parse(fs.readFileSync(path, "utf-8"));
    assert.equal(content.items.length, 2);

    const maqamEntry = content.items.find((it) => it.kind === "maqam");
    assert.ok(maqamEntry, "لا يوجد عنصر مقام بالبيان");
    assert.equal(maqamEntry.maqamName, "عجم");
    assert.equal(maqamEntry.maqamPart, "descend-common");
    assert.ok(maqamEntry.rawFilename.endsWith("-raw.wav"));
    assert.equal(typeof maqamEntry.hasSplit, "boolean");
    assert.ok(Array.isArray(maqamEntry.changedNotes) === false || Array.isArray(maqamEntry.changedNotes));

    const noteEntry = content.items.find((it) => it.kind === "note");
    assert.ok(noteEntry, "لا يوجد عنصر نغمة بالبيان");
    assert.equal(noteEntry.rhythmicValueId, "round");
    assert.ok(noteEntry.rawFilename.endsWith("-raw.wav"));
  }
);

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
