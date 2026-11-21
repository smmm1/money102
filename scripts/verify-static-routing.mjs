import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

await access("dist/index.html");
await access("dist/404.html");
const fallback = await readFile("dist/404.html", "utf8");
assert.match(fallback, /window\.location\.replace\(["']\/["']\)/);
assert.doesNotMatch(fallback, /DayTogether|__route=/);
console.log("Money102 login-only static build verified.");
