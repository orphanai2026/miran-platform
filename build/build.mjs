#!/usr/bin/env node
/**
 * build.mjs
 * ============================================================
 * خطوة الدمج وقت النشر — القسم 4 من سجل القرارات: "خطوة دمج بسيطة بلا
 * مكتبات خارجية وقت النشر تنتج ملفًا واحدًا نهائيًا — الوعد الأصلي (بلا
 * خادم، بلا اعتماديات تشغيل) محفوظ للمستخدم النهائي بالكامل."
 *
 * **"بلا مكتبات خارجية" حرفيًا:** لا esbuild، لا rollup، لا أي حزمة npm —
 * فقط `fs`/`path` المدمجتان في Node. هذا الملف *هو* أداة الدمج، لا يستدعي
 * أداة دمج جاهزة.
 *
 * **تفسير "ملفًا واحدًا نهائيًا" المتَّبع هنا (مؤكَّد من المالك):** خريطة
 * الصفحات الثماني (القسم 7) قرار مُقفَل ينص على ثماني صفحات منفصلة بروابط
 * مستقلة — هذا يتعارض حرفيًا مع "ملف واحد" للمنصة كاملة كوثيقة واحدة.
 * **سُئل المالك صراحة، وأكَّد: صفحات منفصلة، لأن الصيانة والتعديلات
 * المستقبلية أسهل هكذا.** لذلك: هذا السكربت يُنتج **ملفًا نهائيًا واحدًا
 * مستقلًا لكل صفحة** من الصفحات الثماني (لا وحدات ES تحتاج خادمًا، كل شيء
 * مُضمَّن) — نفس روح "ملف واحد" التي كانت عليها مِران الأصلية (كانت هي
 * نفسها صفحة واحدة، ملف واحد)، مطبَّقة على مستوى كل صفحة من الثماني على
 * حدة، لا المنصة كاملة كملف واحد حرفي.
 *
 * **المخرجات:** `build/dist/{01-home ... 08-teaching-guide}/index.html`
 * (ثماني ملفات مستقلة تمامًا، بلا `<script type="module">`، بلا استيراد
 * وحدات — تفتح مباشرة بالنقر المزدوج عبر `file://` بلا أي خادم)، بالإضافة
 * لنسخة كاملة من `src/exercises/legacy-miran/` (بلا تعديل بنيوي، مجرد نسخ)
 * مع تعديل مسارين نسبيين فقط في صفحة #3 (إعادة التوجيه) ليطابقا عمق مجلد
 * `dist/` الجديد بدل عمق `src/ui/pages/` الأصلي.
 *
 * يُشغَّل بـ: node build/build.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, copyFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(__dirname, "dist");

const IMPORT_LINE_RE = /^\s*import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["'];\s*$/;
const EXPORT_PREFIX_RE = /^(export\s+)(const|let|var|function\s*\*?|async\s+function|class)\b/;
const TOP_LEVEL_DECL_RE = /^(?:export\s+)?(?:async\s+)?(?:const|let|var|function\s*\*?|class)\s+([A-Za-z_$][A-Za-z0-9_$]*)/;

/**
 * يحلّل ملف JS ويُرجع: أسطر الاستيراد (اسم -> مسار)، ومحتوى الملف بعد
 * إزالة أسطر الاستيراد وبادئة `export`.
 */
function parseModule(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split("\n");
  const imports = []; // { path: string }
  const outputLines = [];

  for (const line of lines) {
    const importMatch = line.match(IMPORT_LINE_RE);
    if (importMatch) {
      imports.push(importMatch[2]);
      continue; // لا نُبقي سطر الاستيراد في المخرجات — أُلحقت التبعية دمجًا قبل هذا الملف.
    }
    if (/^\s*import\s/.test(line)) {
      throw new Error(
        `صيغة استيراد غير مدعومة في ${filePath}:\n  "${line.trim()}"\n` +
          `أداة الدمج تدعم فقط "import { a, b } from \"./path.js\";" (بلا default/namespace/alias imports).`
      );
    }
    if (/^\s*export\s+default\b/.test(line)) {
      throw new Error(`"export default" غير مدعوم في أداة الدمج (${filePath}) — لم يُستخدَم في أي ملف مصدر حتى الآن.`);
    }
    outputLines.push(line.replace(EXPORT_PREFIX_RE, "$2"));
  }

  return { imports, content: outputLines.join("\n") };
}

/**
 * يبني قائمة الملفات بترتيب طوبولوجي (التبعيات أولًا) بدءًا من نقطة دخول
 * (محتوى `<script type="module">` نفسه)، يكتشف الحلقات، ويكشف تعارض أسماء
 * إعلانات المستوى الأعلى بين الملفات المدموجة معًا (شبكة أمان — القرار 4
 * لا يذكر هذا صراحة، لكن دمج بلا أداة حقيقية يحتاج تحققًا يدويًا كهذا).
 */
function resolveDependencyOrder(entryContent, entryDir) {
  const visited = new Map(); // absPath -> { content }
  const visiting = new Set();
  const order = []; // [{ path, content }]
  const declaredNames = new Map(); // name -> filePath (لكشف التعارض)

  function checkCollisions(filePath, content) {
    const re = new RegExp(TOP_LEVEL_DECL_RE, "gm");
    let m;
    while ((m = re.exec(content))) {
      const name = m[1];
      if (declaredNames.has(name) && declaredNames.get(name) !== filePath) {
        throw new Error(
          `تعارض أسماء عند الدمج: "${name}" مُعرَّف في كل من ${declaredNames.get(name)} و${filePath} ` +
            `ضمن نفس حزمة الصفحة — أداة الدمج تسلسل بلا نطاق معزول (namespacing) لكل ملف.`
        );
      }
      declaredNames.set(name, filePath);
    }
  }

  function visit(filePath) {
    if (visited.has(filePath)) return;
    if (visiting.has(filePath)) {
      throw new Error(`حلقة استيراد مكتشفة عند ${filePath} — أداة الدمج لا تدعم الاستيراد الدائري.`);
    }
    visiting.add(filePath);

    const { imports, content } = parseModule(filePath);
    const fileDir = path.dirname(filePath);
    for (const importPath of imports) {
      const resolved = path.resolve(fileDir, importPath);
      visit(resolved);
    }

    visiting.delete(filePath);
    visited.set(filePath, { content });
    checkCollisions(filePath, content);
    order.push({ path: filePath, content });
  }

  // نقطة الدخول نفسها (محتوى <script type="module"> في index.html) تُعامَل
  // كملف افتراضي بلا مسار حقيقي — نحلّل استيراداتها يدويًا هنا بدل عبر visit().
  const entryLines = entryContent.split("\n");
  const entryImports = [];
  const entryOutputLines = [];
  for (const line of entryLines) {
    const importMatch = line.match(IMPORT_LINE_RE);
    if (importMatch) {
      entryImports.push(importMatch[2]);
      continue;
    }
    entryOutputLines.push(line);
  }
  for (const importPath of entryImports) {
    const resolved = path.resolve(entryDir, importPath);
    visit(resolved);
  }

  return { order, entryContent: entryOutputLines.join("\n") };
}

/** يبني ملف HTML واحد نهائي مستقل لصفحة تحتوي `<script type="module">`. */
function buildModulePage(pageDir, pageName) {
  const indexPath = path.join(pageDir, "index.html");
  const html = readFileSync(indexPath, "utf-8");

  const scriptMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    throw new Error(`لم يُعثَر على <script type="module"> في ${indexPath} — استخدم buildStaticPage بدلًا من ذلك.`);
  }
  const entryScriptContent = scriptMatch[1];

  const { order, entryContent } = resolveDependencyOrder(entryScriptContent, pageDir);

  const bundledParts = order.map(
    ({ path: p, content }) => `    // ---- ${path.relative(REPO_ROOT, p)} ----\n${content}`
  );
  bundledParts.push(`    // ---- (نقطة الدخول: ${pageName}/index.html) ----\n${entryContent}`);

  const bundledScript = `<script>\n(function () {\n"use strict";\n${bundledParts.join("\n\n")}\n})();\n</script>`;

  const finalHtml = html.replace(/<script type="module">[\s\S]*?<\/script>/, bundledScript);

  const outDir = path.join(DIST_DIR, pageName);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "index.html"), finalHtml, "utf-8");

  return { outPath: path.join(outDir, "index.html"), sizeBytes: Buffer.byteLength(finalHtml, "utf-8"), fileCount: order.length + 1 };
}

/** ينسخ صفحة ثابتة بلا JS كما هي (صفحة #8) — لا شيء للدمج. */
function buildStaticPage(pageDir, pageName) {
  const html = readFileSync(path.join(pageDir, "index.html"), "utf-8");
  const outDir = path.join(DIST_DIR, pageName);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "index.html"), html, "utf-8");
  return { outPath: path.join(outDir, "index.html"), sizeBytes: Buffer.byteLength(html, "utf-8"), fileCount: 1 };
}

/**
 * ينسخ صفحة إعادة التوجيه (صفحة #3) مع تعديل عمق المسار النسبي فقط —
 * لا تعديل بنيوي على المحتوى المُوجَّه إليه (legacy-miran نفسها تُنسَخ
 * حرفيًا في نسخ منفصل أدناه).
 */
function buildRedirectPage(pageDir, pageName) {
  let html = readFileSync(path.join(pageDir, "index.html"), "utf-8");
  // src/ui/pages/03-exercises/ → ../../../exercises/legacy-miran/  (3 مستويات)
  // dist/03-exercises/          → ../exercises/legacy-miran/        (مستوى واحد)
  html = html.replaceAll("../../../exercises/legacy-miran/index.html", "../exercises/legacy-miran/index.html");
  const outDir = path.join(DIST_DIR, pageName);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "index.html"), html, "utf-8");
  return { outPath: path.join(outDir, "index.html"), sizeBytes: Buffer.byteLength(html, "utf-8"), fileCount: 1 };
}

/** نسخ متكرر لمجلد كامل، باستثناء مجلدات `tests` (غير مطلوبة في المخرجات النهائية). */
function copyDirRecursive(srcDir, destDir) {
  mkdirSync(destDir, { recursive: true });
  for (const entry of readdirSync(srcDir)) {
    if (entry === "tests") continue;
    const srcPath = path.join(srcDir, entry);
    const destPath = path.join(destDir, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

function main() {
  rmSync(DIST_DIR, { recursive: true, force: true });
  mkdirSync(DIST_DIR, { recursive: true });

  const pagesRoot = path.join(REPO_ROOT, "src", "ui", "pages");
  const results = [];

  const moduleDrivenPages = ["01-home", "02-calibration", "04-maqamat-guide", "05-metronome", "06-library-export", "07-settings-sync"];
  for (const pageName of moduleDrivenPages) {
    const r = buildModulePage(path.join(pagesRoot, pageName), pageName);
    results.push({ pageName, ...r });
  }

  results.push({ pageName: "03-exercises", ...buildRedirectPage(path.join(pagesRoot, "03-exercises"), "03-exercises") });
  results.push({ pageName: "08-teaching-guide", ...buildStaticPage(path.join(pagesRoot, "08-teaching-guide"), "08-teaching-guide") });

  // نسخ منهج مِران الأصلي كاملًا كما هو — لا تعديل بنيوي (ملف محمي، القسم 4).
  const legacySrc = path.join(REPO_ROOT, "src", "exercises", "legacy-miran");
  const legacyDest = path.join(DIST_DIR, "exercises", "legacy-miran");
  copyDirRecursive(legacySrc, legacyDest);

  console.log("=== نتيجة الدمج ===\n");
  for (const r of results.sort((a, b) => a.pageName.localeCompare(b.pageName))) {
    console.log(`${r.pageName}: ${r.outPath.replace(REPO_ROOT + path.sep, "")} — ${r.sizeBytes} بايت (${r.fileCount} ملف مصدر مدموج)`);
  }
  console.log(`\nexercises/legacy-miran/: نُسخ كاملًا (بلا تعديل بنيوي) إلى build/dist/exercises/legacy-miran/`);
  console.log(`\nإجمالي: ${results.length} صفحة + منهج التمارين الكامل، كل واحدة ملف مستقل بلا خادم.`);
}

main();
