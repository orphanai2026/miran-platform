/**
 * wav-encoder.js
 * ============================================================
 * ترميز WAV خالص — بلا أي مكتبة خارجية (القرار 9.4: "لا حاجة لفتح استثناء
 * lamejs لأداة يستخدمها خبير واحد أو اثنان"). يحوّل عيّنات PCM خام
 * (Float32Array، النطاق -1..1، نفس ما يُنتجه Web Audio مباشرة) إلى ملف
 * WAV صالح (PCM 16-bit، أحادي القناة) عبر بناء رأس RIFF يدويًا.
 *
 * دالة خالصة بالكامل: لا تعتمد على AudioContext أو أي حالة متصفح — قابلة
 * للاختبار مباشرة بمصفوفات اصطناعية.
 */

/**
 * يحوّل عيّنات PCM أحادية القناة (Float32، -1..1) إلى Blob بصيغة WAV صالحة.
 * @param {Float32Array} samples
 * @param {number} sampleRate - مثلًا 44100 أو 48000.
 * @returns {Blob} - نوع MIME: audio/wav
 */
export function encodeWav(samples, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset, str) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  }

  // رأس RIFF/WAVE القياسي (44 بايت)
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // حجم قسم fmt
  view.setUint16(20, 1, true); // PCM = 1 (بلا ضغط)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // تحويل كل عيّنة Float32 (-1..1) إلى PCM 16-bit موقَّع، مع تحديد النطاق
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const intSample = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

/**
 * يدمج عدة قطع Float32Array متتالية في مصفوفة واحدة متصلة — مفيد لتجميع
 * عيّنات ScriptProcessorNode (كل نداء يعطي قطعة صغيرة منفصلة) قبل الترميز.
 * @param {Float32Array[]} chunks
 * @returns {Float32Array}
 */
export function concatFloat32(chunks) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Float32Array(total);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}
