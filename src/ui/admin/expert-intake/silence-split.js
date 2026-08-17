/**
 * silence-split.js
 * ============================================================
 * الفصل التلقائي بين "صوت الخبير" (نطق اسم النغمة/المقام، القرار 13.4)
 * و"النغمة/المقام المعزوف" داخل نفس التسجيل المتصل (القرار 13.6).
 *
 * **قصّ عند فجوة صمت، لا فصل مصادر صوتية حقيقي.** بما إن التسلسل متتابع
 * دائمًا (كلام، ثم صمت قصير، ثم عزف — لا تزامن فوق بعض)، يكفي كشف أول
 * فجوة صمت كافية الطول بعد فترة صوت كافية الطول، ونعتبر بداية العزف هي
 * أول عيّنة بعد نهاية تلك الفجوة. لا نماذج ذكاء اصطناعي ثقيلة، يتماشى مع
 * مبدأ "بلا اعتماديات تشغيل" (القسم 4 من سجل القرارات).
 *
 * **منطق القياس:** طاقة (RMS) كل نافذة زمنية قصيرة، بنفس روح قياس
 * الطاقة/الوضوح المستخدَم أصلًا بكاشف التردد (`src/calibration/pitch-detector.js`)
 * — لا كود مشترك حرفيًا (الخوارزمية هنا أبسط بكثير: تصنيف صامت/غير صامت
 * فقط، لا تحليل تردد)، لكن نفس الروح المفاهيمية.
 *
 * دالة خالصة بالكامل: لا تعتمد على AudioContext أو أي حالة متصفح — قابلة
 * للاختبار مباشرة بمصفوفات Float32Array اصطناعية (انظر
 * `tests/silence-split.test.mjs`).
 */

/**
 * يحسب فهرس بداية "النسخة النظيفة" (بعد كلام الخبير وفجوة الصمت التالية
 * له) داخل عيّنات PCM خام أحادية القناة.
 *
 * @param {Float32Array} samples - عيّنات التسجيل الكامل (خام).
 * @param {number} sampleRate
 * @param {Object} [options]
 * @param {number} [options.windowMs=30] - طول نافذة قياس RMS بالمللي ثانية.
 * @param {number} [options.silenceRmsThreshold=0.006] - أقل RMS يُعتبر "صمت" (نفس عتبة "لا صوت مسموع" المستخدَمة بالتغذية الراجعة الحيّة).
 * @param {number} [options.minSpeechMs=120] - أقل مدة صوت متواصل قبل الفجوة كي تُحتسَب "كلامًا" حقيقيًا لا ضجيجًا عابرًا.
 * @param {number} [options.minSilenceMs=250] - أقل مدة فجوة صمت بعد الكلام كي تُحتسَب فاصلًا حقيقيًا (لا استراحة تنفّس عابرة أثناء الكلام نفسه).
 * @returns {{splitIndex: number, hasSplit: boolean}} - `splitIndex`: فهرس أول عيّنة بعد الفجوة (0 لو لم تُكتشَف فجوة واضحة، فتصير النسخة النظيفة = الخام كاملة). `hasSplit`: هل اكتُشفت فجوة فعليًا.
 */
export function splitBySilenceGap(samples, sampleRate, options = {}) {
  const windowMs = options.windowMs ?? 30;
  const silenceRmsThreshold = options.silenceRmsThreshold ?? 0.006;
  const minSpeechMs = options.minSpeechMs ?? 120;
  const minSilenceMs = options.minSilenceMs ?? 250;

  if (!samples || samples.length === 0 || !sampleRate) {
    return { splitIndex: 0, hasSplit: false };
  }

  const windowSize = Math.max(1, Math.round((windowMs / 1000) * sampleRate));
  const minSpeechWindows = Math.max(1, Math.round(minSpeechMs / windowMs));
  const minSilenceWindows = Math.max(1, Math.round(minSilenceMs / windowMs));
  const numWindows = Math.floor(samples.length / windowSize);

  if (numWindows === 0) {
    return { splitIndex: 0, hasSplit: false };
  }

  const rmsPerWindow = new Array(numWindows);
  for (let w = 0; w < numWindows; w++) {
    let sumSq = 0;
    const start = w * windowSize;
    const end = start + windowSize;
    for (let i = start; i < end; i++) {
      sumSq += samples[i] * samples[i];
    }
    rmsPerWindow[w] = Math.sqrt(sumSq / windowSize);
  }

  let voicedRun = 0;
  let speechConfirmed = false;

  for (let w = 0; w < numWindows; w++) {
    if (rmsPerWindow[w] >= silenceRmsThreshold) {
      voicedRun++;
      if (voicedRun >= minSpeechWindows) speechConfirmed = true;
      continue;
    }

    // نافذة صامتة. لو ما وصلنا بعد لكلام كافٍ، هذي فجوة أولية (قبل أي
    // كلام) — نتجاهلها ونستمر (لا نصفّر speechConfirmed لأنه لم يُثبَت أصلًا).
    if (!speechConfirmed) {
      voicedRun = 0;
      continue;
    }

    // كلام كافٍ سبق هذي النافذة — نقيس طول فجوة الصمت الحالية كاملة.
    let w2 = w;
    while (w2 < numWindows && rmsPerWindow[w2] < silenceRmsThreshold) w2++;
    const silenceRun = w2 - w;

    if (silenceRun >= minSilenceWindows) {
      return { splitIndex: w2 * windowSize, hasSplit: true };
    }

    // فجوة قصيرة (مثل استراحة تنفّس أثناء الكلام) — لا تكفي، نتخطّاها
    // ونعيد عدّ الكلام من بعدها.
    voicedRun = 0;
    speechConfirmed = false;
    w = w2 - 1; // الحلقة ستزيد w بواحد تلقائيًا بالتكرار التالي
  }

  // لا فجوة صمت واضحة بعد كلام كافٍ خلال كل التسجيل — النسخة النظيفة = الخام كاملة.
  return { splitIndex: 0, hasSplit: false };
}
