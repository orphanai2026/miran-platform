/**
 * settings-sync-page.js
 * ============================================================
 * منطق صفحة #7 (الإعدادات + المزامنة) — تحمل معرّف المستخدم المحلي
 * (كود المزامنة) بشكل صريح هنا تحديدًا (القسم 7)، تعرض إعدادات السماحية
 * (نقاط الانطلاق البحثية من القرار 2)، وتدير الإرسال الفعلي لنقطة استقبال
 * Cloudflare (استثناء القرار 4) — تلقائيًا عند توفر الإنترنت، مع إعادة
 * محاولة عند عودة الاتصال.
 *
 * **لا فتح لقرار الحسابات/الاشتراكات (القسم 6).** الإرسال محصور بالضبط
 * بما ينص عليه القرار 4 (أرقام قياس فقط)، لرابط يُدخله المالك يدويًا بعد
 * نشر الـ Worker بنفسه (انظر `cloudflare/intake-worker/README.md`) — لا
 * رابط افتراضي مُضمَّن، الميزة خامدة تمامًا قبل إدخاله.
 */
import { getOrCreateLocalUserId } from "./local-user-id.js";
import { STARTING_TOLERANCE_CENTS_MIN, STARTING_TOLERANCE_CENTS_MAX } from "../../../calibration/calibration-engine.js";
import { rebuildStore, buildExportPayload } from "../06-library-export/export-payload.js";
import { getEndpointUrl, setEndpointUrl, getLastSyncStatus, SyncManager } from "./intake-sync.js";

const STATUS_LABELS = {
  "not-configured": "لم يُدخَل رابط نقطة استقبال بعد.",
  success: "آخر إرسال ناجح.",
  "offline-queued": "لا يوجد اتصال حاليًا — سيُعاد الإرسال تلقائيًا عند عودة الاتصال.",
  failed: "فشل الإرسال",
};

function formatStatus(status) {
  if (!status) return "لم تُجرَ أي محاولة إرسال بعد.";
  const label = STATUS_LABELS[status.state] || status.state;
  const time = new Date(status.atMs).toLocaleString("ar");
  const reason = status.state === "failed" && status.reason ? `: ${status.reason}` : "";
  return `${label}${reason} (${time})`;
}

/**
 * يبني صفحة الإعدادات + المزامنة كاملة داخل عنصر حاوٍ معطى.
 * @param {HTMLElement} container
 */
export function mountSettingsSyncPage(container) {
  const localUserId = getOrCreateLocalUserId();

  container.innerHTML = `
    <div class="settings-page" dir="rtl">
      <section class="settings-section">
        <h2>كود المزامنة (معرّف المستخدم المحلي)</h2>
        <p class="settings-explain">
          معرّف عشوائي أُنشئ محليًا على هذا الجهاز عند أول استخدام، ثابت لا
          يتغيّر تلقائيًا. يُستخدَم لتتبّع مصدر البيانات عند الإرسال لنقطة
          الاستقبال أدناه (القرار 4)، ولربط أي حساب مركزي مستقبلي بلا
          إعادة بناء من الصفر (القسم 6).
        </p>
        <code id="settingsUserId" class="settings-code">${localUserId}</code>
      </section>

      <section class="settings-section">
        <h2>إعدادات السماحية</h2>
        <p class="settings-explain">
          نقطتا الانطلاق البحثيتان الحاليتان لعرض السماحية المشتقة لكل نغمة
          (القرار 2) — تُستخدَمان كحد أدنى/أعلى عند اشتقاق السماحية الفعلية
          من تفاوت العينات الحقيقي، لا كرقم مفروض بذاته.
        </p>
        <div class="settings-tolerance-row">
          <span>الحد الأدنى: <strong id="settingsToleranceMin">±${STARTING_TOLERANCE_CENTS_MIN}</strong> سنت</span>
          <span>الحد الأعلى: <strong id="settingsToleranceMax">±${STARTING_TOLERANCE_CENTS_MAX}</strong> سنت</span>
        </div>
      </section>

      <section class="settings-section">
        <h2>نقل البيانات</h2>
        <p class="settings-explain">
          تصدير محلي (تنزيل ملف) متاح دائمًا من صفحة المكتبة/التصدير.
          الإرسال الشبكي الفعلي أدناه <strong>اختياري بالكامل</strong> —
          يحتاج رابط نقطة استقبال منشورة فعليًا على Cloudflare (يُنشرها
          المالك بنفسه، انظر <code>cloudflare/intake-worker/README.md</code>).
          بلا رابط مُدخَل، لا يحدث أي إرسال شبكي إطلاقًا.
        </p>
        <a id="settingsExportLink" class="settings-link" href="../06-library-export/index.html">اذهب لصفحة المكتبة/التصدير</a>

        <div class="settings-endpoint-row">
          <label for="settingsEndpointUrl">رابط نقطة الاستقبال (اختياري)</label>
          <input type="url" id="settingsEndpointUrl" placeholder="https://intake.example.com" />
          <button type="button" id="settingsEndpointSaveBtn" class="btn-secondary">حفظ</button>
          <button type="button" id="settingsSyncNowBtn" class="btn-secondary">أرسل الآن</button>
        </div>
        <p id="settingsSyncStatus" class="settings-sync-status"></p>
      </section>
    </div>
  `;

  const endpointInput = container.querySelector("#settingsEndpointUrl");
  const saveBtn = container.querySelector("#settingsEndpointSaveBtn");
  const syncNowBtn = container.querySelector("#settingsSyncNowBtn");
  const statusEl = container.querySelector("#settingsSyncStatus");

  endpointInput.value = getEndpointUrl() || "";
  statusEl.textContent = formatStatus(getLastSyncStatus());

  const syncManager = new SyncManager({
    getEndpointUrl,
    getPlayerId: () => localUserId,
    buildPayload: () => {
      const { store } = rebuildStore();
      return buildExportPayload(store);
    },
    onStatusChange: (status) => {
      statusEl.textContent = formatStatus(status);
    },
  });

  saveBtn.addEventListener("click", () => {
    setEndpointUrl(endpointInput.value.trim());
    syncManager.trySync();
  });

  syncNowBtn.addEventListener("click", () => {
    syncManager.trySync();
  });

  // إرسال تلقائي عند تحميل الصفحة إن كان رابط مُهيَّأ مسبقًا — "تلقائي عند
  // توفر الإنترنت" (القرار 4). بلا رابط، trySync() يرجع "not-configured"
  // فورًا بلا أي طلب شبكي فعلي.
  if (getEndpointUrl()) {
    syncManager.trySync();
  }

  return {
    localUserId,
    destroy() {
      syncManager.destroy();
      container.innerHTML = "";
    },
  };
}
