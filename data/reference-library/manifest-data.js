/**
 * manifest-data.js
 * ============================================================
 * بيان مكتبة الاستماع المرجعية (القرار 9.2 في سجل القرارات) — 25 نغمة
 * مفردة + 8 تسجيلات مقامات كاملة، بصوت ناي حقيقي من الخبراء (لا صوت
 * إلكتروني). **فارغ حاليًا عمدًا** — البنية جاهزة، بانتظار ملفات فعلية من
 * جلسة خبير حقيقية عبر صفحة الخبير (`src/ui/admin/expert-intake/`).
 *
 * **كيف تُضاف الملفات لاحقًا (يدوي، بلا واجهة رفع على الموقع نفسه):**
 * 1. الخبير يكمل جلسة في صفحة الخبير، ينزّل ملفات WAV + بيان JSON يحمل
 *    التردد المقاس تلقائيًا لكل ملف.
 * 2. يُرسِل المجلد للمالك (خارج الموقع، نفس آلية العمل المعتمدة).
 * 3. المالك يضع ملفات WAV داخل `data/reference-library/audio/` (بنفس
 *    أسماء الملفات من صفحة الخبير — مثلًا `note-01.wav`، `maqam-راست.wav`).
 * 4. يُضاف سطر مطابق هنا لكل ملف — id/filename يجب أن يطابقا حرفيًا.
 *
 * **id يجب أن يطابق `expert-intake-data.js`** (نفس النمط: `note-01` إلى
 * `note-25`، و`maqam-{اسم المقام}`) — لا تُعاد تسمية الأنماط هنا لتفادي
 * أي التباس بين مصدر الملف وبيانه.
 */

/**
 * @typedef {Object} ReferenceAudioEntry
 * @property {string} id - نفس id من expert-intake-data.js (مطابقة حرفية).
 * @property {string} label - التسمية المعروضة (نفس label الأصلي عادة).
 * @property {string} filename - اسم ملف WAV داخل data/reference-library/audio/.
 * @property {number|null} measuredHz - التردد المقاس تلقائيًا وقت التسجيل (من بيان الخبير JSON).
 */

/** @type {ReferenceAudioEntry[]} */
export const REFERENCE_NOTES = [
  // مثال جاهز للتفعيل بعد وضع الملف الفعلي (احذف التعليق واملأ القيم الحقيقية):
  // { id: "note-01", label: "دو", filename: "note-01.wav", measuredHz: 261.6 },
];

/** @type {ReferenceAudioEntry[]} */
export const REFERENCE_MAQAMAT = [
  // { id: "maqam-راست", label: "مقام راست", filename: "maqam-راست.wav", measuredHz: null },
];
