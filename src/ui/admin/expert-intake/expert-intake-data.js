/**
 * expert-intake-data.js
 * ============================================================
 * قائمة جلسة صفحة الخبير — 25 نغمة مفردة + 8 تسجيلات مقامات كاملة (القرار
 * 9.2 من سجل القرارات). **لا تكرار للبيانة**: النغمات مستوردة من
 * `NOTES_24TET` (نفس شبكة 24-TET المعروضة فعليًا في صفحة #4)، والمقامات
 * من `ALL_MAQAMAT` (src/maqamat/، مصدر الحقيقة الوحيد للمقامات).
 *
 * النغمة الخامسة والعشرون هي تكرار الأوكتاف (نفس اسم النغمة الأولى، طبقة
 * أعلى) — NOTES_24TET نفسه يحمل 24 نغمة فقط (0 إلى 1150 سنت، بلا الأوكتاف
 * الكامل 1200 سنت).
 */
import { NOTES_24TET } from "../../pages/04-maqamat-guide/theory-reference-data.js";
import { ALL_MAQAMAT } from "../../../maqamat/maqam-data.js";

/**
 * @typedef {Object} IntakeItem
 * @property {string} id - معرّف فريد ثابت (يُستخدم في اسم الملف المُصدَّر).
 * @property {"note"|"maqam"} kind
 * @property {string} label - التسمية المعروضة للخبير.
 * @property {string} hint - توضيح مختصر لما يُطلَب تحديدًا.
 */

/** يبني قائمة الـ25 نغمة المفردة من شبكة 24-TET + تكرار الأوكتاف. */
function buildNotesSession() {
  const items = NOTES_24TET.map(([ar], i) => ({
    id: `note-${String(i + 1).padStart(2, "0")}`,
    kind: "note",
    label: ar,
    hint: "نغمة مفردة ثابتة — استمر حتى تسمع وضوح القراءة الحية، ثم سجّل.",
  }));
  const [firstAr] = NOTES_24TET[0];
  items.push({
    id: "note-25",
    kind: "note",
    label: `${firstAr} (الأوكتاف)`,
    hint: "نفس النغمة الأولى، طبقة أعلى (تكرار الأوكتاف الكامل).",
  });
  return items;
}

/** يبني قائمة تسجيلات المقامات الثمانية (سلّم كامل صعودًا وهبوطًا لكل واحد). */
function buildMaqamatSession() {
  return ALL_MAQAMAT.map((m) => ({
    id: `maqam-${m.name}`,
    kind: "maqam",
    label: `مقام ${m.name}`,
    hint: "اعزف السلّم الكامل للمقام صعودًا ثم هبوطًا، بتسجيل واحد متصل.",
  }));
}

/** قائمة الجلسة الكاملة بالترتيب: 25 نغمة، ثم 8 مقامات. */
export const INTAKE_SESSION_ITEMS = Object.freeze([...buildNotesSession(), ...buildMaqamatSession()]);
