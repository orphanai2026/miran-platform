/**
 * metronome-prefs.test.mjs
 * ============================================================
 * اختبار وحدة خالص لـ `metronome-prefs.js` — محاكاة بسيطة لـ `localStorage`
 * في Node (بلا متصفح، بلا Playwright)، للتحقق من الحفظ/القراءة/التحقّق من
 * صحة القيم بلا أي اعتماد على DOM حقيقي.
 *
 * يُشغَّل بـ: node src/metronome/metronome-prefs.test.mjs
 */
import assert from "node:assert/strict";

// محاكاة localStorage خفيفة — كافية لاختبار الوحدة بلا jsdom أو متصفح حقيقي.
class FakeLocalStorage {
  constructor() {
    this._data = new Map();
  }
  getItem(key) {
    return this._data.has(key) ? this._data.get(key) : null;
  }
  setItem(key, value) {
    this._data.set(key, String(value));
  }
  clear() {
    this._data.clear();
  }
}
globalThis.localStorage = new FakeLocalStorage();

const { loadMetronomePrefs, saveMetronomePrefs } = await import("./metronome-prefs.js");

let passed = 0;
let failed = 0;

function test(name, fn) {
  globalThis.localStorage.clear();
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`✗ ${name}`);
    console.error(`  ${err.message}`);
  }
}

test("لا تفضيلات محفوظة بعد: يرجع كائنًا فارغًا", () => {
  assert.deepEqual(loadMetronomePrefs(), {});
});

test("حفظ BPM وميزان صحيحين، ثم قراءتهما كما هما", () => {
  saveMetronomePrefs({ bpm: 96, beatsPerMeasure: 6 });
  assert.deepEqual(loadMetronomePrefs(), { bpm: 96, beatsPerMeasure: 6 });
});

test("حفظ جزئي (bpm فقط) لا يمسح beatsPerMeasure محفوظًا مسبقًا (دمج جزئي)", () => {
  saveMetronomePrefs({ bpm: 100, beatsPerMeasure: 3 });
  saveMetronomePrefs({ bpm: 110 });
  assert.deepEqual(loadMetronomePrefs(), { bpm: 110, beatsPerMeasure: 3 });
});

test("BPM خارج المدى المسموح (30-240) يُتجاهَل عند القراءة", () => {
  localStorage.setItem("miran_metronome_prefs_v1", JSON.stringify({ bpm: 999, beatsPerMeasure: 4 }));
  assert.deepEqual(loadMetronomePrefs(), { beatsPerMeasure: 4 });
});

test("beatsPerMeasure خارج القيم المسموحة (2/3/4/6) يُتجاهَل عند القراءة", () => {
  localStorage.setItem("miran_metronome_prefs_v1", JSON.stringify({ bpm: 90, beatsPerMeasure: 5 }));
  assert.deepEqual(loadMetronomePrefs(), { bpm: 90 });
});

test("JSON تالف في التخزين: لا استثناء، يرجع كائنًا فارغًا", () => {
  localStorage.setItem("miran_metronome_prefs_v1", "{ليس JSON صالحًا");
  assert.deepEqual(loadMetronomePrefs(), {});
});

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
