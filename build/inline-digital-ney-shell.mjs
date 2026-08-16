#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(__dirname, "dist");
const SHELL_PATH = path.join(REPO_ROOT, "src", "ui", "shared", "digital-ney-shell.css");
const shellCss = readFileSync(SHELL_PATH, "utf-8").trim();
const shellHref = "../../shared/digital-ney-shell.css";
const linkRe = /\s*<link\s+rel=["']stylesheet["']\s+href=["']\.\.\/\.\.\/shared\/digital-ney-shell\.css["']\s*\/?>(?:\r?\n)?/g;

let inlinedCount = 0;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const abs = path.join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      walk(abs);
      continue;
    }
    if (!entry.endsWith(".html")) continue;

    let html = readFileSync(abs, "utf-8");
    if (!html.includes(shellHref)) continue;

    html = html.replace(linkRe, `\n<style data-miran-shell=\"inline\">\n${shellCss}\n</style>\n`);
    if (html.includes(shellHref)) {
      throw new Error(`فشل تضمين Digital Ney shell في ${path.relative(DIST_DIR, abs)}`);
    }
    writeFileSync(abs, html, "utf-8");
    inlinedCount += 1;
  }
}

walk(DIST_DIR);

if (inlinedCount < 6) {
  throw new Error(`عدد الصفحات التي تم تضمين القشرة فيها أقل من المتوقع: ${inlinedCount}`);
}

console.log(`Digital Ney shell inlined into ${inlinedCount} built pages.`);
