/**
 * maqam-schema.js
 * ============================================================
 * مخطط بيانات الأجناس والمقامات — يطبّق القرار 5 من سجل القرارات.
 *
 * السلم (Scale): بيانات آلية جاهزة (أبعاد، أجناس، قرار وغماز) من مصادر
 * موثقة (MaqamWorld وغيرها). هذا الجزء نظري-رياضي، ثابت بمجرد تسجيله.
 *
 * السِّير اللحني (Sayr): نموذج مبسّط (قرار، غماز، اتجاه صاعد/هابط/مختلط،
 * جنس سفلي/علوي) يُستخرج من نفس المصادر، لكن **يُصادَق عليه سمعيًا** قبل
 * اعتماده — حاليًا بتوافق ثنائي (المالك + خبير واحد متاح)، ومستقبلًا بلجنة
 * عند تعدد الخبراء. كل قيمة غير مصادَق عليها تحمل علامة "؟" صراحة.
 *
 * **مهم:** أرباع/أنصاف التون الشرقية هنا سقالة نظرية-تربوية لا حقيقة أداء
 * فعلية (مؤكَّد ببحث Marcus 1993 وغيره في سجل القرارات) — لهذا هذا المخطط
 * يمثّل بنية الأجناس بالدرجات النسبية (نوع البُعد: كامل/نصف/ربع تقريبي)
 * لا بقيم سنتات مطلقة يُدَّعى دقتها. القيم الدقيقة تُصحَّح لاحقًا ببيانات
 * عزف حقيقية موثّقة (القرار 1) — ليست جزءًا من هذا المخطط.
 */

/** أنواع البُعد بين درجتين متتاليتين في الجنس، بالتقريب النظري لا المطلق. */
export const INTERVAL_TYPES = Object.freeze({
  WHOLE: "whole", // بُعد كامل تقريبًا
  HALF: "half", // نصف بُعد تقريبًا (سلم كروماتيكي غربي)
  THREE_QUARTER: "three_quarter", // ثلاثة أرباع تقريبًا (مميّز شرقيًا)
  QUARTER: "quarter", // ربع بُعد تقريبًا
  AUGMENTED_SECOND: "augmented_second", // بُعد وربع تقريبًا (مميّز في الحجاز)
});

/** حالة المصادقة على أي قيمة في السِّير اللحني — القرار 5. */
export const VALIDATION_STATUS = Object.freeze({
  UNVALIDATED: "unvalidated", // "؟" — لم يُصادَق عليه سمعيًا بعد
  VALIDATED: "validated", // توافق ثنائي أو لجنة
});

/**
 * جنس (Jins) — أصغر وحدة بنائية في المقام: 3-5 درجات متتالية.
 * @typedef {Object} Jins
 * @property {string} name - اسم الجنس (مثلًا "عجم"، "بياتي").
 * @property {string[]} intervalPattern - نمط الأبعاد بين الدرجات المتتالية (من INTERVAL_TYPES).
 * @property {string} source - المصدر الموثَّق (مثلًا "MaqamWorld").
 */

/**
 * @param {Object} params
 * @param {string} params.name
 * @param {string[]} params.intervalPattern
 * @param {string} params.source
 * @returns {Jins}
 */
export function defineJins({ name, intervalPattern, source }) {
  if (!name) throw new Error("اسم الجنس مطلوب.");
  if (!Array.isArray(intervalPattern) || intervalPattern.length === 0) {
    throw new Error(`نمط الأبعاد مطلوب للجنس "${name}".`);
  }
  for (const interval of intervalPattern) {
    if (!Object.values(INTERVAL_TYPES).includes(interval)) {
      throw new Error(`نوع بُعد غير معروف "${interval}" في الجنس "${name}".`);
    }
  }
  if (!source) throw new Error(`مصدر موثَّق مطلوب للجنس "${name}" (القرار 5).`);
  return { name, intervalPattern, source };
}

/**
 * مقام (Maqam) — سلسلة أجناس متتالية (2 أو 3 حسب المقام، MaqamWorld يوثّق
 * حالات ثلاثية مثل صبا: صبا على القرار ← حجاز على الدرجة 3 ← عجم/نكريز
 * على الدرجة 6) + سِّير لحني منفصل قابل للمصادقة.
 * @typedef {Object} JinsSegment
 * @property {Jins} jins
 * @property {number} startDegree - رقم الدرجة داخل سلم المقام حيث يبدأ هذا الجنس (1 = القرار).
 *
 * @typedef {Object} Maqam
 * @property {string} name
 * @property {JinsSegment[]} jinsChain - سلسلة الأجناس بالترتيب من القرار صعودًا.
 * @property {string} qarar - درجة القرار (نغمة الاستقرار السفلى).
 * @property {string} ghammaz - درجة الغماز (نقطة الارتكاز الثانوية للجنس الأول).
 * @property {SayrEntry|null} sayr - السِّير اللحني، أو null إن لم يُسجَّل بعد.
 */

export class SayrEntry {
  /**
   * @param {Object} params
   * @param {string} params.qarar
   * @param {string} params.ghammaz
   * @param {"ascending"|"descending"|"mixed"} params.direction
   * @param {"lower"|"upper"} params.startingJins
   * @param {string} params.source - المصدر الذي استُخرج منه السِّير قبل المصادقة.
   */
  constructor({ qarar, ghammaz, direction, startingJins, source }) {
    if (!qarar) throw new Error("قرار السِّير مطلوب.");
    if (!ghammaz) throw new Error("غماز السِّير مطلوب.");
    if (!["ascending", "descending", "mixed"].includes(direction)) {
      throw new Error(`اتجاه غير معروف: ${direction}`);
    }
    if (!["lower", "upper"].includes(startingJins)) {
      throw new Error(`جنس بداية غير معروف: ${startingJins}`);
    }
    if (!source) throw new Error("مصدر السِّير مطلوب قبل الاستخراج (القرار 5).");
    this.qarar = qarar;
    this.ghammaz = ghammaz;
    this.direction = direction;
    this.startingJins = startingJins;
    this.source = source;
    // كل سِّير يبدأ "؟" وجوبًا حتى تتم المصادقة الصوتية الصريحة — لا اعتماد افتراضي.
    this.validationStatus = VALIDATION_STATUS.UNVALIDATED;
    this.validation = null; // يُملأ عبر validateSayr()
  }

  get isValidated() {
    return this.validationStatus === VALIDATION_STATUS.VALIDATED;
  }

  /** التسمية المعروضة للمستخدم — تحمل "؟" صراحة إن لم تُصادَق (القرار 5). */
  displayLabel() {
    return this.isValidated ? this.direction : `${this.direction} ؟`;
  }
}

/**
 * يسجّل مصادقة سمعية على سِّير — توافق ثنائي حاليًا (المالك + خبير واحد
 * متاح)، حسب القرار 5. لا يُعتمد السِّير بدون هذا الاستدعاء الصريح.
 * @param {SayrEntry} sayr
 * @param {Object} params
 * @param {boolean} params.ownerAgrees
 * @param {boolean} params.expertAgrees
 * @param {string} [params.expertName]
 */
export function validateSayr(sayr, { ownerAgrees, expertAgrees, expertName = null }) {
  if (!(sayr instanceof SayrEntry)) {
    throw new TypeError("validateSayr يتطلب كائن SayrEntry.");
  }
  const consensus = Boolean(ownerAgrees) && Boolean(expertAgrees);
  sayr.validation = {
    ownerAgrees: Boolean(ownerAgrees),
    expertAgrees: Boolean(expertAgrees),
    expertName,
    consensus,
    validatedAtMs: Date.now(),
  };
  sayr.validationStatus = consensus ? VALIDATION_STATUS.VALIDATED : VALIDATION_STATUS.UNVALIDATED;
  return sayr;
}

/**
 * @param {Object} params
 * @param {string} params.name
 * @param {JinsSegment[]} params.jinsChain - سلسلة أجناس (2 على الأقل)، بالترتيب من القرار.
 * @param {string} params.qarar
 * @param {string} params.ghammaz
 * @param {SayrEntry|null} [params.sayr]
 * @returns {Maqam}
 */
export function defineMaqam({ name, jinsChain, qarar, ghammaz, sayr = null }) {
  if (!name) throw new Error("اسم المقام مطلوب.");
  if (!Array.isArray(jinsChain) || jinsChain.length < 1) {
    throw new Error(`المقام "${name}" يحتاج جنسًا واحدًا على الأقل في السلسلة.`);
  }
  for (const segment of jinsChain) {
    if (!segment.jins) throw new Error(`عنصر في سلسلة أجناس "${name}" بلا جنس محدَّد.`);
    if (!Number.isInteger(segment.startDegree) || segment.startDegree < 1) {
      throw new Error(`startDegree غير صالح في سلسلة أجناس "${name}".`);
    }
  }
  if (!qarar) throw new Error(`المقام "${name}" يحتاج درجة قرار.`);
  if (!ghammaz) throw new Error(`المقام "${name}" يحتاج درجة غماز.`);
  return { name, jinsChain, qarar, ghammaz, sayr };
}
