/**
 * sample-store.js
 * ============================================================
 * تخزين محلي دائم (localStorage) لعينات المعايرة واللقطات المعتمدة —
 * كان مذكورًا في src/calibration/README.md ضمن "لم يُبنَ بعد". كود جديد
 * بالكامل، لا علاقة له بمنطق CALIBRATION القديم في
 * legacy-calibration-do-not-reuse/.
 *
 * يخزّن فقط بيانات خام قابلة لإعادة البناء (مصفوفة عينات + لقطات)، ويعيد
 * ملء PersonalReferenceStore منها عند تحميل الصفحة — الحساب (المتوسط
 * المُرجَّح، السماحية المشتقة...) يبقى بالكامل في calibration-engine.js،
 * هذا الملف تخزين خام فقط، لا منطق قرارات.
 */

const STORAGE_KEY = "miran_calibration_samples_v1";

/** يقرأ الحالة الخام المخزَّنة، أو حالة فارغة إن لم توجد/تعذّر القراءة. */
export function loadRawState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { samples: [], snapshots: {}, taughtNames: {} };
    const parsed = JSON.parse(raw);
    return {
      samples: Array.isArray(parsed.samples) ? parsed.samples : [],
      snapshots: parsed.snapshots && typeof parsed.snapshots === "object" ? parsed.snapshots : {},
      taughtNames: parsed.taughtNames && typeof parsed.taughtNames === "object" ? parsed.taughtNames : {},
    };
  } catch (e) {
    return { samples: [], snapshots: {}, taughtNames: {} };
  }
}

export function saveRawState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // التخزين قد يفشل (وضع خاص، حصة ممتلئة) — لا نكسر الواجهة، فقط لا نحفظ.
  }
}
