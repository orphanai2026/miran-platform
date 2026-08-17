/**
 * expert-intake-data.js
 * ============================================================
 * قائمة جلسة صفحة الخبير — 100 تسجيل نغمة مفردة (25 نغمة × 4 قيم إيقاعية،
 * القرار 13.1) + 16 تسجيل مقام إلزامي (8 مقامات × صعود+هبوط شائع، القرار
 * 13.2) + هبوطات بديلة اختيارية يقرّرها الخبير حيًّا أثناء الجلسة نفسها
 * (لا تُدرَج هنا مسبقًا — تُضاف ديناميكيًا من `expert-intake-page.js` عبر
 * `createAlternateDescentItem()`). **لا تكرار للبيانة**: النغمات مستوردة
 * من `NOTES_24TET` (نفس شبكة 24-TET المعروضة فعليًا في صفحة #4)، والمقامات
 * من `ALL_MAQAMAT` (src/maqamat/، مصدر الحقيقة الوحيد للمقامات). القيم
 * الإيقاعية الأربع (`RHYTHMIC_VALUES`) بيانة منفصلة تمامًا عن مكتبة
 * الطلاب — لا علاقة لها بقيد القرار 4 (ذاك يحكم تصدير معايرة الطلاب
 * حصرًا، لا الملفات المرجعية الإدارية).
 *
 * النغمة الخامسة والعشرون هي تكرار الأوكتاف (نفس اسم النغمة الأولى، طبقة
 * أعلى) — NOTES_24TET نفسه يحمل 24 نغمة فقط (0 إلى 1150 سنت، بلا الأوكتاف
 * الكامل 1200 سنت).
 *
 * **القرار 13.2 صريح:** لا نفترض مسبقًا أي مقام يستاهل هبوطًا بديلًا —
 * الخبير نفسه يقرّر وقت التسجيل عبر زر "أضف هبوطًا بديلًا؟" بصفحة الخبير.
 * لذا القائمة الثابتة هنا تحمل فقط الحد الأدنى الإلزامي (صعود + هبوط
 * شائع لكل مقام = 16 عنصرًا) — لا عنصر ثالث مسبق الوجود لأي مقام.
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
 * حالات تسجيل المقام الثلاث (القرار 13.2). "descend-alternate" وحدها
 * اختيارية وتُنشَأ ديناميكيًا وقت الجلسة، لا ضمن القائمة الثابتة.
 * @typedef {"ascend"|"descend-common"|"descend-alternate"} MaqamPart
 */

/**
 * @typedef {Object} IntakeItem
 * @property {string} id - معرّف فريد ثابت (يُستخدم في اسم الملف المُصدَّر).
 * @property {"note"|"maqam"} kind
 * @property {string} label - التسمية المعروضة للخبير.
 * @property {string} hint - توضيح مختصر لما يُطلَب تحديدًا.
 * @property {string} [rhythmicValueId] - معرّف القيمة الإيقاعية (عناصر "note" فقط، القرار 13.1).
 * @property {string} [maqamName] - اسم المقام (عناصر "maqam" فقط، القرار 13.2).
 * @property {MaqamPart} [maqamPart] - حالة التسجيل (عناصر "maqam" فقط، القرار 13.2).
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

/** تسمية عرض مختصرة لحالة تسجيل المقام — تُستخدم بالتسمية والتقدّم. */
const MAQAM_PART_LABEL = Object.freeze({
  ascend: "صعود",
  "descend-common": "هبوط شائع",
  "descend-alternate": "هبوط بديل",
});

/**
 * يبني قائمة تسجيلات المقامات الثمانية الإلزامية فقط: صعود واحد + هبوط
 * شائع واحد لكل مقام (القرار 13.2) — 16 عنصرًا ثابتًا. الهبوط البديل
 * الاختياري **لا** يدخل هنا؛ يُنشأ حيًّا وقت الجلسة عبر
 * `createAlternateDescentItem()` أدناه، فقط لو قرّر الخبير نفسه إضافته.
 */
function buildMaqamatSession() {
  const items = [];
  for (const m of ALL_MAQAMAT) {
    items.push({
      id: `maqam-${m.name}-ascend`,
      kind: "maqam",
      label: `مقام ${m.name} — ${MAQAM_PART_LABEL.ascend}`,
      hint: "اعزف السلّم الكامل للمقام صعودًا فقط، بتسجيل واحد متصل.",
      maqamName: m.name,
      maqamPart: "ascend",
    });
    items.push({
      id: `maqam-${m.name}-descend-common`,
      kind: "maqam",
      label: `مقام ${m.name} — ${MAQAM_PART_LABEL["descend-common"]}`,
      hint: "اعزف السلّم الكامل للمقام هبوطًا (الصيغة الشائعة)، بتسجيل واحد متصل.",
      maqamName: m.name,
      maqamPart: "descend-common",
    });
  }
  return items;
}

/**
 * يبني عنصر "هبوط بديل" لمقام معيَّن — يُستدعى فقط عند ضغط الخبير زر
 * "أضف هبوطًا بديلًا؟" أثناء الجلسة نفسها (القرار 13.2). لا يدخل ضمن
 * `INTAKE_SESSION_ITEMS` الثابتة؛ الصفحة تُدرجه ديناميكيًا في قائمة
 * الجلسة الحيّة عند الطلب فقط.
 * **ملاحظة نطاق:** حقل "النغمة المتغيّرة" متعدد الاختيار (القرار 13.3)
 * مرحلة منفصلة لاحقة — غير مُنفَّذ هنا بعد؛ الـhint حاليًا نص توضيحي فقط.
 * @param {string} maqamName
 * @returns {IntakeItem}
 */
export function createAlternateDescentItem(maqamName) {
  return {
    id: `maqam-${maqamName}-descend-alternate`,
    kind: "maqam",
    label: `مقام ${maqamName} — ${MAQAM_PART_LABEL["descend-alternate"]}`,
    hint: "اعزف السلّم الكامل للمقام بصيغة الهبوط البديلة، بتسجيل واحد متصل.",
    maqamName,
    maqamPart: "descend-alternate",
  };
}

/** قائمة الجلسة الأساسية الثابتة: 100 تسجيل نغمة، ثم 16 تسجيل مقام إلزامي (صعود+هبوط شائع لكل مقام). */
export const INTAKE_SESSION_ITEMS = Object.freeze([...buildNotesSession(), ...buildMaqamatSession()]);
