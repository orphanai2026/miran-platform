/**
 * pitch-detector.js
 * ============================================================
 * كشف النغمة الأساسي (fundamental frequency) من عيّنة صوت خام، بخوارزمية
 * الترابط الذاتي (autocorrelation) مع استيفاء قمة مكافئ (parabolic
 * interpolation) لدقة أعلى من دقة العيّنة الواحدة.
 *
 * **مصدر الخوارزمية:** نسخة مُنقّاة وموثّقة من محرك الكشف المُختبر أصلًا
 * داخل `src/exercises/legacy-miran/index.html` (قسم "AUDIO + PITCH
 * (validated engine)"). هذا ليس نسخًا لكود RECORD-N (الممنوع بقرار
 * معماري صريح) — هو إعادة استخدام محرك مِران نفسه المُختبر، مع تنظيف
 * التسمية والتوثيق فقط، بلا تغيير جوهري بالمنطق الرياضي المُثبَت أصلًا.
 *
 * دالة خالصة بالكامل: تأخذ Float32Array + معدل العيّنة، وترجع تردّدًا.
 * لا تعتمد على AudioContext أو المتصفح — قابلة للاختبار بإشارات اصطناعية
 * (انظر pitch-detector.test.mjs).
 */

const DEFAULT_FMIN = 140; // هرتز — أدنى تردد متوقع (نطاق الناي التقريبي)
const DEFAULT_FMAX = 1600; // هرتز — أعلى تردد متوقع
const SILENCE_RMS_THRESHOLD = 0.006; // دون هذا المستوى تُعتبر العيّنة صمتًا

/**
 * يكشف التردد الأساسي في عيّنة صوت أحادية القناة.
 * @param {Float32Array|number[]} samples - عيّنات الصوت الخام (نطاق -1..1).
 * @param {number} sampleRate - معدل العيّنة بالهرتز (مثلًا 44100).
 * @param {Object} [options]
 * @param {number} [options.fMin=140]
 * @param {number} [options.fMax=1600]
 * @param {number} [options.silenceRmsThreshold=0.006]
 * @returns {{ hz: number|null, clarity: number, rms: number }}
 *   hz=null يعني: لا يوجد تردد موثوق (صمت أو إشارة غير واضحة).
 */
export function detectPitch(samples, sampleRate, options = {}) {
  const fMin = options.fMin ?? DEFAULT_FMIN;
  const fMax = options.fMax ?? DEFAULT_FMAX;
  const silenceThreshold = options.silenceRmsThreshold ?? SILENCE_RMS_THRESHOLD;

  const x = Float32Array.from(samples);
  const n = x.length;

  // إزالة الإزاحة الوسطى (DC offset) قبل أي حساب
  let mean = 0;
  for (let i = 0; i < n; i++) mean += x[i];
  mean /= n;
  for (let i = 0; i < n; i++) x[i] -= mean;

  // فحص الصمت عبر RMS — لا داعي لحساب الترابط الذاتي إذا الإشارة ضعيفة جدًا
  let rms = 0;
  for (let i = 0; i < n; i++) rms += x[i] * x[i];
  rms = Math.sqrt(rms / n);
  if (rms < silenceThreshold) {
    return { hz: null, clarity: 0, rms };
  }

  const tauMin = Math.floor(sampleRate / fMax);
  const tauMax = Math.min(Math.floor(sampleRate / fMin), n - 1);
  const correlations = new Float32Array(tauMax + 1);

  for (let tau = tauMin; tau <= tauMax; tau++) {
    let ac = 0;
    let normalization = 0;
    for (let j = 0; j < n - tau; j++) {
      ac += x[j] * x[j + tau];
      normalization += x[j] * x[j] + x[j + tau] * x[j + tau];
    }
    correlations[tau] = normalization > 0 ? (2 * ac) / normalization : 0;
  }

  // إيجاد القمم المحلية في منحنى الترابط الذاتي
  const peaks = [];
  let t = tauMin;
  while (t <= tauMax && correlations[t] > 0) t++;
  while (t <= tauMax) {
    if (correlations[t] <= 0) {
      t++;
      continue;
    }
    let bestInThisPeak = t;
    while (t <= tauMax && correlations[t] > 0) {
      if (correlations[t] > correlations[bestInThisPeak]) bestInThisPeak = t;
      t++;
    }
    peaks.push(bestInThisPeak);
  }

  if (!peaks.length) {
    return { hz: null, clarity: 0, rms };
  }

  // اختيار أول قمة قريبة من الحد الأقصى (تفادي تردد توافقي مضاعف)
  let maxCorrelation = 0;
  for (const p of peaks) if (correlations[p] > maxCorrelation) maxCorrelation = correlations[p];
  const threshold = 0.8 * maxCorrelation;
  let chosenTau = peaks[0];
  for (const p of peaks) {
    if (correlations[p] >= threshold) {
      chosenTau = p;
      break;
    }
  }

  // استيفاء مكافئ (parabolic interpolation) لدقة تحت-عيّنة واحدة
  let shift = 0;
  if (chosenTau > 0 && chosenTau < tauMax) {
    const a = correlations[chosenTau - 1];
    const b = correlations[chosenTau];
    const c = correlations[chosenTau + 1];
    const denominator = a - 2 * b + c;
    if (denominator !== 0) shift = 0.5 * (a - c) / denominator;
  }

  return {
    hz: sampleRate / (chosenTau + shift),
    clarity: maxCorrelation,
    rms,
  };
}

/** الفرق بالسنتات بين تردد مقاس وتردد مرجعي. موجب = أحدّ (أعلى) من المرجع. */
export function centsBetween(measuredHz, referenceHz) {
  return 1200 * Math.log2(measuredHz / referenceHz);
}
