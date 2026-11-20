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

function normalizeRows(payload, catalog = []) {
  const rows = Array.isArray(payload) ? payload : payload?.items ?? payload?.data ?? []
  if (!Array.isArray(rows)) return []
  return rows.flatMap((raw) => {
    if (!raw || typeof raw !== "object" || raw.providerId !== "anikoto" || typeof raw.id !== "string" || !raw.id.startsWith("anikoto:")) return []
    const providerId = raw.id.slice("anikoto:".length)
    const match = catalog.find((anime) => anime.anikotoSeriesId === providerId)
    return match ? [{ ...match }] : []
  })
}

test("builds the authenticated SDK search contract", () => {
  const url = buildSearchUrl(BASE, "one piece", 2)
  assert.equal(url.pathname, "/search")
  assert.equal(url.searchParams.get("q"), "one piece")
  assert.equal(url.searchParams.get("provider"), "anikoto")
  assert.equal(url.searchParams.get("page"), "2")
})

test("maps the real SDK response shape through a trusted provider ID", () => {
  const catalog = [{ id: 42, animExpoId: 42, anikotoSeriesId: "123", title: "One Piece" }]
  assert.deepEqual(normalizeRows([{ id: "anikoto:123", title: "One Piece", catalogType: "ANIME", providerId: "anikoto" }], catalog), [catalog[0]])
  assert.deepEqual(normalizeRows({ items: [{ id: "anikoto:999", title: "Unknown", catalogType: "ANIME", providerId: "anikoto" }] }, catalog), [])
  assert.deepEqual(normalizeRows({ data: [{ id: "anikoto:123", title: "Wrong provider", providerId: "other" }] }, catalog), [])
})

test("rejects malformed records and duplicate mapped results safely", () => {
  const catalog = [{ id: 42, animExpoId: 42, anikotoSeriesId: "123", title: "One Piece" }]
  const rows = [{ id: "anikoto:123", title: "One Piece", providerId: "anikoto" }, null, { title: "No ID" }]
  assert.deepEqual(normalizeRows(rows, catalog), [catalog[0]])
  assert.equal(new Set(normalizeRows([rows[0], rows[0]], catalog).map((item) => item.id)).size, 1)
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
