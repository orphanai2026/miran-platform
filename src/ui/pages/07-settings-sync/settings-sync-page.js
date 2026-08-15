/**
 * settings-sync-page.js
 * ============================================================
 * منطق صفحة #7 (الإعدادات + المزامنة) — تحمل معرّف المستخدم المحلي
 * (كود المزامنة) بشكل صريح هنا تحديدًا (القسم 7)، تعرض إعدادات السماحية
 * (نقاط الانطلاق البحثية من القرار 2)، وتشرح مسار نقل البيانات (القرار 4).
 *
 * **لا فتح لقرار الحسابات/الاشتراكات (القسم 6)** ولا لاستثناء القرار 4
 * الفعلي (نقطة استقبال Cloudflare غير مبنية بعد) — هذي الصفحة عرض/تحضير
 * محلي بحت، بلا أي إرسال شبكي فعلي.
 */
import { getOrCreateLocalUserId } from "./local-user-id.js";
import { STARTING_TOLERANCE_CENTS_MIN, STARTING_TOLERANCE_CENTS_MAX } from "../../../calibration/calibration-engine.js";

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
          يتغيّر تلقائيًا. سيُستخدم لاحقًا لتتبّع مصدر البيانات عند تفعيل
          الإرسال لنقطة الاستقبال (القرار 4)، ولربط أي حساب مركزي مستقبلي
          بلا إعادة بناء من الصفر (القسم 6).
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
          تصدير بيانات المعايرة (أرقام قياس فقط، لا صوت) متاح من صفحة
          المكتبة/التصدير. الإرسال التلقائي لنقطة استقبال Cloudflare
          (استثناء القرار 4) <strong>لم يُبنَ بعد</strong> — التصدير حاليًا
          تنزيل محلي فقط، بلا أي إرسال شبكي فعلي.
        </p>
        <a id="settingsExportLink" class="settings-link" href="../06-library-export/index.html">اذهب لصفحة المكتبة/التصدير</a>
      </section>
    </div>
  `;

  return {
    localUserId,
    destroy() {
      container.innerHTML = "";
    },
  };
}
