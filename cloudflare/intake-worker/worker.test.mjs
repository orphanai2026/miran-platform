/**
 * worker.test.mjs
 * ============================================================
 * اختبارات وحدة خالصة لـ `worker.js` — بلا Miniflare/wrangler، تعتمد على
 * `Request`/`Response`/`URL` المدمجة في Node (متوفرة أصلًا منذ Node 18+،
 * ونفس الواجهات القياسية التي يستخدمها Cloudflare Workers فعليًا) وربط
 * KV وهمي بسيط (`Map` يحاكي واجهة `.put()` فقط، وهي الوحيدة المستخدَمة).
 *
 * **نطاق مقصود:** منطق التحقق (`validatePayload`)، استخراج معرّف العازف
 * (`extractPlayerId`)، ومعالج الطلب الكامل (`export default.fetch`) —
 * التحقق من الحالات الصحيحة والخاطئة، ورموز الحالة HTTP الصحيحة، وأن
 * البيانة المخزَّنة في KV مطابقة للمُرسَل.
 *
 * **لا يغطي:** نشرًا فعليًا، ربط KV حقيقيًا، أو أي اتصال شبكي فعلي بـ
 * Cloudflare — ذلك يحتاج بيئة `wrangler` وحساب Cloudflare فعلي، خارج
 * نطاق بيئة تنفيذ الاختبارات هذي (انظر README.md لخطوات النشر اليدوية).
 *
 * يُشغَّل بـ: node cloudflare/intake-worker/worker.test.mjs
 */
import assert from "node:assert/strict";
import worker, { validatePayload, extractPlayerId } from "./worker.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
  }
}

/** ربط KV وهمي — Map بسيط يحاكي put() فقط (الوحيدة المستخدَمة في worker.js). */
function createMockKv() {
  const store = new Map();
  return {
    store,
    put: async (key, value) => {
      store.set(key, value);
    },
  };
}

const VALID_PAYLOAD = {
  exportedAtMs: 1700000000000,
  samples: [
    { pitchHz: 293.5, fingering: "ري", register: "قرار", toleranceCents: 12, neyType: "دوكاه", timestampMs: 1699999000000 },
  ],
  frozenSnapshots: { "دو::قرار": { pitchHz: 261.6, toleranceCents: 15, approvedAtMs: 1699998000000 } },
  taughtNames: { "فا::جواب": "فا" },
};

// ==================== validatePayload ====================

test("validatePayload: يقبل حمولة صحيحة كاملة", () => {
  assert.deepEqual(validatePayload(VALID_PAYLOAD), { valid: true });
});

test("validatePayload: يقبل حمولة بعينات فارغة (لا لقطات ولا أسماء)", () => {
  assert.deepEqual(validatePayload({ samples: [] }), { valid: true });
});

test("validatePayload: يرفض حمولة ليست كائنًا (null، مصفوفة، رقم)", () => {
  assert.equal(validatePayload(null).valid, false);
  assert.equal(validatePayload([]).valid, false);
  assert.equal(validatePayload(42).valid, false);
});

test("validatePayload: يرفض samples غير مصفوفة", () => {
  assert.equal(validatePayload({ samples: "not-array" }).valid, false);
});

test("validatePayload: يرفض عينة بـ pitchHz غير رقمي أو سالب/صفر", () => {
  assert.equal(validatePayload({ samples: [{ pitchHz: "440", fingering: "دو", register: "قرار" }] }).valid, false);
  assert.equal(validatePayload({ samples: [{ pitchHz: -5, fingering: "دو", register: "قرار" }] }).valid, false);
  assert.equal(validatePayload({ samples: [{ pitchHz: 0, fingering: "دو", register: "قرار" }] }).valid, false);
});

test("validatePayload: يرفض عينة بلا fingering أو بلا register", () => {
  assert.equal(validatePayload({ samples: [{ pitchHz: 440, register: "قرار" }] }).valid, false);
  assert.equal(validatePayload({ samples: [{ pitchHz: 440, fingering: "دو" }] }).valid, false);
});

test("validatePayload: يرفض frozenSnapshots أو taughtNames إن لم تكونا كائنًا", () => {
  assert.equal(validatePayload({ samples: [], frozenSnapshots: [] }).valid, false);
  assert.equal(validatePayload({ samples: [], taughtNames: "x" }).valid, false);
});

// ==================== extractPlayerId ====================

test("extractPlayerId: يستخرج المعرّف من مسار صحيح", () => {
  assert.equal(extractPlayerId("/submit/abcd1234-ef56-7890"), "abcd1234-ef56-7890");
});

test("extractPlayerId: يرجع null لمسار غير مطابق", () => {
  assert.equal(extractPlayerId("/submit/"), null);
  assert.equal(extractPlayerId("/other/abcd1234"), null);
  assert.equal(extractPlayerId("/submit/short"), null); // أقصر من 8 أحرف
});

// ==================== worker.fetch (تكامل خفيف) ====================

await asyncTest("fetch: يرفض غير POST بـ 405", async () => {
  const req = new Request("http://example.com/submit/abcd1234-ef56-7890", { method: "GET" });
  const res = await worker.fetch(req, { MIRAN_INTAKE_KV: createMockKv() });
  assert.equal(res.status, 405);
});

await asyncTest("fetch: يرفض مسارًا غير صالح بـ 400", async () => {
  const req = new Request("http://example.com/wrong-path", {
    method: "POST",
    body: JSON.stringify(VALID_PAYLOAD),
  });
  const res = await worker.fetch(req, { MIRAN_INTAKE_KV: createMockKv() });
  assert.equal(res.status, 400);
});

await asyncTest("fetch: يرفض جسمًا غير JSON صالح بـ 400", async () => {
  const req = new Request("http://example.com/submit/abcd1234-ef56-7890", {
    method: "POST",
    body: "{not valid json",
  });
  const res = await worker.fetch(req, { MIRAN_INTAKE_KV: createMockKv() });
  assert.equal(res.status, 400);
});

await asyncTest("fetch: يرفض حمولة غير صالحة بنيويًا بـ 400 مع سبب واضح", async () => {
  const req = new Request("http://example.com/submit/abcd1234-ef56-7890", {
    method: "POST",
    body: JSON.stringify({ samples: [{ pitchHz: -1, fingering: "دو", register: "قرار" }] }),
  });
  const res = await worker.fetch(req, { MIRAN_INTAKE_KV: createMockKv() });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.ok(body.error && body.error.length > 0);
});

await asyncTest("fetch: يرجع 500 واضحًا إن كان ربط KV مفقودًا (بيئة غير مُهيَّأة)", async () => {
  const req = new Request("http://example.com/submit/abcd1234-ef56-7890", {
    method: "POST",
    body: JSON.stringify(VALID_PAYLOAD),
  });
  const res = await worker.fetch(req, {});
  assert.equal(res.status, 500);
});

await asyncTest("fetch: يقبل طلبًا صحيحًا كاملًا، يخزّن في KV بمفتاح يحمل معرّف العازف، ويرجع 200", async () => {
  const kv = createMockKv();
  const req = new Request("http://example.com/submit/player-abc-123456", {
    method: "POST",
    body: JSON.stringify(VALID_PAYLOAD),
  });
  const res = await worker.fetch(req, { MIRAN_INTAKE_KV: kv });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.ok(typeof body.receivedAtMs === "number");

  assert.equal(kv.store.size, 1);
  const [storedKey, storedValueRaw] = [...kv.store.entries()][0];
  assert.match(storedKey, /^player:player-abc-123456:\d+$/);
  const storedValue = JSON.parse(storedValueRaw);
  assert.equal(storedValue.samples.length, 1);
  assert.equal(storedValue.frozenSnapshots["دو::قرار"].pitchHz, 261.6);
  assert.equal(storedValue.taughtNames["فا::جواب"], "فا");
});

await asyncTest("fetch: طلبان منفصلان لنفس العازف يُخزَّنان كسجلين منفصلين (تراكمي، لا استبدال)", async () => {
  const kv = createMockKv();
  const makeReq = () =>
    new Request("http://example.com/submit/player-abc-123456", {
      method: "POST",
      body: JSON.stringify({ samples: [] }),
    });
  await worker.fetch(makeReq(), { MIRAN_INTAKE_KV: kv });
  await new Promise((r) => setTimeout(r, 2)); // فارق زمني بسيط يضمن مفتاحًا مختلفًا
  await worker.fetch(makeReq(), { MIRAN_INTAKE_KV: kv });
  assert.equal(kv.store.size, 2);
});

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
