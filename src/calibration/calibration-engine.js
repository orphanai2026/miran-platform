/**
 * calibration-engine.js
 * ============================================================
 * محرك المعايرة الشخصية — بناء المرجع الشخصي للنغمة وتوثيقه.
 *
 * يطبّق حرفيًا القرارات 1-3 من سجل القرارات:
 *
 * القرار 1 (ثبات المرجع الشخصي):
 *   - لا يُعتمد الهدف الرقمي كمرجع تدريب إلا بعد: 15 محاولة ناجحة على
 *     الأقل، موزّعة على 3 أيام مختلفة (مبتدئ) أو بجلسة واحدة بتقارب
 *     أعلى (محترف).
 *   - عند الاستيفاء، النظام يقترح الاعتماد فقط — الموافقة صريحة، لا تلقائية.
 *   - بعد الاعتماد: لقطة (Snapshot) ثابتة، لا تتحرك تلقائيًا مع كل عينة جديدة.
 *   - استثناء: عينة صوت واحدة واضحة من المالك تكفي لتعليم النظام *اسم*
 *     النغمة (لا حساب مرجعها الرقمي).
 *
 * القرار 2 (وزن العازفين والسماحية المشتقة):
 *   - كل عينة تُخزَّن مع عرض السماحية الفعلي الذي اجتازته وقت التسجيل.
 *   - المتوسط الجماعي مُرجَّح: العينات الأدق تزن أكثر.
 *   - عرض السماحية يُشتق من التفاوت الفعلي بين العينات المقبولة، لا رقم
 *     عام مفروض. نقطة انطلاق بحثية: ~±10 إلى ±25 سنت.
 *
 * القرار 3 (أبعاد بيانات العينة):
 *   - كل عينة تحمل بُعدين إلزاميين: الإصبعة (fingering) والسجل/الأوكتاف (register).
 *   - نوع الناي ثابت من اليوم الأول = "دوكاه".
 *
 * لا اعتماديات خارجية. منطق خالص بالكامل — قابل للاختبار بلا متصفح
 * وبلا AudioContext (انظر calibration-engine.test.mjs).
 */

export const DEFAULT_NEY_TYPE = "دوكاه"; // القرار 3: ثابت حاليًا
export const MIN_ATTEMPTS_FOR_ADOPTION = 15; // القرار 1
export const MIN_DISTINCT_DAYS_BEGINNER = 3; // القرار 1
export const STARTING_TOLERANCE_CENTS_MIN = 10; // القرار 2 — نقطة انطلاق بحثية
export const STARTING_TOLERANCE_CENTS_MAX = 25; // القرار 2 — نقطة انطلاق بحثية

/** مفتاح فريد لكل تركيبة (إصبعة + سجل)، لأن نفس الإصبعة تنتج نغمات مختلفة حسب السجل (القرار 3). */
function pitchKey(fingering, register) {
  return `${fingering}::${register}`;
}

/** يوم من التاريخ كنص YYYY-MM-DD، لحساب "الأيام المختلفة" في القرار 1. */
function dayKeyFromTimestamp(timestampMs) {
  const d = new Date(timestampMs);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export class CalibrationSample {
  /**
   * @param {Object} params
   * @param {number} params.pitchHz - التردد المقاس.
   * @param {string} params.fingering - الإصبعة (بُعد إلزامي، القرار 3).
   * @param {string} params.register - السجل/الأوكتاف (بُعد إلزامي، القرار 3).
   * @param {number} params.toleranceCents - عرض السماحية الذي اجتازته هذه العينة وقت التسجيل (القرار 2).
   * @param {string} [params.neyType] - نوع الناي، ثابت افتراضيًا (القرار 3).
   * @param {number} [params.timestampMs] - وقت التسجيل، افتراضيًا الآن.
   */
  constructor({ pitchHz, fingering, register, toleranceCents, neyType = DEFAULT_NEY_TYPE, timestampMs = Date.now() }) {
    if (!Number.isFinite(pitchHz) || pitchHz <= 0) {
      throw new RangeError(`pitchHz غير صالح: ${pitchHz}`);
    }
    if (!fingering) {
      throw new Error("العينة تحتاج بُعد الإصبعة (fingering) إلزاميًا — القرار 3.");
    }
    if (!register) {
      throw new Error("العينة تحتاج بُعد السجل/الأوكتاف (register) إلزاميًا — القرار 3.");
    }
    if (!Number.isFinite(toleranceCents) || toleranceCents <= 0) {
      throw new RangeError(`toleranceCents غير صالح: ${toleranceCents}`);
    }
    this.pitchHz = pitchHz;
    this.fingering = fingering;
    this.register = register;
    this.toleranceCents = toleranceCents;
    this.neyType = neyType;
    this.timestampMs = timestampMs;
    this.dayKey = dayKeyFromTimestamp(timestampMs);
  }
}

export class PersonalReferenceStore {
  constructor() {
    /** @type {Map<string, CalibrationSample[]>} */
    this._samplesByKey = new Map();
    /** @type {Map<string, {pitchHz:number, toleranceCents:number, approvedAtMs:number}>} */
    this._frozenSnapshots = new Map();
    /** @type {Map<string, string>} اسم النغمة المُعلَّم من عينة واحدة (استثناء القرار 1) */
    this._taughtNames = new Map();
  }

  addSample(sample) {
    if (!(sample instanceof CalibrationSample)) {
      throw new TypeError("addSample يتطلب كائن CalibrationSample.");
    }
    const key = pitchKey(sample.fingering, sample.register);
    if (!this._samplesByKey.has(key)) this._samplesByKey.set(key, []);
    this._samplesByKey.get(key).push(sample);
  }

  getSamples(fingering, register) {
    return this._samplesByKey.get(pitchKey(fingering, register)) ?? [];
  }

  /**
   * استثناء القرار 1: عينة صوت واحدة واضحة من المالك تكفي لتعليم *اسم*
   * النغمة فقط — لا تُحسب كمساهمة في المرجع الرقمي المُوزَّن.
   */
  teachPitchName(fingering, register, name) {
    if (!name) throw new Error("اسم النغمة مطلوب.");
    this._taughtNames.set(pitchKey(fingering, register), name);
  }

  getTaughtName(fingering, register) {
    return this._taughtNames.get(pitchKey(fingering, register)) ?? null;
  }

  /**
   * المتوسط المُرجَّح (القرار 2): العينات ذات السماحية الأضيق (الأدق) تزن أكثر.
   * الوزن = 1 / toleranceCents.
   */
  computeWeightedAverage(fingering, register) {
    const samples = this.getSamples(fingering, register);
    if (!samples.length) return null;
    let weightedSum = 0;
    let totalWeight = 0;
    for (const s of samples) {
      const weight = 1 / s.toleranceCents;
      weightedSum += s.pitchHz * weight;
      totalWeight += weight;
    }
    return weightedSum / totalWeight;
  }

  /**
   * الانحراف المعياري الخام بالسنتات، بلا أي حدّ أدنى/أعلى مفروض — يُستخدم
   * داخليًا كمقياس "تقارب" حقيقي (مثلًا لشرط المحترف في القرار 1)، بعكس
   * computeDerivedTolerance المخصص للسماحية المنشورة فعليًا (محدودة بنطاق
   * الانطلاق البحثي [10,25]).
   */
  _computeRawConvergenceCents(fingering, register) {
    const samples = this.getSamples(fingering, register);
    if (samples.length < 2) return null;
    const avg = this.computeWeightedAverage(fingering, register);
    let sumSquares = 0;
    for (const s of samples) {
      const cents = 1200 * Math.log2(s.pitchHz / avg);
      sumSquares += cents * cents;
    }
    return Math.sqrt(sumSquares / samples.length);
  }

  /**
   * السماحية المشتقة (القرار 2): من التفاوت الفعلي بين العينات المقبولة
   * (الانحراف المعياري بالسنتات حول المتوسط المُرجَّح)، لا رقم مفروض.
   * تُحدّ بين نقطتَي الانطلاق البحثيتين [10, 25] سنت كحد أدنى/تلطيف مبدئي
   * — هذا الحد مخصص للسماحية *المنشورة* فقط، وليس لقياس التقارب الداخلي
   * (انظر _computeRawConvergenceCents لذلك).
   */
  computeDerivedTolerance(fingering, register) {
    const raw = this._computeRawConvergenceCents(fingering, register);
    if (raw === null) return null;
    return Math.min(Math.max(raw, STARTING_TOLERANCE_CENTS_MIN), STARTING_TOLERANCE_CENTS_MAX);
  }

  /**
   * القرار 1: هل استوفت هذه التركيبة (إصبعة+سجل) شرط الترشّح للاعتماد؟
   * @param {string} fingering
   * @param {string} register
   * @param {"beginner"|"professional"} profile
   * @returns {boolean}
   */
  isEligibleForAdoption(fingering, register, profile = "beginner") {
    const samples = this.getSamples(fingering, register);
    if (samples.length < MIN_ATTEMPTS_FOR_ADOPTION) return false;
    if (profile === "beginner") {
      const distinctDays = new Set(samples.map((s) => s.dayKey));
      return distinctDays.size >= MIN_DISTINCT_DAYS_BEGINNER;
    }
    if (profile === "professional") {
      // جلسة واحدة (يوم واحد) بتقارب أعلى — نطلب تقاربًا خامًا أضيق من نصف
      // الحد الأدنى البحثي (بلا حد أدنى مصطنع، بعكس السماحية المنشورة).
      const distinctDays = new Set(samples.map((s) => s.dayKey));
      const rawConvergence = this._computeRawConvergenceCents(fingering, register);
      const tighterThreshold = STARTING_TOLERANCE_CENTS_MIN / 2;
      return distinctDays.size === 1 && rawConvergence !== null && rawConvergence <= tighterThreshold;
    }
    throw new Error(`profile غير معروف: ${profile}`);
  }

  /**
   * يقترح الاعتماد فقط — لا يعتمد تلقائيًا (القرار 1: "النظام يقترح الاعتماد
   * فقط — المستخدم يوافق صراحة").
   */
  suggestAdoption(fingering, register, profile = "beginner") {
    if (!this.isEligibleForAdoption(fingering, register, profile)) return null;
    return {
      fingering,
      register,
      suggestedPitchHz: this.computeWeightedAverage(fingering, register),
      suggestedToleranceCents: this.computeDerivedTolerance(fingering, register),
      sampleCount: this.getSamples(fingering, register).length,
    };
  }

  /**
   * موافقة صريحة من المستخدم — تُنشئ لقطة ثابتة (Snapshot) لا تتحرك تلقائيًا
   * مع عينات جديدة لاحقة (القرار 1).
   */
  approveReference(fingering, register, profile = "beginner") {
    const suggestion = this.suggestAdoption(fingering, register, profile);
    if (!suggestion) {
      throw new Error("لا يوجد اقتراح مؤهل للاعتماد بعد — راجع isEligibleForAdoption.");
    }
    const key = pitchKey(fingering, register);
    this._frozenSnapshots.set(key, {
      pitchHz: suggestion.suggestedPitchHz,
      toleranceCents: suggestion.suggestedToleranceCents,
      approvedAtMs: Date.now(),
    });
    return this._frozenSnapshots.get(key);
  }

  /** يرجع اللقطة الثابتة المعتمدة، أو null إن لم تُعتمد بعد. */
  getFrozenReference(fingering, register) {
    return this._frozenSnapshots.get(pitchKey(fingering, register)) ?? null;
  }

  // ================= تصدير/استيراد (للتخزين المحلي في الواجهة) =================
  // دوال عامة بديلة عن الوصول المباشر للحقول الداخلية (_samplesByKey إلخ)
  // من خارج الصنف — تُبقي التخزين المحلي (مثل sample-store.js في صفحة #2)
  // معزولًا عن تفاصيل التنفيذ الداخلية.

  /** كل العينات المخزَّنة، بصيغة خام قابلة لإعادة البناء عبر CalibrationSample. */
  exportAllSamples() {
    const all = [];
    for (const samples of this._samplesByKey.values()) {
      for (const s of samples) {
        all.push({
          pitchHz: s.pitchHz,
          fingering: s.fingering,
          register: s.register,
          toleranceCents: s.toleranceCents,
          neyType: s.neyType,
          timestampMs: s.timestampMs,
        });
      }
    }
    return all;
  }

  /** كل اللقطات المعتمدة، بمفتاح "إصبعة::سجل" — للتخزين/الاستعادة. */
  exportAllFrozenSnapshots() {
    const out = {};
    for (const [key, val] of this._frozenSnapshots.entries()) out[key] = val;
    return out;
  }

  /** كل الأسماء المُعلَّمة (استثناء القرار 1)، بمفتاح "إصبعة::سجل". */
  exportAllTaughtNames() {
    const out = {};
    for (const [key, val] of this._taughtNames.entries()) out[key] = val;
    return out;
  }

  /**
   * يستعيد لقطة مُصدَّرة سابقًا مباشرة (بدون إعادة اجتياز شرط الاعتماد) —
   * تُستخدم فقط لإعادة بناء حالة سبق اعتمادها فعليًا من تخزين محلي.
   */
  restoreFrozenSnapshot(fingering, register, snapshot) {
    this._frozenSnapshots.set(pitchKey(fingering, register), snapshot);
  }
}
