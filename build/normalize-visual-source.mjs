#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const PAGES_ROOT = path.join(REPO_ROOT, "src", "ui", "pages");

const TARGETS = new Set([
  "01-home",
  "02-calibration",
  "04-maqamat-guide",
  "05-metronome",
  "06-library-export",
  "08-teaching-guide",
  "09-about",
]);

function normalizeCssLinks(html) {
  return html
    .replace(/<link rel="stylesheet" href="\.\.\/\.\.\/shared\/design-tokens\.css"\s*\/>/g,
      '<link rel="stylesheet" href="../../shared/design-tokens.css" />\n')
    .replace(/<link rel="stylesheet" href="\.\.\/\.\.\/shared\/digital-ney-shell\.css"\s*\/>/g,
      '<link rel="stylesheet" href="../../shared/digital-ney-shell.css" />\n');
}

function normalizeModuleImports(html) {
  const scriptRe = /<script type="module">([\s\S]*?)<\/script>/g;
  return html.replace(scriptRe, (full, body) => {
    const normalized = body
      .replace(/;\s*import\s*\{/g, ';\nimport {')
      .replace(/;\s*(mount[A-Za-z0-9_$]+\()/g, ';\n$1');
    return `<script type="module">${normalized}</script>`;
  });
}

let count = 0;
for (const dirent of readdirSync(PAGES_ROOT)) {
  if (!TARGETS.has(dirent)) continue;
  const file = path.join(PAGES_ROOT, dirent, "index.html");
  if (!statSync(file).isFile()) continue;
  let html = readFileSync(file, "utf-8");
  const before = html;
  html = normalizeCssLinks(html);
  html = normalizeModuleImports(html);
  if (html !== before) {
    writeFileSync(file, html, "utf-8");
    count += 1;
  }
}

console.log(`Normalized ${count} visual page source file(s) for legacy bundler.`);
