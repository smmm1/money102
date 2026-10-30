import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

await access("dist/index.html");
await access("dist/404.html");
const fallback = await readFile("dist/404.html", "utf8");
assert.match(fallback, /__route=/);
console.log("Static routing artifacts verified: dist/index.html and dist/404.html");
