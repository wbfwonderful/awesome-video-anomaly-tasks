import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import {
  getContentType,
  injectLiveReload,
  resolveStaticPath,
} from "../tools/dev-server.mjs";

const root = path.resolve(".");

test("injectLiveReload inserts the dev client before the closing body tag", () => {
  const html = "<!doctype html><html><body><main>ok</main></body></html>";
  const output = injectLiveReload(html);

  assert.match(output, /EventSource\("\/__live-reload"\)/);
  assert.match(output, /<main>ok<\/main><script>/);
  assert.match(output, /<\/script><\/body><\/html>$/);
});

test("resolveStaticPath maps directory requests to index.html", () => {
  assert.equal(resolveStaticPath("/", root), path.join(root, "index.html"));
  assert.equal(
    resolveStaticPath("/leaderboards/", root),
    path.join(root, "leaderboards", "index.html"),
  );
});

test("resolveStaticPath rejects paths outside the project root", () => {
  assert.equal(resolveStaticPath("/../package.json", root), null);
  assert.equal(resolveStaticPath("/%2e%2e/package.json", root), null);
});

test("getContentType returns useful static asset types", () => {
  assert.equal(getContentType("index.html"), "text/html; charset=utf-8");
  assert.equal(getContentType("assets/app.js"), "text/javascript; charset=utf-8");
  assert.equal(getContentType("data/results/index.yaml"), "text/yaml; charset=utf-8");
});
