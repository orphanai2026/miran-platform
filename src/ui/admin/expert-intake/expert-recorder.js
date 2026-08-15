/**
 * expert-recorder.js
 * ============================================================
 * محرك تسجيل صفحة الخبير — يفتح الميكروفون مرة واحدة، ويعطي تغذية راجعة
 * حيّة للتردد أثناء العزف (يعيد استخدام `detectPitch` الموجود أصلًا في
 * `src/calibration/pitch-detector.js` — بلا أي كود منسوخ أو مكرَّر)، مع
 * التقاط عيّنات PCM خام بالتوازي لترميزها WAV لاحقًا (`wav-encoder.js`).
 *
 * **ملاحظة تقنية:** يستخدم `ScriptProcessorNode` (مُهمَل رسميًا لصالح
 * AudioWorklet، لكنه مدعوم عالميًا ولا يحتاج ملف worklet منفصل يُحمَّل
 * بشكل غير متزامن) — خيار مقصود للبساطة في أداة إدارية داخلية محدودة
 * الاستخدام، لا واجهة عامة للمتدربين.
 */
import { detectPitch } from "../../../calibration/pitch-detector.js";
import { concatFloat32, encodeWav } from "./wav-encoder.js";

const PROCESSOR_BUFFER_SIZE = 4096;

/**
 * ينشئ محرك تسجيل واحد لجلسة صفحة الخبير كاملة (ميكروفون واحد يُفتَح مرة).
 * @returns {{
 *   ensureMic: () => Promise<void>,
 *   startCapture: (onLiveReading: (reading: {hz: number|null, clarity: number, rms: number}) => void) => void,
 *   stopCapture: () => {wavBlob: Blob, sampleRate: number, measuredHz: number|null},
 *   isMicReady: () => boolean,
 * }}
 */
export function createExpertRecorder() {
  let audioCtx = null;
  let processor = null;
  let source = null;
  let micStream = null;
  let capturing = false;
  let chunks = [];
  let clearReadings = []; // ترددات القراءات الواضحة أثناء آخر التقاط — لحساب الوسيط النهائي

  async function ensureMic() {
    if (audioCtx) return;
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    source = audioCtx.createMediaStreamSource(micStream);
    processor = audioCtx.createScriptProcessor(PROCESSOR_BUFFER_SIZE, 1, 1);
    processor.onaudioprocess = (e) => {
      const buf = e.inputBuffer.getChannelData(0);
      const reading = detectPitch(buf, audioCtx.sampleRate);
      if (capturing) {
        chunks.push(Float32Array.from(buf));
        if (reading.hz && reading.clarity >= 0.6) clearReadings.push(reading.hz);
      }
      if (capturing && currentOnLiveReading) currentOnLiveReading(reading);
    };
    source.connect(processor);
    // عقدة ScriptProcessorNode تحتاج اتصالًا بوجهة (destination) لتعمل في
    // بعض المتصفحات، حتى لو لا نريد سماع الصدى — نستخدم gain=0 لمنع أي صوت.
    const silentGain = audioCtx.createGain();
    silentGain.gain.value = 0;
    processor.connect(silentGain);
    silentGain.connect(audioCtx.destination);
  }

  let currentOnLiveReading = null;

  function startCapture(onLiveReading) {
    chunks = [];
    clearReadings = [];
    capturing = true;
    currentOnLiveReading = onLiveReading || null;
  }

  function stopCapture() {
    capturing = false;
    currentOnLiveReading = null;
    const samples = concatFloat32(chunks);
    const wavBlob = encodeWav(samples, audioCtx.sampleRate);
    let measuredHz = null;
    if (clearReadings.length > 0) {
      const sorted = [...clearReadings].sort((a, b) => a - b);
      measuredHz = sorted[Math.floor(sorted.length / 2)]; // الوسيط — أثبت من المتوسط أمام القيم الشاذة
    }
    return { wavBlob, sampleRate: audioCtx.sampleRate, measuredHz };
  }

  function isMicReady() {
    return Boolean(audioCtx);
  }

  return { ensureMic, startCapture, stopCapture, isMicReady };
}
