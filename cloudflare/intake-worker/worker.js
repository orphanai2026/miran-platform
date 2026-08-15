/**
 * worker.js
 * ============================================================
 * نقطة استقبال JSON على Cloudflare Workers/KV — الاستثناء الوحيد لمبدأ
 * "لا خادم" (القرار 4، القسم 4 من سجل القرارات). تستقبل بيانات معايرة
 * مُصدَّرة من صفحة #6 (أرقام قياس فقط، لا صوت) وتخزّنها في KV، بمفتاح
 * فريد لكل عازف (رمز المزامنة من صفحة #7) — لتتبّع المصدر ومنع الإرسال
 * العشوائي، لا كآلية مصادقة تشفيرية (القرار 4 لا يطلب ذلك صراحة).
 *
 * **نطاق ضيق مقصود:** استقبال وتخزين فقط. لا قراءة/استرجاع، لا حذف،
 * لا معالجة أو تحليل للبيانة داخل الـ Worker — يبقى استثناءً ضيقًا لمبدأ
 * "لا خادم"، لا يُفتح لأي غرض آخر (كما ينص القرار 4 صراحة).
 *
 * **تخزين تراكمي، لا استبدال:** كل إرسال يُخزَّن كسجل منفصل بمفتاح يحمل
 * وقت الاستلام (`player:{playerId}:{receivedAtMs}`)، بدل الكتابة فوق
 * آخر إرسال — يطابق مبدأ "لا حذف تلقائي" المطبَّق على التصدير المحلي
 * (القرار 4)، ويمنع فقدان بيانات عند إرسالين متزامنين محتملين.
 */

const PLAYER_ID_PATH_RE = /^\/submit\/([a-zA-Z0-9-]{8,100})$/;

/**
 * يتحقق من صحة بنية الحمولة المرسَلة — نفس الحقول التي يبنيها
 * buildExportPayload في src/ui/pages/06-library-export/export-payload.js،
 * لكن بلا استيراد فعلي لذلك الملف (بيئة Workers منفصلة عن حزمة الواجهة،
 * ولا تُشارك أدوات البناء حاليًا) — تحقق بنيوي مستقل، موثَّق التطابق يدويًا.
 * @param {unknown} payload
 * @returns {{valid: boolean, reason?: string}}
 */
export function validatePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { valid: false, reason: "الحمولة يجب أن تكون كائن JSON." };
  }
  if (!Array.isArray(payload.samples)) {
    return { valid: false, reason: "samples يجب أن تكون مصفوفة." };
  }
  for (const s of payload.samples) {
    if (!s || typeof s !== "object") return { valid: false, reason: "عنصر عينة غير صالح." };
    if (typeof s.pitchHz !== "number" || !Number.isFinite(s.pitchHz) || s.pitchHz <= 0) {
      return { valid: false, reason: "pitchHz غير صالح في إحدى العينات." };
    }
    if (!s.fingering || typeof s.fingering !== "string") {
      return { valid: false, reason: "fingering مفقود في إحدى العينات." };
    }
    if (!s.register || typeof s.register !== "string") {
      return { valid: false, reason: "register مفقود في إحدى العينات." };
    }
  }
  if (payload.frozenSnapshots !== undefined) {
    if (typeof payload.frozenSnapshots !== "object" || Array.isArray(payload.frozenSnapshots)) {
      return { valid: false, reason: "frozenSnapshots يجب أن تكون كائنًا." };
    }
  }
  if (payload.taughtNames !== undefined) {
    if (typeof payload.taughtNames !== "object" || Array.isArray(payload.taughtNames)) {
      return { valid: false, reason: "taughtNames يجب أن تكون كائنًا." };
    }
  }
  return { valid: true };
}

/** يستخرج معرّف العازف من مسار الطلب، أو null إن كان المسار غير مطابق. */
export function extractPlayerId(pathname) {
  const match = pathname.match(PLAYER_ID_PATH_RE);
  return match ? match[1] : null;
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/**
 * معالج الطلب الرئيسي — واجهة Cloudflare Workers القياسية (`fetch(request, env)`).
 * @param {Request} request
 * @param {{MIRAN_INTAKE_KV: {put: Function}}} env - ربط KV، يُهيَّأ عبر wrangler.toml.
 */
async function handleRequest(request, env) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "method not allowed — POST only" }, 405);
  }

  const url = new URL(request.url);
  const playerId = extractPlayerId(url.pathname);
  if (!playerId) {
    return jsonResponse({ error: "مسار غير صالح — متوقَّع /submit/{playerId}" }, 400);
  }

  let payload;
  try {
    payload = await request.json();
  } catch (e) {
    return jsonResponse({ error: "جسم الطلب ليس JSON صالحًا" }, 400);
  }

  const validation = validatePayload(payload);
  if (!validation.valid) {
    return jsonResponse({ error: validation.reason }, 400);
  }

  const receivedAtMs = Date.now();
  const record = {
    receivedAtMs,
    exportedAtMs: typeof payload.exportedAtMs === "number" ? payload.exportedAtMs : null,
    samples: payload.samples,
    frozenSnapshots: payload.frozenSnapshots ?? {},
    taughtNames: payload.taughtNames ?? {},
  };

  if (!env?.MIRAN_INTAKE_KV) {
    // بيئة بلا ربط KV مُهيَّأ (مثلًا اختبار محلي بلا wrangler) — خطأ تهيئة
    // واضح بدل استثناء غامض.
    return jsonResponse({ error: "الخادم غير مُهيَّأ بشكل صحيح (KV binding مفقود)" }, 500);
  }

  const key = `player:${playerId}:${receivedAtMs}`;
  await env.MIRAN_INTAKE_KV.put(key, JSON.stringify(record));

  return jsonResponse({ ok: true, receivedAtMs }, 200);
}

export default {
  fetch: handleRequest,
};
