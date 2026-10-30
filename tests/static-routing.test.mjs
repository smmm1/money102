import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const fallback = await readFile(new URL("../public/404.html", import.meta.url), "utf8");
const app = await readFile(new URL("../src/DayTogether.tsx", import.meta.url), "utf8");

test("static-host 404 fallback preserves the requested deep link", () => {
  assert.match(fallback, /window\.location\.pathname\s*\+\s*window\.location\.search\s*\+\s*window\.location\.hash/);
  assert.match(fallback, /\/\?__route=/);
});

test("client restores a safe recovered route before rendering", () => {
  assert.match(app, /params\.get\("__route"\)/);
  assert.match(app, /recovered\.startsWith\("\/"\)/);
  assert.match(app, /!recovered\.startsWith\("\/\/"\)/);
  assert.match(app, /window\.history\.replaceState\(\{\},\s*""\s*,\s*target\.pathname\s*\+\s*target\.search\s*\+\s*target\.hash\)/);
});

test("back and forward navigation keeps the active route in sync", () => {
  assert.match(app, /window\.addEventListener\("popstate",\s*pop\)/);
  assert.match(app, /setPath\(window\.location\.pathname\)/);
});
