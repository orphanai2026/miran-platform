/**
 * metronome-prefs.js
 * ============================================================
 * حفظ آخر BPM وميزان مستخدَمين، ليُستعادا تلقائيًا بين الزيارات — بند
 * كان مفتوحًا في خطة المترونوم، أُنجز هنا. مصدر حقيقة واحد لكل الصفحات
 * التي تستخدم المترونوم (الكاملة #5 والمصغّرة #2) — نفس المبدأ العام
 * لمحرك المترونوم نفسه (القسم 7).
 *
 * localStorage فقط (بلا خادم)، مفتاح واحد، تحقّق قيم بسيط قبل أي استخدام
 * (حماية من قيم تالفة أو خارج المدى المسموح في واجهة المترونوم).
 */

const METRONOME_PREFS_STORAGE_KEY = "miran_metronome_prefs_v1";
const MIN_BPM = 30;
const MAX_BPM = 240;
const ALLOWED_BEATS_PER_MEASURE = [2, 3, 4, 6];

/**
 * @typedef {Object} MetronomePrefs
 * @property {number} [bpm]
 * @property {number} [beatsPerMeasure]
 */

/**
 * يقرأ التفضيلات المحفوظة، أو كائنًا فارغًا إن لم توجد/كانت تالفة.
 * @returns {MetronomePrefs}
 */
export function loadMetronomePrefs() {
  try {
    const raw = localStorage.getItem(METRONOME_PREFS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const prefs = {};
    if (Number.isFinite(parsed?.bpm) && parsed.bpm >= MIN_BPM && parsed.bpm <= MAX_BPM) {
      prefs.bpm = parsed.bpm;
    }
    if (ALLOWED_BEATS_PER_MEASURE.includes(parsed?.beatsPerMeasure)) {
      prefs.beatsPerMeasure = parsed.beatsPerMeasure;
    }
    return prefs;
  } catch (e) {
    return {};
  }
}

/**
 * يحفظ (دمجًا جزئيًا) التفضيلات المعطاة فوق الموجود مسبقًا.
 * @param {MetronomePrefs} partialPrefs
 */
export function saveMetronomePrefs(partialPrefs) {
  try {
    const current = loadMetronomePrefs();
    const merged = { ...current, ...partialPrefs };
    localStorage.setItem(METRONOME_PREFS_STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    // تخزين معطَّل (وضع خاص، حصة ممتلئة) — لا نكسر الواجهة، نتجاهل بصمت.
  }
}
