/**
 * legacy-calibration-reader.js
 * ============================================================
 * قراءة آمنة لمرجع القرار (`qararHz`) الذي تستخدمه التمارين المحمية نفسها
 * — نفس نمط `readLegacyProgress()` في `home-page.js`: قراءة مباشرة لمفتاح
 * `localStorage` الخام، بلا أي استيراد لملف محمي (القرار 9.3، الخيار "أ"
 * المعتمَد: الاستقلالية زمنية — قياس حي جديد بمحاولات متتالية مستقلة —
 * لا مصدر بيانات مختلف كليًا. توحيد نظامي المعايرة (القديم والجديد) بند
 * منفصل مستقبلي، غير محسوم هنا).
 */

const LEGACY_CALIBRATION_KEY = "miran_cal";

/**
 * يقرأ `qararHz` الحالي من معايرة التمارين المحمية، أو null إن لم توجد بعد.
 * @returns {number|null}
 */
export function readLegacyQararHz() {
  try {
    const raw = localStorage.getItem(LEGACY_CALIBRATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const hz = Number(parsed?.qararHz);
    return Number.isFinite(hz) && hz > 0 ? hz : null;
  } catch (e) {
    return null;
  }
}

/**
 * يحسب التردد المستهدَف لدرجة نصف-صوت فوق القرار — نفس معادلة التمارين حرفيًا.
 * @param {number} qararHz
 * @param {number} semis
 * @returns {number}
 */
export function targetHzForSemis(qararHz, semis) {
  return qararHz * Math.pow(2, semis / 12);
}
