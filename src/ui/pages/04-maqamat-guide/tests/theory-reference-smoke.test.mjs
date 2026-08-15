/**
 * theory-reference-smoke.test.mjs
 * ============================================================
 * اختبار دخان (smoke) للوحة "مرجع نظري سريع" — نقل كامل تقسيمات مكتبة
 * RECORD-N الثمانية بنفس ترتيبها (طلب صريح من المالك)، مستقلة تمامًا عن
 * page-smoke.test.mjs وglossary-smoke.test.mjs.
 *
 * نطاق مقصود: كل الأقسام الثمانية تظهر ببطاقات بنفس الترتيب المصدري،
 * التوسيع/الطي يعمل (قسم واحد مفتوح كحد أقصى)، شبكة نغمات 24-TET تعرض
 * 24 نغمة عند فتح قسم "النغمات الموسيقية"، جدول الموازين يعرض 8 صفوف عند
 * فتح "الموازين والإيقاع"، وقسم "المقامات الشرقية" يحيل لمستعرض المقامات
 * بلا أي بطاقة مقام مكررة داخله (مصدر حقيقة واحد، القسم 4).
 *
 * يُشغَّل بـ: node src/ui/pages/04-maqamat-guide/tests/theory-reference-smoke.test.mjs
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

const EXPECTED_TOPICS_IN_ORDER = [
  "النغمات الموسيقية",
  "العلامات والتحويلات",
  "القيم الزمنية",
  "الموازين والإيقاع",
  "الأوكتافات والطبقات",
  "12-TET و24-TET",
  "المقامات الشرقية",
  "المصطلحات الموسيقية",
];

await test("كل الأقسام الثمانية تظهر ببطاقات بنفس الترتيب المصدري", async (page) => {
  const titles = await page.locator(".theory-card-title").allTextContents();
  assert.deepEqual(titles, EXPECTED_TOPICS_IN_ORDER);
});

await test("قسم مطويّ افتراضيًا، والضغط على 'عرض القسم' يفتح تفاصيله فقط", async (page) => {
  assert.equal(await page.locator(".theory-card-body").count(), 0);
  await page.locator('[data-toggle="accidentals"]').click();
  await page.waitForTimeout(30);
  assert.equal(await page.locator(".theory-card-body").count(), 1);
  const openCard = page.locator('.theory-card[data-topic-id="accidentals"]');
  await assert.doesNotReject(openCard.locator(".theory-fact").first().waitFor({ state: "visible" }));
});

await test("فتح قسم آخر يطوي السابق تلقائيًا (قسم واحد مفتوح كحد أقصى)", async (page) => {
  await page.locator('[data-toggle="accidentals"]').click();
  await page.waitForTimeout(30);
  await page.locator('[data-toggle="durations"]').click();
  await page.waitForTimeout(30);
  assert.equal(await page.locator(".theory-card-body").count(), 1);
  assert.equal(await page.locator('.theory-card[data-topic-id="durations"].open').count(), 1);
});

await test("قسم 'النغمات الموسيقية' يعرض شبكة 24 نغمة (24-TET كاملة)", async (page) => {
  await page.locator('[data-toggle="notes"]').click();
  await page.waitForTimeout(30);
  assert.equal(await page.locator(".theory-note-chip").count(), 24);
});

await test("قسم 'الموازين والإيقاع' يعرض جدول 8 موازين", async (page) => {
  await page.locator('[data-toggle="meters"]').click();
  await page.waitForTimeout(30);
  assert.equal(await page.locator(".theory-meter-row").count(), 8);
});

await test("قسم 'الأوكتافات والطبقات' يعرض 4 طبقات (قرار القرار/القرار/الجواب/جواب الجواب)", async (page) => {
  await page.locator('[data-toggle="octaves"]').click();
  await page.waitForTimeout(30);
  assert.equal(await page.locator(".theory-register-chip").count(), 4);
});

await test(
  "قسم 'المقامات الشرقية' يحيل لمستعرض المقامات فقط — بلا أي بطاقة مقام مكررة (القسم 4: مصدر حقيقة واحد)",
  async (page) => {
    await page.locator('[data-toggle="maqamat"]').click();
    await page.waitForTimeout(30);
    const card = page.locator('.theory-card[data-topic-id="maqamat"]');
    await assert.doesNotReject(card.locator(".theory-jump-link").waitFor({ state: "visible" }));
    assert.equal(await card.locator(".jins-segment").count(), 0);
    assert.equal(await card.locator(".maqam-list-btn").count(), 0);
  }
);

await test(
  "قسم 'المصطلحات الموسيقية' مدمَج بالكامل داخل بطاقته — قاموس المصطلحات الحقيقي (26 مصطلحًا) يظهر عند الفتح",
  async (page) => {
    await page.locator('[data-toggle="glossary"]').click();
    await page.waitForTimeout(30);
    const card = page.locator('.theory-card[data-topic-id="glossary"]');
    await assert.doesNotReject(card.locator("#glossarySearch").waitFor({ state: "visible", timeout: 2000 }));
    assert.equal(await card.locator(".glossary-card").count(), 26);
  }
);

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
