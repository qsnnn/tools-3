import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the RecordCraft workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>RecordCraft - 付款记录工作台<\/title>/i);
  assert.match(html, /RecordCraft/);
  assert.match(html, /付款记录工作台/);
  assert.match(html, /SAMPLE · NOT BANK ISSUED/);
  assert.match(html, /打印 \/ 导出 PDF/);
  assert.doesNotMatch(html, /HSBC|codex-preview|react-loading-skeleton/i);
});

test("keeps the document safely branded and removes starter artifacts", async () => {
  const [page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /SAMPLE · NOT BANK ISSUED/);
  assert.match(page, /Not bank issued/i);
  assert.match(page, /image\/png,image\/jpeg,image\/webp/);
  assert.match(page, /window\.localStorage/);
  assert.match(page, /window\.print\(\)/);
  assert.doesNotMatch(page, /HSBC|BANK OF AMERICA/i);
  assert.match(layout, /RecordCraft - 付款记录工作台/);
  assert.match(layout, /openGraph/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
  await access(new URL("../public/og.png", import.meta.url));
});
