/**
 * curriculum-notes-index.js
 * ============================================================
 * فهرس "درجة نغمية + سماحية لكل يوم منهج" — **نسخة مشتقة للقراءة فقط**،
 * مستخرجة برمجيًا من `src/exercises/legacy-miran/js/curriculum-data.js`
 * (49 بندًا من أصل 74: longtone/transition/exchange فقط — البنود
 * الإيقاعية بلا درجة نغمية مستبعدة).
 *
 * **لماذا نسخة مشتقة لا استيراد مباشر:** `curriculum-data.js` ملف محمي
 * (`src/exercises/**`)، ومكتوب كسكربت كلاسيكي (`<script src>`، لا
 * `export`) يعيش داخل مستند iframe منفصل تمامًا (صفحة #3) — لا وسيلة
 * نظيفة لاستيراده كوحدة ES من صفحات أخرى بلا كسر عزل iframe أو قراءة نص
 * الملف وتفكيكه وقت التشغيل (هش، وبلا خادم يعني قيود CORS تحت file://).
 * هذا الملف **بديل موثَّق**: استُخرج مرة واحدة برمجيًا (لا يدويًا، لتفادي
 * خطأ نسخ)، لا يُعدَّل يدويًا أبدًا — أي تغيير مستقبلي في `curriculum-data.js`
 * (غير متوقَّع، الملف محمي وثابت) يتطلب إعادة استخراج كاملة هنا.
 *
 * **targetSemis:** أبعاد نصف-صوت فوق قرار المتدرب (نفس معادلة التمارين
 * حرفيًا: `hz = qararHz * 2^(semis/12)`، من `persistence.js` التعليق:
 * "semis = semitones above qarar, so a note's pitch = qararHz * 2^(semis/12)").
 * للانتقال/التبادل: `targetSemis` هو درجة "to" (النغمة المُقدَّمة حديثًا)،
 * لا "from" (المفترض متقَنة من يوم سابق أصلًا).
 *
 * **toleranceCents:** نفس حقل `tol` من بند المنهج الأصلي حرفيًا — الاختبار
 * المرحلي (القرار 9.3) يعيد استخدام نفس معيار الدقة اللي حكم عليه التمرين
 * نفسه، لا رقمًا جديدًا مخترَعًا.
 */

/**
 * @typedef {Object} CurriculumNoteEntry
 * @property {number} id - نفس id في CURRICULUM الأصلي (miran_prog.done مفتاحه).
 * @property {"longtone"|"transition"|"exchange"} kind
 * @property {number} targetSemis - أبعاد نصف-صوت فوق القرار.
 * @property {string} targetLabel - اسم النغمة المعروض (عربي).
 * @property {number} toleranceCents - نفس سماحية التمرين الأصلي.
 */

/** @type {CurriculumNoteEntry[]} */
export const CURRICULUM_NOTES_INDEX = [
  { id: 1, kind: "longtone", targetSemis: 0, targetLabel: "دو", toleranceCents: 20 },
  { id: 2, kind: "longtone", targetSemis: 2, targetLabel: "ري", toleranceCents: 20 },
  { id: 3, kind: "longtone", targetSemis: 3.5, targetLabel: "مي نصف بيمول", toleranceCents: 26 },
  { id: 4, kind: "longtone", targetSemis: 5, targetLabel: "فا", toleranceCents: 20 },
  { id: 5, kind: "longtone", targetSemis: 7, targetLabel: "صول", toleranceCents: 20 },
  { id: 6, kind: "longtone", targetSemis: 7, targetLabel: "صول", toleranceCents: 13 },
  { id: 7, kind: "longtone", targetSemis: 9, targetLabel: "لا", toleranceCents: 18 },
  { id: 8, kind: "longtone", targetSemis: 10.5, targetLabel: "سي نصف بيمول", toleranceCents: 26 },
  { id: 9, kind: "longtone", targetSemis: 12, targetLabel: "دو الجواب", toleranceCents: 18 },
  { id: 11, kind: "transition", targetSemis: 2, targetLabel: "ري", toleranceCents: 25 },
  { id: 12, kind: "transition", targetSemis: 3.5, targetLabel: "مي نصف بيمول", toleranceCents: 28 },
  { id: 13, kind: "transition", targetSemis: 5, targetLabel: "فا", toleranceCents: 26 },
  { id: 14, kind: "transition", targetSemis: 7, targetLabel: "صول", toleranceCents: 25 },
  { id: 15, kind: "transition", targetSemis: 9, targetLabel: "لا", toleranceCents: 22 },
  { id: 16, kind: "transition", targetSemis: 10.5, targetLabel: "سي نصف بيمول", toleranceCents: 28 },
  { id: 17, kind: "transition", targetSemis: 12, targetLabel: "دو الجواب", toleranceCents: 26 },
  { id: 18, kind: "exchange", targetSemis: 2, targetLabel: "ري", toleranceCents: 25 },
  { id: 19, kind: "exchange", targetSemis: 3.5, targetLabel: "مي نصف بيمول", toleranceCents: 28 },
  { id: 20, kind: "exchange", targetSemis: 5, targetLabel: "فا", toleranceCents: 26 },
  { id: 21, kind: "exchange", targetSemis: 7, targetLabel: "صول", toleranceCents: 25 },
  { id: 22, kind: "exchange", targetSemis: 9, targetLabel: "لا", toleranceCents: 22 },
  { id: 23, kind: "exchange", targetSemis: 10.5, targetLabel: "سي نصف بيمول", toleranceCents: 28 },
  { id: 24, kind: "exchange", targetSemis: 12, targetLabel: "دو الجواب", toleranceCents: 26 },
  { id: 25, kind: "longtone", targetSemis: 0, targetLabel: "دو", toleranceCents: 20 },
  { id: 26, kind: "exchange", targetSemis: 2, targetLabel: "ري", toleranceCents: 25 },
  { id: 27, kind: "transition", targetSemis: 2, targetLabel: "ري", toleranceCents: 25 },
  { id: 28, kind: "exchange", targetSemis: 2, targetLabel: "ري", toleranceCents: 25 },
  { id: 39, kind: "transition", targetSemis: 5, targetLabel: "فا", toleranceCents: 25 },
  { id: 40, kind: "exchange", targetSemis: 5, targetLabel: "فا", toleranceCents: 25 },
  { id: 41, kind: "longtone", targetSemis: 10, targetLabel: "سي بيمول", toleranceCents: 18 },
  { id: 42, kind: "transition", targetSemis: 10, targetLabel: "سي بيمول", toleranceCents: 22 },
  { id: 43, kind: "exchange", targetSemis: 10, targetLabel: "سي بيمول", toleranceCents: 22 },
  { id: 44, kind: "transition", targetSemis: 12, targetLabel: "دو الجواب", toleranceCents: 22 },
  { id: 45, kind: "exchange", targetSemis: 12, targetLabel: "دو الجواب", toleranceCents: 22 },
  { id: 48, kind: "longtone", targetSemis: 3, targetLabel: "مي بيمول", toleranceCents: 22 },
  { id: 49, kind: "transition", targetSemis: 3, targetLabel: "مي بيمول", toleranceCents: 24 },
  { id: 50, kind: "exchange", targetSemis: 3, targetLabel: "مي بيمول", toleranceCents: 24 },
  { id: 55, kind: "longtone", targetSemis: 1, targetLabel: "دو دييز", toleranceCents: 24 },
  { id: 56, kind: "transition", targetSemis: 1, targetLabel: "دو دييز", toleranceCents: 24 },
  { id: 57, kind: "exchange", targetSemis: 1, targetLabel: "دو دييز", toleranceCents: 24 },
  { id: 58, kind: "longtone", targetSemis: 4, targetLabel: "مي", toleranceCents: 24 },
  { id: 59, kind: "transition", targetSemis: 4, targetLabel: "مي", toleranceCents: 24 },
  { id: 60, kind: "exchange", targetSemis: 4, targetLabel: "مي", toleranceCents: 24 },
  { id: 61, kind: "longtone", targetSemis: 8, targetLabel: "لا بيمول", toleranceCents: 24 },
  { id: 62, kind: "transition", targetSemis: 8, targetLabel: "لا بيمول", toleranceCents: 24 },
  { id: 63, kind: "exchange", targetSemis: 8, targetLabel: "لا بيمول", toleranceCents: 24 },
  { id: 64, kind: "longtone", targetSemis: 11, targetLabel: "سي", toleranceCents: 24 },
  { id: 65, kind: "transition", targetSemis: 12, targetLabel: "دو الجواب", toleranceCents: 24 },
  { id: 66, kind: "exchange", targetSemis: 12, targetLabel: "دو الجواب", toleranceCents: 24 },];
