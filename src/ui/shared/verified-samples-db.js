/**
 * verified-samples-db.js
 * ============================================================
 * تخزين التسجيلات الصوتية المعتمَدة تلقائيًا (القرار 9.3) — IndexedDB لا
 * localStorage، لأن الصوت ثنائي (Blob) وlocalStorage محدود المساحة (~5-10م.ب)
 * ويتطلب ترميز base64 يُضخِّم الحجم ~33%. IndexedDB يدعم Blob مباشرة، حصة
 * أكبر بكثير، وميزة متصفح أصلية (بلا أي مكتبة خارجية، بلا خادم).
 *
 * **نطاق مقصود:** نغمة معتمَدة واحدة فقط لكل معرّف يوم منهج (القرار 9.3) —
 * `putVerifiedSample` يستبدل أي تسجيل سابق لنفس `dayId` (لا تراكم محاولات).
 */

const DB_NAME = "miran_verified_samples_v1";
const STORE_NAME = "samples";
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "dayId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * @typedef {Object} VerifiedSample
 * @property {number} dayId - معرّف يوم المنهج (نفس id في CURRICULUM_NOTES_INDEX).
 * @property {string} targetLabel
 * @property {number} measuredHz - وسيط القراءات المؤهَّلة أثناء الالتقاط.
 * @property {Blob} wavBlob
 * @property {number} capturedAtMs
 */

/**
 * يحفظ (أو يستبدل) تسجيلًا معتمَدًا لمعرّف يوم معطى.
 * @param {VerifiedSample} sample
 */
export async function putVerifiedSample(sample) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(sample);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * يرجع كل معرّفات الأيام التي عندها تسجيل معتمَد محفوظ بالفعل.
 * @returns {Promise<number[]>}
 */
export async function listVerifiedDayIds() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAllKeys();
    request.onsuccess = () => resolve(request.result.map(Number));
    request.onerror = () => reject(request.error);
  });
}

/**
 * يرجع كل التسجيلات المعتمَدة كاملة (لاستخدامات مستقبلية: تصدير، مراجعة).
 * @returns {Promise<VerifiedSample[]>}
 */
export async function getAllVerifiedSamples() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
