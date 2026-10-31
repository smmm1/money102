import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const auth = await readFile(new URL("../src/CloudAuth.tsx", import.meta.url), "utf8");

test("the fresh app shell mounts only Cloudflare authentication", () => {
  assert.match(app, /import CloudAuth from ["']\.\/CloudAuth["']/);
  assert.match(app, /return\s*<CloudAuth\s*\/>/);
  assert.doesNotMatch(app, /DayTogether|Dashboard|Savings|Health|Notes/);
});

test("authentication uses the Cloudflare sign-in and session endpoints", () => {
  assert.match(auth, /\/api\/auth\/signin/);
  assert.match(auth, /\/api\/auth\/me/);
  assert.match(auth, /\/api\/auth\/logout/);
  assert.match(auth, /money102-api\.s2mtha16\.workers\.dev/);
  assert.doesNotMatch(auth, /\/api\/state|localStorage|signup/);
});
