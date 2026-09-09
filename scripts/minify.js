const { minify } = require("terser");
const CleanCSS = require("clean-css");
const fs = require("fs");
const path = require("path");

const SCRIPTS_DIR = path.join(__dirname, "..", "public", "script");
const STYLES_DIR = path.join(__dirname, "..", "public", "style");
const PUBLIC_DIR = path.join(__dirname, "..", "public");

const FILES_TO_MINIFY = [
  "main.js",
  "bot.js",
  "animations.js",
  "auth.js",
  "friends.js",
  "ranking.js",
  "landing.js",
  "translate.js",
  "cookie-consent.js",
  "info.js",
];

const CSS_TO_MINIFY = [
  "style.css",
  "landing.css",
  "animations.css",
  "cookie-consent.css",
  "info.css",
];

const HTML_FILES = [
  "index.html",
  "game.html",
  "privacy.html",
  "404.html",
  "sw.js",
];

async function run() {
  console.log("\n  Minifying scripts...\n");

  let totalOriginal = 0;
  let totalMinified = 0;

  for (const file of FILES_TO_MINIFY) {
    const inputPath = path.join(SCRIPTS_DIR, file);
    const outputPath = path.join(SCRIPTS_DIR, file.replace(".js", ".min.js"));

    if (!fs.existsSync(inputPath)) {
      console.warn(`  SKIP: ${file} not found`);
      continue;
    }

    const code = fs.readFileSync(inputPath, "utf8");
    const result = await minify(code, {
      compress: { drop_console: false, passes: 2 },
      mangle: { reserved: ["translate", "currentLanguage", "LANGUAGE_STORAGE_KEY", "database", "firebase"] },
      format: { comments: false },
    });

    if (result.error) {
      console.error(`  ERROR: ${file} - ${result.error}`);
      continue;
    }

    fs.writeFileSync(outputPath, result.code, "utf8");

    const originalSize = Buffer.byteLength(code, "utf8");
    const minifiedSize = Buffer.byteLength(result.code, "utf8");
    const savings = Math.round((1 - minifiedSize / originalSize) * 100);

    totalOriginal += originalSize;
    totalMinified += minifiedSize;

    console.log(`  ${file} -> ${file.replace(".js", ".min.js")} (${savings}% smaller)`);
  }

  const totalSavings = Math.round((1 - totalMinified / totalOriginal) * 100);
  console.log(`\n  Total JS: ${(totalOriginal / 1024).toFixed(0)}KB -> ${(totalMinified / 1024).toFixed(0)}KB (${totalSavings}% reduction)\n`);

  // Minify CSS
  console.log("  Minifying CSS...\n");
  let totalCssOriginal = 0;
  let totalCssMinified = 0;

  const cleanCss = new CleanCSS({ level: 2 });

  for (const file of CSS_TO_MINIFY) {
    const inputPath = path.join(STYLES_DIR, file);
    const outputPath = path.join(STYLES_DIR, file.replace(".css", ".min.css"));

    if (!fs.existsSync(inputPath)) {
      console.warn(`  SKIP: ${file} not found`);
      continue;
    }

    const code = fs.readFileSync(inputPath, "utf8");
    const result = cleanCss.minify(code);

    if (result.errors && result.errors.length > 0) {
      console.error(`  ERROR: ${file} - ${result.errors.join(", ")}`);
      continue;
    }

    fs.writeFileSync(outputPath, result.styles, "utf8");

    const originalSize = Buffer.byteLength(code, "utf8");
    const minifiedSize = Buffer.byteLength(result.styles, "utf8");
    const savings = Math.round((1 - minifiedSize / originalSize) * 100);

    totalCssOriginal += originalSize;
    totalCssMinified += minifiedSize;

    console.log(`  ${file} -> ${file.replace(".css", ".min.css")} (${savings}% smaller)`);
  }

  if (totalCssOriginal > 0) {
    const cssSavings = Math.round((1 - totalCssMinified / totalCssOriginal) * 100);
    console.log(`\n  Total CSS: ${(totalCssOriginal / 1024).toFixed(0)}KB -> ${(totalCssMinified / 1024).toFixed(0)}KB (${cssSavings}% reduction)\n`);
  }

  // Replace .js and .css references with .min versions in HTML files
  console.log("  Updating HTML references...\n");
  for (const htmlFile of HTML_FILES) {
    const htmlPath = path.join(PUBLIC_DIR, htmlFile);
    if (!fs.existsSync(htmlPath)) continue;

    let content = fs.readFileSync(htmlPath, "utf8");
    for (const jsFile of FILES_TO_MINIFY) {
      const regex = new RegExp(jsFile.replace(".", "\\."), "g");
      content = content.replace(regex, jsFile.replace(".js", ".min.js"));
    }
    for (const cssFile of CSS_TO_MINIFY) {
      const regex = new RegExp(cssFile.replace(".", "\\."), "g");
      content = content.replace(regex, cssFile.replace(".css", ".min.css"));
    }
    fs.writeFileSync(htmlPath, content, "utf8");
    console.log(`  ${htmlFile} updated`);
  }

  console.log("\n  Build complete!\n");
}

run().catch(console.error);
