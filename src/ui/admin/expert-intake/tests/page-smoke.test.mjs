/**
 * page-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) لصفحة الخبير — **نموذج الجدول الحر (القرار 14)**.
 * يستخدم جهاز ميكروفون وهمي مدمج في Chromium
 * (`--use-fake-device-for-media-stream`) + منح صلاحية الميكروفون
 * برمجيًا (`context.grantPermissions`) لتفادي أي نافذة إذن تفاعلية.
 *
 * **نطاق مقصود:** اختيار حرّ (نغمة: اسم+زمن، مقام: اسم+نوع) → تمهيد
 * عدّات → تسجيل → إيقاف → معاينة نسختين (نظيفة/خام، القرار 13.6) →
 * قبول/إعادة/مسح → تعطّل الخيار المسجَّل بقائمة الاختيار المعنية (القرار
 * 14) → ظهور السطر بجدول "المُسجَّل" مع إجراءات استماع/تصدير/حذف →
 * لوحة الهبوط البديل مع النغمة المتغيّرة (القرار 13.2/13.3) → الضغط على
 * عنصر متبقٍ بقائمة التقدّم يملأ حقول الاختيار به → تنزيل الكل.
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

/** يبدأ التسجيل وينتظر انتهاء تمهيد العدّات الأربع فعليًا (القرار 13.5). */
async function startRecordingAndWaitReady(page) {
  await page.click("#intakeRecordBtn");
  await page.locator("#intakeStopBtn").waitFor({ state: "visible", timeout: 5000 });
}

/** يسجّل عنصرًا كاملًا (تمهيد + التقاط + إيقاف) بلا قبول — يترك pendingCapture جاهزًا للمعاينة. */
async function recordOneAttempt(page, captureMs = 300) {
  await startRecordingAndWaitReady(page);
  await page.waitForTimeout(captureMs);
  await page.click("#intakeStopBtn");
  await page.locator("button:has-text('قبول والمتابعة')").waitFor({ state: "visible" });
}

/** يسجّل ويقبل عنصرًا كاملًا واحدًا (أيًّا كان الاختيار الحالي بالحقول). */
async function recordAndAccept(page, captureMs = 300) {
  await recordOneAttempt(page, captureMs);
  await page.click("button:has-text('قبول والمتابعة')");
  await page.waitForTimeout(150);
}

await test("الحالة الأولية: نغمة مختارة افتراضيًا (دو — روند)، مقام مخفي، الجدول فارغ", async (page) => {
  const label = await page.locator("#intakeItemLabel").textContent();
  assert.equal(label.trim(), "دو — روند (كامل)");
  assert.equal(await page.locator("#intakeMaqamFields").isHidden(), true);
  assert.equal(await page.locator("#intakeNoteFields").isHidden(), false);
  const tableCount = await page.locator("#intakeTableCount").textContent();
  assert.match(tableCount, /^0 عنصر/);
  assert.equal(await page.locator("#intakeAddAlternateBtn").isHidden(), true);
});

await test("زر 'مقام' يبدّل الحقول ويُظهر أول مقام (عجم — صعود) + زر الهبوط البديل", async (page) => {
  await page.click("#intakeTypeMaqamBtn");
  assert.equal(await page.locator("#intakeNoteFields").isHidden(), true);
  assert.equal(await page.locator("#intakeMaqamFields").isHidden(), false);
  const label = await page.locator("#intakeItemLabel").textContent();
  assert.equal(label.trim(), "مقام عجم — صعود");
  assert.equal(await page.locator("#intakeAddAlternateBtn").isHidden(), false);
});

await test("تغيير 'زمن النغمة' يحدّث العنوان والتلميح فورًا", async (page) => {
  await page.selectOption("#intakeNoteRhythmSelect", "noire");
  const label = await page.locator("#intakeItemLabel").textContent();
  assert.equal(label.trim(), "دو — نوار (ربع)");
});

await test("تسجيل → إيقاف يعرض لوحة معاينة بنسختين (نظيفة وخام، القرار 13.6) + تردد مقاس", async (page) => {
  await recordOneAttempt(page);
  const previews = page.locator(".intake-audio-preview");
  assert.equal(await previews.count(), 2);
  assert.equal(await page.locator(".intake-audio-preview-clean").count(), 1);
  assert.equal(await page.locator(".intake-audio-preview-raw").count(), 1);
});

await test("'إعادة المحاولة' تُخفي لوحة المعاينة وتُرجع أزرار التسجيل", async (page) => {
  await recordOneAttempt(page);
  await page.click("button:has-text('إعادة المحاولة')");
  assert.equal(await page.locator("#intakeReview").isHidden(), true);
  await assert.doesNotReject(page.locator("#intakeRecordBtn").waitFor({ state: "visible" }));
});

await test("القرار 13.7 — زر 'مسح المحاولة' أثناء التسجيل يلغيها بالكامل ويعيد الحالة لجاهزية تسجيل جديد", async (page) => {
  await startRecordingAndWaitReady(page);
  await page.waitForTimeout(200);
  await assert.doesNotReject(page.locator("#intakeCancelRecordingBtn").waitFor({ state: "visible" }));
  await page.click("#intakeCancelRecordingBtn");
  assert.equal(await page.locator("#intakeReview").isHidden(), true);
  await assert.doesNotReject(page.locator("#intakeRecordBtn").waitFor({ state: "visible" }));
  assert.equal(await page.locator("#intakeStopBtn").count(), 0);
});

await test(
  "القرار 14 — بعد القبول: الخيار المسجَّل يصير معطَّلًا بقائمة 'زمن النغمة'، ويُختار تلقائيًا أول خيار متاح تالٍ",
  async (page) => {
    await recordAndAccept(page); // يسجّل "دو — روند"
    const roundDisabled = await page.locator("#intakeNoteRhythmSelect option[value='round']").isDisabled();
    assert.equal(roundDisabled, true);
    // الاختيار الحالي يجب أن يكون قد انتقل تلقائيًا لأول قيمة إيقاعية متاحة (بلانش)
    const label = await page.locator("#intakeItemLabel").textContent();
    assert.equal(label.trim(), "دو — بلانش (نصف)");
  }
);

await test("العنصر المقبول يظهر بجدول 'المُسجَّل' ببطاقته المستقلة، وأزرار الإجراءات تعمل (تصدير)", async (page) => {
  await recordAndAccept(page);
  const rows = page.locator(".intake-table-row");
  assert.equal(await rows.count(), 1);
  const detail = await rows.first().locator(".intake-table-detail").textContent();
  assert.equal(detail.trim(), "دو — روند (كامل)");
  const badge = await rows.first().locator(".intake-table-badge").textContent();
  assert.equal(badge.trim(), "نغمة");

  const downloads = [];
  page.on("download", (d) => downloads.push(d.suggestedFilename()));
  await rows.first().locator("button[data-action='export']").click();
  await page.waitForTimeout(400);
  assert.equal(downloads.length, 2);
  assert.equal(downloads.filter((f) => f.endsWith("-raw.wav")).length, 1);
  assert.equal(downloads.filter((f) => f.endsWith(".wav") && !f.endsWith("-raw.wav")).length, 1);
});

await test("زر 'حذف' بالجدول يزيل السطر ويُعيد تفعيل خياره بقائمة الاختيار", async (page) => {
  await recordAndAccept(page); // دو — روند
  await page.click(".intake-table-row button[data-action='delete']");
  await page.waitForTimeout(150);
  assert.equal(await page.locator(".intake-table-row").count(), 0);
  const tableCount = await page.locator("#intakeTableCount").textContent();
  assert.match(tableCount, /^0 عنصر/);
  const roundDisabled = await page.locator("#intakeNoteRhythmSelect option[value='round']").isDisabled();
  assert.equal(roundDisabled, false);
});

await test("معرّف الخبير يظهر في الملخّص ويبقى ثابتًا خلال الجلسة", async (page) => {
  const summary1 = await page.locator("#intakeSummary").textContent();
  const idMatch = summary1.match(/معرّف الخبير: ([\w-]+)/);
  assert.ok(idMatch, "لم يظهر معرّف خبير في الملخّص");
  await page.click("#intakeTypeMaqamBtn");
  const summary2 = await page.locator("#intakeSummary").textContent();
  assert.ok(summary2.includes(idMatch[1]), "معرّف الخبير تغيّر أثناء نفس الجلسة");
});

await test(
  "القرار 13.2/13.3 — زر 'أضف هبوطًا بديلًا؟' يفتح لوحة النغمة المتغيّرة؛ التأكيد يُدرِج خيارًا ثالثًا بقائمة 'نوع المقام'",
  async (page) => {
    await page.click("#intakeTypeMaqamBtn");
    await page.selectOption("#intakeMaqamNameSelect", "راست");
    await assert.doesNotReject(page.locator("#intakeAddAlternateBtn").waitFor({ state: "visible", timeout: 2000 }));

    // إلغاء أولًا: نفتح اللوحة، نختار نغمة، ثم نلغي — لا إضافة
    await page.click("#intakeAddAlternateBtn");
    await assert.doesNotReject(page.locator("#intakeAlternatePanel").waitFor({ state: "visible", timeout: 2000 }));
    assert.equal(await page.locator(".intake-alt-note-option").count(), 25);
    await page.locator("#intakeAlternatePanel input[data-note-label='دو']").check();
    await page.click("#intakeAltCancelBtn");
    assert.equal(await page.locator("#intakeAlternatePanel").isHidden(), true);
    let optionsCount = await page.locator("#intakeMaqamTypeSelect option").count();
    assert.equal(optionsCount, 2, "الإلغاء يجب ألّا يضيف خيارًا ثالثًا");
    await assert.doesNotReject(page.locator("#intakeAddAlternateBtn").waitFor({ state: "visible", timeout: 2000 }));

    // التأكيد الفعلي مع اختيار نغمتين متغيّرتين
    await page.click("#intakeAddAlternateBtn");
    await page.locator("#intakeAlternatePanel input[data-note-label='دو']").check();
    await page.locator("#intakeAlternatePanel input[data-note-label='صول']").check();
    await page.click("#intakeAltConfirmBtn");

    optionsCount = await page.locator("#intakeMaqamTypeSelect option").count();
    assert.equal(optionsCount, 3, "التأكيد يجب أن يضيف خيار 'هبوط بديل' الثالث");
    const label = await page.locator("#intakeItemLabel").textContent();
    assert.equal(label.trim(), "مقام راست — هبوط بديل");
    // الزر يختفي فورًا — لا يُسمح بإضافة هبوط بديل ثانٍ لنفس المقام
    assert.equal(await page.locator("#intakeAddAlternateBtn").isHidden(), true);
  }
);

await test(
  "القرار 13.3/13.6/14 — بيان JSON النهائي يحمل rawFilename وhasSplit وchangedNotes وrhythmicValueId بشكل صحيح",
  async (page) => {
    await recordAndAccept(page); // دو — روند (نغمة)

    await page.click("#intakeTypeMaqamBtn");
    await page.selectOption("#intakeMaqamNameSelect", "عجم");
    await page.selectOption("#intakeMaqamTypeSelect", "descend-common");
    await page.click("#intakeAddAlternateBtn");
    await page.locator("#intakeAlternatePanel input[data-note-label='دو']").check();
    await page.click("#intakeAltConfirmBtn");
    // تأكيد الهبوط البديل يُحوِّل الاختيار الحالي تلقائيًا إليه (استمرارية) — نسجّله هو نفسه
    const label = await page.locator("#intakeItemLabel").textContent();
    assert.equal(label.trim(), "مقام عجم — هبوط بديل");
    await recordAndAccept(page); // مقام عجم — هبوط بديل

    const jsonDownloads = [];
    page.on("download", (d) => {
      if (d.suggestedFilename().endsWith(".json")) jsonDownloads.push(d);
    });
    await page.click("#intakeDownloadAllBtn");
    await page.waitForTimeout(700);

    const target = jsonDownloads[0];
    assert.ok(target, "لم يُلتقَط تنزيل ملف JSON");
    const path = await target.path();
    const content = JSON.parse(fs.readFileSync(path, "utf-8"));
    assert.equal(content.items.length, 2);

    const maqamEntry = content.items.find((it) => it.kind === "maqam");
    assert.ok(maqamEntry, "لا يوجد عنصر مقام بالبيان");
    assert.equal(maqamEntry.maqamName, "عجم");
    assert.equal(maqamEntry.maqamPart, "descend-alternate");
    assert.ok(maqamEntry.rawFilename.endsWith("-raw.wav"));
    assert.equal(typeof maqamEntry.hasSplit, "boolean");
    assert.deepEqual(maqamEntry.changedNotes, ["دو"]);

    const noteEntry = content.items.find((it) => it.kind === "note");
    assert.ok(noteEntry, "لا يوجد عنصر نغمة بالبيان");
    assert.equal(noteEntry.rhythmicValueId, "round");
    assert.ok(noteEntry.rawFilename.endsWith("-raw.wav"));
  }
);

await test(
  "القرار 14 — الضغط على عنصر متبقٍ بقائمة التقدّم يملأ حقول الاختيار به مباشرة؛ الضغط على عنصر مكتمل لا يفعل شيئًا",
  async (page) => {
    await recordAndAccept(page); // دو — روند (نغمة، يصير 'مكتمل')
    await page.click("#intakeChecklist summary");
    await page.waitForTimeout(150);

    // الضغط على عنصر مقام متبقٍ يبدّل النوع ويملأ الحقول
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".intake-checklist-item"));
      const target = items.find((el) => el.textContent.includes("مقام راست — صعود"));
      if (target) target.click();
    });
    await page.waitForTimeout(150);
    assert.equal(await page.locator("#intakeMaqamFields").isHidden(), false);
    const label = await page.locator("#intakeItemLabel").textContent();
    assert.equal(label.trim(), "مقام راست — صعود");

    // الضغط على العنصر المكتمل (دو — روند) لا يغيّر شيئًا (لا استجابة لصف "done")
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll(".intake-checklist-item.done"));
      const target = items.find((el) => el.textContent.includes("دو — روند"));
      if (target) target.click();
    });
    await page.waitForTimeout(150);
    const labelAfter = await page.locator("#intakeItemLabel").textContent();
    assert.equal(labelAfter.trim(), "مقام راست — صعود", "الضغط على عنصر مكتمل يجب ألّا يغيّر الاختيار");
  }
);

await test("قائمة تقدّم الجلسة تعكس شريط التقدّم والعدد الصحيحين بعد القبول", async (page) => {
  const summaryBefore = await page.locator("#intakeChecklistSummary").textContent();
  assert.match(summaryBefore, /0 \/ 116 مكتمل/);
  await recordAndAccept(page);
  const summaryAfter = await page.locator("#intakeChecklistSummary").textContent();
  assert.match(summaryAfter, /1 \/ 116 مكتمل/);
});

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
