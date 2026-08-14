/**
 * metronome-engine.js
 * ============================================================
 * محرك المترونوم الوحيد — مصدر الحقيقة الواحد للكود (القسم 7، الصفحتان #2 و#5).
 *
 * القرار التقني: جدولة lookahead scheduler (نمط Chris Wilson الكلاسيكي:
 * "A Tale of Two Clocks") بدل الاعتماد على setInterval/setTimeout مباشرة
 * لتوليد النقرات. السبب: مؤقتات JS العادية غير دقيقة (تتأخر تحت ضغط
 * الـ event loop)، بينما AudioContext.currentTime ساعة عالية الدقة لا
 * تتأثر بانشغال المتصفح. نجدول النقرات القادمة مسبقًا ضمن نافذة قصيرة
 * (scheduleAheadTime)، ونتحقق دوريًا (lookaheadIntervalMs) هل حان وقت
 * جدولة نقرات إضافية.
 *
 * لا اعتماديات خارجية. ES module صرف، متوافق مع فلسفة "بلا خادم، بلا
 * اعتماديات تشغيل" (القسم 4 من سجل القرارات).
 *
 * فصل متعمد بين:
 *  - منطق التوقيت الخالص (computeNextNoteTime, advanceBeat) — قابل للاختبار
 *    بدون AudioContext أو متصفح (انظر metronome-engine.test.mjs).
 *  - التكامل الصوتي الفعلي (scheduleNote, start, stop) — يحتاج بيئة متصفح.
 */

export class MetronomeEngine {
  /**
   * @param {Object} [options]
   * @param {number} [options.bpm=80] - النبضات في الدقيقة.
   * @param {number} [options.beatsPerMeasure=4] - عدد النبضات في الوزن (للنبرة على النبضة الأولى).
   * @param {number} [options.scheduleAheadTime=0.1] - بالثواني: حجم نافذة الجدولة المسبقة.
   * @param {number} [options.lookaheadIntervalMs=25] - بالمللي ثانية: تكرار فحص الجدولة.
   */
  constructor(options = {}) {
    this.bpm = options.bpm ?? 80;
    this.beatsPerMeasure = options.beatsPerMeasure ?? 4;
    this.scheduleAheadTime = options.scheduleAheadTime ?? 0.1;
    this.lookaheadIntervalMs = options.lookaheadIntervalMs ?? 25;

    this._audioContext = null;
    this._timerId = null;
    this._nextNoteTime = 0;
    this._currentBeat = 0;
    this._isRunning = false;

    /** @type {Array<(beatIndex:number, isAccent:boolean, time:number)=>void>} */
    this._beatListeners = [];
  }

  get isRunning() {
    return this._isRunning;
  }

  /** يشترك مستمع في كل نبضة مجدولة (يُستخدم للواجهة: full أو mini، بلا فرق بالمحرك). */
  onBeat(listener) {
    this._beatListeners.push(listener);
    return () => {
      this._beatListeners = this._beatListeners.filter((l) => l !== listener);
    };
  }

  setBpm(bpm) {
    if (!Number.isFinite(bpm) || bpm <= 0) {
      throw new RangeError(`BPM غير صالح: ${bpm}`);
    }
    this.bpm = bpm;
  }

  setBeatsPerMeasure(n) {
    if (!Number.isInteger(n) || n <= 0) {
      throw new RangeError(`beatsPerMeasure غير صالح: ${n}`);
    }
    this.beatsPerMeasure = n;
  }

  /** ثانية واحدة لكل نبضة، محسوبة من BPM الحالي. منطق خالص، قابل للاختبار وحده. */
  secondsPerBeat() {
    return 60.0 / this.bpm;
  }

  /** يحسب زمن النبضة التالية، بمعزل عن الصوت — قابل للاختبار وحده. */
  computeNextNoteTime(currentNoteTime) {
    return currentNoteTime + this.secondsPerBeat();
  }

  /** يقدّم عداد النبضة ضمن الوزن (0..beatsPerMeasure-1) — قابل للاختبار وحده. */
  advanceBeat(currentBeat) {
    return (currentBeat + 1) % this.beatsPerMeasure;
  }

  // ================= التكامل الصوتي (يحتاج متصفح) =================

  start() {
    if (this._isRunning) return;
    if (typeof window === "undefined" || !("AudioContext" in window || "webkitAudioContext" in window)) {
      throw new Error("AudioContext غير متاح في هذه البيئة — start() يحتاج متصفحًا.");
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this._audioContext = this._audioContext || new Ctx();
    if (this._audioContext.state === "suspended") {
      this._audioContext.resume();
    }
    this._currentBeat = 0;
    this._nextNoteTime = this._audioContext.currentTime + 0.05;
    this._isRunning = true;
    this._scheduler();
  }

  stop() {
    this._isRunning = false;
    if (this._timerId !== null) {
      clearTimeout(this._timerId);
      this._timerId = null;
    }
  }

  _scheduler() {
    if (!this._isRunning) return;
    while (this._nextNoteTime < this._audioContext.currentTime + this.scheduleAheadTime) {
      this._scheduleNote(this._currentBeat, this._nextNoteTime);
      this._nextNoteTime = this.computeNextNoteTime(this._nextNoteTime);
      this._currentBeat = this.advanceBeat(this._currentBeat);
    }
    this._timerId = setTimeout(() => this._scheduler(), this.lookaheadIntervalMs);
  }

  _scheduleNote(beatIndex, time) {
    const isAccent = beatIndex === 0;
    this._playClick(isAccent, time);
    for (const listener of this._beatListeners) {
      listener(beatIndex, isAccent, time);
    }
  }

  _playClick(isAccent, time) {
    const ctx = this._audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = isAccent ? 1500 : 1000;
    gain.gain.setValueAtTime(0.6, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.05);
  }
}
