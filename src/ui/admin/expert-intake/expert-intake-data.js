/**
 * expert-intake-data.js
 * ============================================================
 * قائمة جلسة صفحة الخبير — 100 تسجيل نغمة مفردة (25 نغمة × 4 قيم إيقاعية،
 * القرار 13.1) + 8 تسجيلات مقامات كاملة (القرار 9.2). **لا تكرار للبيانة**:
 * النغمات مستوردة من `NOTES_24TET` (نفس شبكة 24-TET المعروضة فعليًا في
 * صفحة #4)، والمقامات من `ALL_MAQAMAT` (src/maqamat/، مصدر الحقيقة الوحيد
 * للمقامات). القيم الإيقاعية الأربع (`RHYTHMIC_VALUES`) بيانة منفصلة تمامًا
 * عن مكتبة الطلاب — لا علاقة لها بقيد القرار 4 (ذاك يحكم تصدير معايرة
 * الطلاب حصرًا، لا الملفات المرجعية الإدارية).
 *
 * النغمة الخامسة والعشرون هي تكرار الأوكتاف (نفس اسم النغمة الأولى، طبقة
 * أعلى) — NOTES_24TET نفسه يحمل 24 نغمة فقط (0 إلى 1150 سنت، بلا الأوكتاف
 * الكامل 1200 سنت).
 */
import { NOTES_24TET } from "../../pages/04-maqamat-guide/theory-reference-data.js";
import { ALL_MAQAMAT } from "../../../maqamat/maqam-data.js";

/**
 * القيم الإيقاعية الأربع الإلزامية لكل نغمة (القرار 13.1). الترتيب من
 * الأطول للأقصر مدةً، وهو نفس ترتيب التسجيل داخل جلسة الخبير لكل نغمة.
 * @typedef {Object} RhythmicValue
 * @property {string} id - معرّف ثابت (يدخل ضمن معرّف العنصر واسم الملف).
 * @property {string} label - التسمية المعروضة للخبير (تتضمن التسمية الوظيفية).
 */
export const RHYTHMIC_VALUES = Object.freeze([
  { id: "round", label: "روند (كامل)" },
  { id: "blanche", label: "بلانش (نصف)" },
  { id: "noire", label: "نوار (ربع)" },
  { id: "croche", label: "كروش (ثمن)" },
]);

/**
 * @typedef {Object} IntakeItem
 * @property {string} id - معرّف فريد ثابت (يُستخدم في اسم الملف المُصدَّر).
 * @property {"note"|"maqam"} kind
 * @property {string} label - التسمية المعروضة للخبير.
 * @property {string} hint - توضيح مختصر لما يُطلَب تحديدًا.
 * @property {string} [rhythmicValueId] - معرّف القيمة الإيقاعية (عناصر "note" فقط، القرار 13.1).
 */

/**
 * يبني قائمة الـ100 تسجيل نغمة: كل نغمة من الـ25 (شبكة 24-TET + تكرار
 * الأوكتاف) × القيم الإيقاعية الأربع (القرار 13.1).
 */
function buildNotesSession() {
  const noteEntries = [
    ...NOTES_24TET.map(([ar]) => ar),
    `${NOTES_24TET[0][0]} (الأوكتاف)`,
  ];

  const items = [];
  noteEntries.forEach((noteLabel, noteIndex) => {
    const noteNum = String(noteIndex + 1).padStart(2, "0");
    for (const rhythmic of RHYTHMIC_VALUES) {
      items.push({
        id: `note-${noteNum}-${rhythmic.id}`,
        kind: "note",
        label: `${noteLabel} — ${rhythmic.label}`,
        hint: `نغمة مفردة ثابتة بالقيمة الإيقاعية: ${rhythmic.label} — استمر حتى تسمع وضوح القراءة الحية، ثم سجّل.`,
        rhythmicValueId: rhythmic.id,
      });
    }
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

/** قائمة الجلسة الكاملة بالترتيب: 100 تسجيل نغمة (25 × 4 قيم إيقاعية)، ثم 8 مقامات. */
export const INTAKE_SESSION_ITEMS = Object.freeze([...buildNotesSession(), ...buildMaqamatSession()]);
