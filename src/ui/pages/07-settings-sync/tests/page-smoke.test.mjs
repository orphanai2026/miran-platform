/**
 * page-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) لصفحة #7 (الإعدادات + المزامنة) — كود المزامنة
 * (معرّف المستخدم المحلي)، إعدادات السماحية، ونقل البيانات (بما فيها
 * الإرسال الشبكي الفعلي لاستثناء القرار 4 عبر `intake-sync.js`).
 *
 * **نطاق مقصود:** تحميل بلا أخطاء، توليد/ثبات معرّف المستخدم المحلي عبر
 * إعادة التحميل (نفس نمط اختبار "بقاء الاسم المُعلَّم" في صفحة #2)، عرض
 * صحيح لحدود السماحية من calibration-engine.js، رابط صحيح لصفحة
 * المكتبة/التصدير، وتدفق المزامنة الكامل: بلا رابط مُهيَّأ (خامد تمامًا)،
 * حفظ رابط + إرسال ناجح (مع تحقق فعلي من الطلب الشبكي المُعترَض عبر
 * `page.route`)، فشل شبكي → حالة "غير متصل"، وإعادة محاولة تلقائية عند
 * حدث `online` بلا تدخّل يدوي. **لا اتصال فعلي بأي خادم حقيقي** — كل
 * الطلبات لدومين وهمي (`intake.test.local`) مُعترَضة بالكامل عبر
 * `page.route` قبل وصولها للشبكة الفعلية.
 *
 * يُشغَّل بـ: node src/ui/pages/07-settings-sync/tests/page-smoke.test.mjs
 * **يتطلب خادمًا محليًا** يخدم جذر المستودع (لأن الصفحة تستورد وحدات ES من
 * ../../../calibration/ و../06-library-export/ بمسارات نسبية تتجاوز
 * مجلد الصفحة نفسها):
 *   python3 -m http.server 8934   # من جذر المستودع
 */
import { chromium } from "playwright";
import assert from "node:assert/strict";

const BASE_URL =
  process.env.MIRAN_TEST_URL || "http://127.0.0.1:8934/src/ui/pages/07-settings-sync/index.html";

let passed = 0;
let failed = 0;

async function test(name, fn, { beforeGoto } = {}) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const consoleErrors = [];
  page.on("pageerror", (err) => consoleErrors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  try {
    if (beforeGoto) await beforeGoto(page);
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

await test("كود المزامنة (معرّف المستخدم المحلي) يظهر بصيغة UUID غير فارغة", async (page) => {
  const idText = await page.locator("#settingsUserId").textContent();
  assert.match(idText.trim(), /^[0-9a-f-]{20,}$/i, `معرّف غير متوقَّع الشكل: "${idText}"`);
});

await test("معرّف المستخدم المحلي يبقى ثابتًا بعد إعادة تحميل الصفحة (نفس الجهاز/localStorage)", async (page) => {
  const before = (await page.locator("#settingsUserId").textContent()).trim();
  await page.reload({ waitUntil: "load" });
  const after = (await page.locator("#settingsUserId").textContent()).trim();
  assert.equal(before, after, "المعرّف يجب أن يبقى ثابتًا، لا يُعاد توليده مع كل تحميل");
});

await test("إعدادات السماحية تعرض حدود القرار 2 الصحيحة (±10 إلى ±25 سنت)", async (page) => {
  const min = await page.locator("#settingsToleranceMin").textContent();
  const max = await page.locator("#settingsToleranceMax").textContent();
  assert.match(min, /10/);
  assert.match(max, /25/);
});

await test("رابط 'اذهب لصفحة المكتبة/التصدير' يشير للمسار النسبي الصحيح", async (page) => {
  const href = await page.locator("#settingsExportLink").getAttribute("href");
  assert.equal(href, "../06-library-export/index.html");
});

await test("بلا رابط نقطة استقبال مُهيَّأ: الحقل فارغ والحالة الافتراضية بلا محاولة سابقة", async (page) => {
  const value = await page.locator("#settingsEndpointUrl").inputValue();
  assert.equal(value, "");
  const status = await page.locator("#settingsSyncStatus").textContent();
  assert.match(status, /لم تُجرَ أي محاولة/);
});

await test(
  "حفظ رابط وهمي فعلي، ثم إرسال ناجح: طلب POST يصل فعليًا لمسار /submit/{المعرّف} بالحمولة الصحيحة",
  async (page) => {
    let capturedRequestBody = null;
    let capturedUrl = null;
    await page.route(/intake\.test\.local\/submit\//, async (route) => {
      capturedUrl = route.request().url();
      capturedRequestBody = JSON.parse(route.request().postData());
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, receivedAtMs: Date.now() }),
      });
    });

    await page.locator("#settingsEndpointUrl").fill("https://intake.test.local");
    await page.locator("#settingsEndpointSaveBtn").click();
    await page.waitForTimeout(300);

    const status = await page.locator("#settingsSyncStatus").textContent();
    assert.match(status, /آخر إرسال ناجح/, `الحالة غير متوقَّعة: "${status}"`);

    const userId = (await page.locator("#settingsUserId").textContent()).trim();
    assert.match(capturedUrl, new RegExp(`/submit/${userId}$`));
    assert.ok(Array.isArray(capturedRequestBody.samples), "الحمولة المرسَلة يجب أن تحتوي مصفوفة samples");
  }
);

await test(
  "فشل شبكي (لا اتصال): الحالة تتحول لـ 'غير متصل، سيُعاد الإرسال تلقائيًا'",
  async (page) => {
    await page.route(/intake\.test\.local\/submit\//, (route) => route.abort("connectionrefused"));

    await page.locator("#settingsEndpointUrl").fill("https://intake.test.local");
    await page.locator("#settingsEndpointSaveBtn").click();
    await page.waitForTimeout(300);

    const status = await page.locator("#settingsSyncStatus").textContent();
    assert.match(status, /لا يوجد اتصال حاليًا/, `الحالة غير متوقَّعة: "${status}"`);
  }
);

await test(
  "إعادة المحاولة التلقائية عند عودة الاتصال: فشل أول محاولة، ثم حدث online يُطلق إرسالًا ناجحًا بلا تدخّل يدوي",
  async (page) => {
    let attemptCount = 0;
    await page.route(/intake\.test\.local\/submit\//, async (route) => {
      attemptCount++;
      if (attemptCount === 1) {
        await route.abort("connectionrefused");
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, receivedAtMs: Date.now() }),
        });
      }
    });

    await page.locator("#settingsEndpointUrl").fill("https://intake.test.local");
    await page.locator("#settingsEndpointSaveBtn").click();
    await page.waitForTimeout(300);
    let status = await page.locator("#settingsSyncStatus").textContent();
    assert.match(status, /لا يوجد اتصال حاليًا/);

    // نحاكي عودة الاتصال يدويًا (بلا زر، بلا تدخّل المستخدم) — SyncManager
    // مُفترَض أنه سجّل مستمع 'online' تلقائيًا بعد الفشل الأول.
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await page.waitForTimeout(300);

    status = await page.locator("#settingsSyncStatus").textContent();
    assert.match(status, /آخر إرسال ناجح/, `يجب أن تنجح المحاولة الثانية تلقائيًا: "${status}"`);
    assert.equal(attemptCount, 2);
  }
);

await test(
  "زر 'أرسل الآن' بلا رابط مُهيَّأ يعرض حالة 'لم يُدخَل رابط' فورًا، بلا أي طلب شبكي",
  async (page) => {
    let requestFired = false;
    await page.route(/intake\.test\.local/, () => {
      requestFired = true;
    });
    await page.locator("#settingsSyncNowBtn").click();
    await page.waitForTimeout(150);
    const status = await page.locator("#settingsSyncStatus").textContent();
    assert.match(status, /لم يُدخَل رابط/);
    assert.equal(requestFired, false, "لا يجب أن يُرسَل أي طلب شبكي بلا رابط مُهيَّأ");
  }
);

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
