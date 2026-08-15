/**
 * intake-sync.js
 * ============================================================
 * الجانب العميل من استثناء القرار 4 — إرسال تلقائي فعلي لنقطة استقبال
 * Cloudflare (`cloudflare/intake-worker/`) عند توفر الإنترنت، مع إعادة
 * محاولة تلقائية في الخلفية عند الانقطاع (نص القرار 4 حرفيًا).
 *
 * **الرابط غير معروف مسبقًا.** بما أن النشر الفعلي على Cloudflare خطوة
 * يدوية يجب أن ينفّذها المالك بحسابه الخاص (انظر
 * `cloudflare/intake-worker/README.md`)، لا يوجد رابط افتراضي مُضمَّن هنا
 * — المالك يُدخله يدويًا في صفحة #7 بعد النشر. **قبل إدخاله، الميزة
 * خامدة تمامًا** (لا محاولات إرسال، لا مستمعات شبكة) — لا افتراض لرابط
 * غير موجود.
 */

const ENDPOINT_URL_STORAGE_KEY = "miran_intake_endpoint_url_v1";
const LAST_SYNC_STATUS_STORAGE_KEY = "miran_intake_last_sync_status_v1";

/** يقرأ رابط نقطة الاستقبال المُخزَّن، أو null إن لم يُدخَل بعد. */
export function getEndpointUrl() {
  try {
    return localStorage.getItem(ENDPOINT_URL_STORAGE_KEY) || null;
  } catch (e) {
    return null;
  }
}

/** يخزّن رابط نقطة الاستقبال (أو يمسحه إن مُرِّرت قيمة فارغة/null). */
export function setEndpointUrl(url) {
  try {
    if (url) {
      localStorage.setItem(ENDPOINT_URL_STORAGE_KEY, url);
    } else {
      localStorage.removeItem(ENDPOINT_URL_STORAGE_KEY);
    }
  } catch (e) {
    // فشل تخزين — لا نكسر الواجهة.
  }
}

/** آخر حالة مزامنة معروفة، للعرض في الواجهة بعد إعادة تحميل الصفحة. */
export function getLastSyncStatus() {
  try {
    const raw = localStorage.getItem(LAST_SYNC_STATUS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveLastSyncStatus(status) {
  try {
    localStorage.setItem(LAST_SYNC_STATUS_STORAGE_KEY, JSON.stringify(status));
  } catch (e) {
    // فشل تخزين — لا نكسر الواجهة.
  }
}

/**
 * يبني رابط الإرسال الكامل من رابط القاعدة ومعرّف العازف — يطابق مسار
 * `worker.js` (`/submit/{playerId}`)، متسامح مع وجود/غياب شرطة مائلة
 * زائدة في نهاية رابط القاعدة.
 */
export function buildSubmitUrl(baseUrl, playerId) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return `${trimmed}/submit/${encodeURIComponent(playerId)}`;
}

/**
 * محاولة إرسال واحدة (بلا إعادة محاولة). يستخدم `fetch` مباشرة — الجهة
 * المستدعية مسؤولة عن منطق إعادة المحاولة (انظر `SyncManager` أدناه).
 * @returns {Promise<{ok: boolean, status?: number, error?: string}>}
 */
export async function attemptSubmit(endpointUrl, playerId, payload) {
  const url = buildSubmitUrl(endpointUrl, playerId);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let reason = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (body?.error) reason = body.error;
      } catch (e) {
        // جسم الاستجابة ليس JSON — نكتفي برمز الحالة.
      }
      return { ok: false, status: res.status, error: reason };
    }
    return { ok: true, status: res.status };
  } catch (e) {
    // فشل شبكي (لا اتصال، DNS، إلخ) — يُعامَل كحالة "غير متصل" من قِبل
    // الجهة المستدعية، لا خطأ خادم.
    return { ok: false, error: "network-error" };
  }
}

/**
 * يدير محاولة الإرسال التلقائي + إعادة المحاولة عند عودة الاتصال (نص
 * القرار 4 حرفيًا). **لا يبدأ أي شيء تلقائيًا عند البناء** — الجهة
 * المستدعية (صفحة #7) تستدعي `trySync()` صراحة (مثلًا عند تحميل الصفحة
 * أو عند ضغط زر "أرسل الآن")، وهذا الصنف فقط يتكفل بجدولة إعادة المحاولة
 * عبر حدث `online` إن فشلت المحاولة الأولى بسبب انقطاع شبكي.
 */
export class SyncManager {
  /**
   * @param {Object} params
   * @param {() => string|null} params.getEndpointUrl
   * @param {() => string} params.getPlayerId
   * @param {() => Object} params.buildPayload
   * @param {(status: Object) => void} [params.onStatusChange]
   */
  constructor({ getEndpointUrl: getUrl, getPlayerId, buildPayload, onStatusChange = () => {} }) {
    this._getEndpointUrl = getUrl;
    this._getPlayerId = getPlayerId;
    this._buildPayload = buildPayload;
    this._onStatusChange = onStatusChange;
    this._onlineListener = null;
  }

  /** محاولة إرسال فورية. إن فشلت بسبب انقطاع شبكي، تُسجَّل إعادة محاولة عند حدث `online`. */
  async trySync() {
    const endpointUrl = this._getEndpointUrl();
    if (!endpointUrl) {
      const status = { state: "not-configured", atMs: Date.now() };
      saveLastSyncStatus(status);
      this._onStatusChange(status);
      return status;
    }

    const playerId = this._getPlayerId();
    const payload = this._buildPayload();
    const result = await attemptSubmit(endpointUrl, playerId, payload);

    let status;
    if (result.ok) {
      status = { state: "success", atMs: Date.now() };
      this._clearRetryListener();
    } else if (result.error === "network-error") {
      status = { state: "offline-queued", atMs: Date.now() };
      this._scheduleRetryOnReconnect();
    } else {
      status = { state: "failed", atMs: Date.now(), reason: result.error };
    }

    saveLastSyncStatus(status);
    this._onStatusChange(status);
    return status;
  }

  /** يسجّل إعادة محاولة تلقائية عند عودة الاتصال (حدث `online`) — مرة واحدة فقط في كل مرة. */
  _scheduleRetryOnReconnect() {
    if (this._onlineListener) return; // مُسجَّل بالفعل، لا تكرار.
    this._onlineListener = () => {
      this._clearRetryListener();
      this.trySync();
    };
    window.addEventListener("online", this._onlineListener);
  }

  _clearRetryListener() {
    if (this._onlineListener) {
      window.removeEventListener("online", this._onlineListener);
      this._onlineListener = null;
    }
  }

  /** يلغي أي إعادة محاولة مجدولة — يُستدعى عند مغادرة الصفحة. */
  destroy() {
    this._clearRetryListener();
  }
}
