/**
 * wav-encoder.test.mjs
 * ============================================================
 * اختبار وحدة لدالة ترميز WAV الخالصة (بلا متصفح، بلا Playwright — دالة
 * حسابية بحتة قابلة للاختبار مباشرة بـ Node).
 *
 * يُشغَّل بـ: node src/ui/admin/expert-intake/tests/wav-encoder.test.mjs
 */
import assert from "node:assert/strict";
import { encodeWav, concatFloat32 } from "../wav-encoder.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
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

async function blobHeaderBytes(blob, count) {
  const buf = await blob.arrayBuffer();
  return new Uint8Array(buf.slice(0, count));
}

test("encodeWav: يرجع Blob بنوع MIME الصحيح", () => {
  const samples = new Float32Array(100).fill(0);
  const blob = encodeWav(samples, 44100);
  assert.equal(blob.type, "audio/wav");
});

test("encodeWav: الحجم الإجمالي = 44 بايت رأس + عيّنتان لكل قيمة (16-bit)", () => {
  const samples = new Float32Array([0.1, -0.2, 0.5, -1, 1]);
  const blob = encodeWav(samples, 44100);
  assert.equal(blob.size, 44 + samples.length * 2);
});

test("encodeWav: رأس RIFF/WAVE صحيح البنية (RIFF...WAVEfmt data)", async () => {
  const samples = new Float32Array(10).fill(0);
  const blob = encodeWav(samples, 48000);
  const bytes = await blobHeaderBytes(blob, 44);
  const asString = (start, len) => String.fromCharCode(...bytes.slice(start, start + len));
  assert.equal(asString(0, 4), "RIFF");
  assert.equal(asString(8, 4), "WAVE");
  assert.equal(asString(12, 4), "fmt ");
  assert.equal(asString(36, 4), "data");
});

test("encodeWav: معدل العيّنة والقنوات مكتوبان بشكل صحيح في رأس fmt", async () => {
  const samples = new Float32Array(5).fill(0);
  const blob = encodeWav(samples, 48000);
  const buf = await blob.arrayBuffer();
  const view = new DataView(buf);
  assert.equal(view.getUint16(20, true), 1); // PCM
  assert.equal(view.getUint16(22, true), 1); // mono
  assert.equal(view.getUint32(24, true), 48000); // sample rate
  assert.equal(view.getUint16(34, true), 16); // bits per sample
});

test("encodeWav: عيّنة 1.0 تُرمَّز لأقصى قيمة PCM موجبة (32767)", async () => {
  const samples = new Float32Array([1.0]);
  const blob = encodeWav(samples, 44100);
  const buf = await blob.arrayBuffer();
  const view = new DataView(buf);
  assert.equal(view.getInt16(44, true), 32767);
});

test("encodeWav: عيّنة -1.0 تُرمَّز لأقصى قيمة PCM سالبة (-32768)", async () => {
  const samples = new Float32Array([-1.0]);
  const blob = encodeWav(samples, 44100);
  const buf = await blob.arrayBuffer();
  const view = new DataView(buf);
  assert.equal(view.getInt16(44, true), -32768);
});

test("encodeWav: قيم خارج النطاق (-1..1) تُحدَّد (clamp) لا تفيض", async () => {
  const samples = new Float32Array([2.5, -3.7]);
  const blob = encodeWav(samples, 44100);
  const buf = await blob.arrayBuffer();
  const view = new DataView(buf);
  assert.equal(view.getInt16(44, true), 32767);
  assert.equal(view.getInt16(46, true), -32768);
});

test("concatFloat32: يدمج عدة قطع في مصفوفة واحدة متصلة بالترتيب الصحيح", () => {
  const chunks = [new Float32Array([1, 2]), new Float32Array([3]), new Float32Array([4, 5, 6])];
  const result = concatFloat32(chunks);
  assert.deepEqual(Array.from(result), [1, 2, 3, 4, 5, 6]);
});

test("concatFloat32: قائمة فارغة ترجع مصفوفة فارغة", () => {
  const result = concatFloat32([]);
  assert.equal(result.length, 0);
});

console.log(`\n${passed} ناجح، ${failed} فاشل.`);
process.exitCode = failed > 0 ? 1 : 0;
