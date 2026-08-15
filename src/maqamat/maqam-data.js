/**
 * maqam-data.js
 * ============================================================
 * بيانات الأجناس والمقامات الأولية. **مصدر موثَّق:** maqamworld.com
 * (تحقّق مباشر عبر بحث ويب أثناء هذه المرحلة، لا من الذاكرة العامة فقط —
 * القرار 5 يلزم مصدرًا موثقًا صراحة).
 *
 * ⚠️ نمط الأبعاد هنا (INTERVAL_TYPES) تقريب نظري-تربوي للأبعاد الشرقية،
 * وليس قيمًا مطلقة بالسنتات — matches الملاحظة الصريحة في سجل القرارات:
 * "أرباع/أنصاف التون الشرقية سقالة نظرية-تربوية لا حقيقة أداء فعلية".
 * الأبعاد الدقيقة تُصحَّح لاحقًا ببيانات عزف حقيقية موثّقة (القرار 1) —
 * ليست جزءًا من هذا الملف.
 *
 * ⚠️ **كل قيم السِّير (sayr) هنا `null`** — لم تُصادَق عليها سمعيًا بعد
 * (توافق المالك + خبير، القرار 5). إضافتها لاحقة، خارج نطاق هذه المرحلة.
 */

import { defineJins, defineMaqam, INTERVAL_TYPES } from "./maqam-schema.js";

const SOURCE_MAQAMWORLD = "maqamworld.com (تحقّق مباشر أثناء بناء هذا الملف)";

// ============ الأجناس (Ajnas) ============
// كل جنس: نمط الأبعاد بين درجاته المتتالية، من القرار صعودًا.

export const JINS_AJAM = defineJins({
  name: "عجم",
  // موثّق من MaqamWorld + ويكيبيديا: "whole step, whole step, half step" —
  // من أوضح الأجناس اتفاقًا بين المصادر، يقارب الرباعية الكبرى الغربية.
  intervalPattern: [INTERVAL_TYPES.WHOLE, INTERVAL_TYPES.WHOLE, INTERVAL_TYPES.HALF],
  source: SOURCE_MAQAMWORLD,
});

export const JINS_BAYATI = defineJins({
  name: "بياتي",
  // موثّق: "نفس بنية أبعاد راست لكن بدءًا من الدرجة الثانية" (three_quarter,
  // three_quarter, whole) — شائع الاستشهاد به هكذا عبر عدة مصادر.
  intervalPattern: [INTERVAL_TYPES.THREE_QUARTER, INTERVAL_TYPES.THREE_QUARTER, INTERVAL_TYPES.WHOLE],
  source: SOURCE_MAQAMWORLD,
});

export const JINS_HIJAZ = defineJins({
  name: "حجاز",
  // موثّق: جنس من 4 درجات، القرار D والغماز G (بُعد رابع تام ≈2.5 بُعد).
  // البُعد الأوسط (بين الدرجتين 2 و3) "عادة أصغر مما هو مدوَّن" حسب
  // MaqamWorld — نمثّله هنا بـ AUGMENTED_SECOND كتقريب نظري شائع الاستشهاد.
  intervalPattern: [INTERVAL_TYPES.HALF, INTERVAL_TYPES.AUGMENTED_SECOND, INTERVAL_TYPES.HALF],
  source: SOURCE_MAQAMWORLD,
});

export const JINS_RAST = defineJins({
  name: "راست",
  // موثّق من MaqamWorld: جنس من 5 درجات (وليس 4 كما قد يُفترض)، القرار C
  // والغماز G. النمط الشائع الاستشهاد به عبر المصادر: whole, three_quarter,
  // three_quarter, whole — أربعة أبعاد بين 5 درجات.
  intervalPattern: [
    INTERVAL_TYPES.WHOLE,
    INTERVAL_TYPES.THREE_QUARTER,
    INTERVAL_TYPES.THREE_QUARTER,
    INTERVAL_TYPES.WHOLE,
  ],
  source: SOURCE_MAQAMWORLD,
});

export const JINS_UPPER_RAST = defineJins({
  name: "راست علوي",
  // موثّق من صفحة MaqamWorld المخصَّصة لهذا الجنس تحديدًا (upper_rast.php):
  // "نسخة من 4 درجات من جنس راست" — أول 3 أبعاد من راست فقط (بلا البُعد
  // الرابع/الأخير)، بغماز على صول وقرار على دو (نفس درجات راست، مقلوبة
  // نظريًا فقط). ⚠️ خاصية غير معتادة موثَّقة صراحة من المصدر: "قراره في
  // الدرجة الأخيرة من السلم لا الأولى" (يشاركها جنس عجم علوي) — هذا لا
  // يغيّر أبعاد السلم الفعلية عند بناء المقام صعودًا (المُهم لمخططنا هنا)،
  // لكنه فرق نظري-وظيفي مهم يستحق التوثيق صراحة، لا إخفاءه.
  intervalPattern: [INTERVAL_TYPES.WHOLE, INTERVAL_TYPES.THREE_QUARTER, INTERVAL_TYPES.THREE_QUARTER],
  source: SOURCE_MAQAMWORLD + " (صفحة jins/upper_rast.php المخصَّصة) — ⚠️ قراره النظري في الدرجة الأخيرة لا الأولى",
});

export const JINS_SABA = defineJins({
  name: "صبا",
  // ⚠️ موثّق من MaqamWorld كجنس "بحجم غامض" (ambiguous size) — استثناء عن
  // بقية الأجناس، بلا غماز واحد محدَّد بوضوح (نقطتا ارتكاز محتملتان).
  // النمط هنا تقريب مبدئي فقط لأربع درجات أولى (يحتاج تحقق موسّع لاحقًا،
  // هذا الجنس تحديدًا أكثر الأجناس تعقيدًا واختلافًا بين المصادر).
  intervalPattern: [
    INTERVAL_TYPES.THREE_QUARTER,
    INTERVAL_TYPES.THREE_QUARTER,
    INTERVAL_TYPES.WHOLE,
  ],
  source: SOURCE_MAQAMWORLD + " — ⚠️ جنس استثنائي، يحتاج تحققًا موسّعًا قبل الاعتماد النهائي",
});

export const JINS_SIKAH = defineJins({
  name: "سيكا",
  // موثّق حرفيًا من maqamworld.com/en/jins/sikah.php: "Jins Sikah is a
  // 3-note jins. Notated here with its tonic on E and its ghammaz on G."
  // جنس ثلاثي (بُعدان فقط)، مطابق لما ذكره Yedid (2013): "the Sikah jins
  // (3⁄4, 1 tones) is an offshoot of the Rast jins".
  intervalPattern: [INTERVAL_TYPES.THREE_QUARTER, INTERVAL_TYPES.WHOLE],
  source: SOURCE_MAQAMWORLD + " (jins/sikah.php) + Yedid, Maqamat (2013)",
});

export const JINS_KURD = defineJins({
  name: "كرد",
  // موثّق من maqamworld.com/en/jins/kurd.php: "Jins Kurd is a 4-note jins.
  // Notated here with its tonic on D and its ghammaz on G." — يماثل النصف
  // السفلي من مقام فريجي الغربي (بُعد نصفي أول مميّز، ثم بُعدان كاملان).
  intervalPattern: [INTERVAL_TYPES.HALF, INTERVAL_TYPES.WHOLE, INTERVAL_TYPES.WHOLE],
  source: SOURCE_MAQAMWORLD + " (jins/kurd.php)",
});

export const JINS_NAHAWAND = defineJins({
  name: "نهاوند",
  // موثّق: يماثل نمط "Aeolian" الغربي (Yedid 2013: "the Nahawand jins
  // (1, 1⁄2, 1 tones)") — جنس رباعي بلا أرباع تون، الأقرب للسلم الغربي
  // من بين كل الأجناس الرئيسية.
  intervalPattern: [INTERVAL_TYPES.WHOLE, INTERVAL_TYPES.HALF, INTERVAL_TYPES.WHOLE],
  source: SOURCE_MAQAMWORLD + " + Yedid, Maqamat (2013)",
});

// ============ المقامات (Maqamat) ============

export const MAQAM_AJAM = defineMaqam({
  name: "عجم",
  // موثّق من MaqamWorld: "يبدأ بجنس عجم على القرار، يتبعه جنس عجم علوي أو
  // جنس نهاوند على الدرجة الخامسة." نختار عجم علوي كخيار أبسط ابتدائيًا.
  jinsChain: [
    { jins: JINS_AJAM, startDegree: 1 },
    { jins: JINS_AJAM, startDegree: 5 },
  ],
  qarar: "دو",
  ghammaz: "صول",
  sayr: null, // لم يُصادَق عليه سمعيًا بعد
});

export const MAQAM_RAST = defineMaqam({
  name: "راست",
  // مكتمل الآن: جنس راست (القرار، درجات 1-5) يتبعه جنس راست علوي (نفس
  // نمط راست بدرجاته الأربع الأولى فقط، غماز مشترك على الدرجة 5) — موثّق
  // حرفيًا من صفحة MaqamWorld المخصَّصة لجنس "راست علوي": "الجنس الثاني في
  // مقام راست". لم يعد ناقصًا عمدًا كما كان في المرحلة السابقة.
  jinsChain: [
    { jins: JINS_RAST, startDegree: 1 },
    { jins: JINS_UPPER_RAST, startDegree: 5 },
  ],
  qarar: "دو",
  ghammaz: "صول",
  sayr: null,
});

export const MAQAM_HIJAZ = defineMaqam({
  name: "حجاز",
  jinsChain: [
    { jins: JINS_HIJAZ, startDegree: 1 },
    { jins: JINS_RAST, startDegree: 4 }, // موثّق: جنس حجاز غالبًا يليه انتقال لجنس راست أو نهاوند على الدرجة 4
  ],
  qarar: "ري",
  ghammaz: "صول",
  sayr: null,
});

export const MAQAM_BAYATI = defineMaqam({
  name: "بياتي",
  jinsChain: [
    { jins: JINS_BAYATI, startDegree: 1 },
    { jins: JINS_RAST, startDegree: 4 }, // نمط شائع الاستشهاد لبنية مقام بياتي الأساسية
  ],
  qarar: "ري",
  ghammaz: "صول",
  sayr: null,
});

/**
 * مقام صبا — **القرار المعماري الصريح**: "صبا محسومة عمليًا: يُختبر مسار
 * عجم (لا نكريز، مستبعد بقرار سابق) بنفس آلية التوثيق." (سجل القرارات، القرار 5)
 *
 * موثّق من MaqamWorld حرفيًا: "starts with Jins Saba on the tonic,
 * overlapped by Jins Hijaz on the 3rd degree, followed by either Jins
 * 'Ajam or Jins Nikriz on the 6th degree." — ثلاثة أجناس متتالية، لا اثنان.
 * هذا المشروع يختار مسار عجم صراحة على الدرجة السادسة، لا نكريز.
 */
export const MAQAM_SABA = defineMaqam({
  name: "صبا",
  jinsChain: [
    { jins: JINS_SABA, startDegree: 1 },
    { jins: JINS_HIJAZ, startDegree: 3 },
    { jins: JINS_AJAM, startDegree: 6 }, // عجم لا نكريز — قرار صريح
  ],
  qarar: "ري",
  ghammaz: "فا", // تقريبي — صبا استثنائي وغير محسوم الغماز بوضوح حتى في المصدر نفسه
  sayr: null,
});

/**
 * مقام سيكا — موثّق حرفيًا من maqamworld.com/en/maqam/sikah.php: "Maqam
 * Sikah ... starts with the root Jins Sikah on the tonic, followed by Jins
 * Upper Rast on the 3rd degree ... then Jins Rast on the 6th degree (which
 * is a secondary ghammaz)." ثلاثة أجناس متتالية، يعيد استخدام JINS_UPPER_RAST
 * وJINS_RAST الموجودين أصلًا (لا تكرار).
 */
export const MAQAM_SIKAH = defineMaqam({
  name: "سيكا",
  jinsChain: [
    { jins: JINS_SIKAH, startDegree: 1 },
    { jins: JINS_UPPER_RAST, startDegree: 3 },
    { jins: JINS_RAST, startDegree: 6 },
  ],
  qarar: "مي",
  ghammaz: "صول",
  sayr: null,
});

/**
 * مقام كرد — موثّق حرفيًا من maqamworld.com/en/maqam/kurd.php: "Its scale
 * starts with the root Jins Kurd on the tonic, followed by Jins Nahawand
 * on the 4th degree."
 */
export const MAQAM_KURD = defineMaqam({
  name: "كرد",
  jinsChain: [
    { jins: JINS_KURD, startDegree: 1 },
    { jins: JINS_NAHAWAND, startDegree: 4 },
  ],
  qarar: "ري",
  ghammaz: "صول",
  sayr: null,
});

/**
 * مقام نهاوند — موثّق حرفيًا من maqamworld.com/en/maqam/nahawand.php: "Its
 * scale starts with the root Jins Nahawand on the tonic, followed by
 * either Jins Hijaz or Jins Kurd on the 5th degree." نختار كرد كخيار أبسط
 * ابتدائيًا (نفس منطق اختيار عجم علوي لمقام عجم أعلاه).
 */
export const MAQAM_NAHAWAND = defineMaqam({
  name: "نهاوند",
  jinsChain: [
    { jins: JINS_NAHAWAND, startDegree: 1 },
    { jins: JINS_KURD, startDegree: 5 },
  ],
  qarar: "دو",
  ghammaz: "صول",
  sayr: null,
});

export const ALL_MAQAMAT = Object.freeze([
  MAQAM_AJAM,
  MAQAM_RAST,
  MAQAM_HIJAZ,
  MAQAM_BAYATI,
  MAQAM_SABA,
  MAQAM_SIKAH,
  MAQAM_KURD,
  MAQAM_NAHAWAND,
]);
export const ALL_JINS = Object.freeze([
  JINS_AJAM,
  JINS_BAYATI,
  JINS_HIJAZ,
  JINS_RAST,
  JINS_UPPER_RAST,
  JINS_SABA,
  JINS_SIKAH,
  JINS_KURD,
  JINS_NAHAWAND,
]);
