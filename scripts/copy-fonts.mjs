// Copies the self-hosted Manrope variable fonts into /public/fonts so the
// stylesheet can reference them with stable URLs (no third-party requests).
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "node_modules", "@fontsource-variable", "manrope", "files");
const target = join(root, "public", "fonts");

const files = {
  "manrope-latin-wght-normal.woff2": "manrope-latin-variable.woff2",
  "manrope-latin-ext-wght-normal.woff2": "manrope-latin-ext-variable.woff2",
};

if (!existsSync(source)) {
  console.warn("[fonts] @fontsource-variable/manrope is not installed yet; skipping.");
  process.exit(0);
}

mkdirSync(target, { recursive: true });
for (const [from, to] of Object.entries(files)) {
  const input = join(source, from);
  if (existsSync(input)) copyFileSync(input, join(target, to));
  else console.warn(`[fonts] Missing ${from}`);
}
console.log("[fonts] Manrope copied to public/fonts");
