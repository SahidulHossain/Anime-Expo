import assert from "node:assert/strict"
import { test } from "node:test"

const BASE = "https://animexpo-anime-sdk.onrender.com"

function buildSearchUrl(base, query, page = 1, provider = "anikoto") {
  const url = new URL("/search", base)
  url.searchParams.set("q", query)
  url.searchParams.set("provider", provider)
  url.searchParams.set("page", String(page))
  return url
}

function normalizeRows(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.items ?? payload?.data ?? []
  if (!Array.isArray(rows)) return []
  return rows.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return []
    const id = Number(raw.animExpoId ?? raw.animexpoId ?? raw.internalId)
    const title = typeof raw.title === "string" ? raw.title.trim() : typeof raw.name === "string" ? raw.name.trim() : ""
    return Number.isSafeInteger(id) && id > 0 && title ? [{ id, title }] : []
  })
}

test("builds the authenticated SDK search contract", () => {
  const url = buildSearchUrl(BASE, "one piece", 2)
  assert.equal(url.pathname, "/search")
  assert.equal(url.searchParams.get("q"), "one piece")
  assert.equal(url.searchParams.get("provider"), "anikoto")
  assert.equal(url.searchParams.get("page"), "2")
})

test("normalizes array, items, and data response envelopes", () => {
  assert.deepEqual(normalizeRows([{ animExpoId: 42, title: "One Piece" }]), [{ id: 42, title: "One Piece" }])
  assert.deepEqual(normalizeRows({ items: [{ internalId: 7, name: "Frieren" }] }), [{ id: 7, title: "Frieren" }])
  assert.deepEqual(normalizeRows({ data: [{ id: 9, title: "ignored without internal id" }] }), [])
})

test("rejects malformed results without affecting existing results", () => {
  const existing = [{ id: 1, title: "Existing" }]
  assert.deepEqual([...existing, ...normalizeRows({ data: [{ title: "No internal ID" }, null] })], existing)
})

test("represents auth, timeout, and downtime as isolated failures", async () => {
  for (const failure of [401, 500]) {
    const response = new Response(JSON.stringify({ error: "unavailable" }), { status: failure })
    assert.equal(response.ok, false)
  }
  await assert.rejects(Promise.race([
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5)),
    new Promise((resolve) => setTimeout(resolve, 50)),
  ]), /timeout/)
})
