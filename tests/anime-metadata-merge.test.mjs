import test from "node:test"
import assert from "node:assert/strict"
import { mergeAnimeMetadata } from "../lib/anime-metadata-merge.ts"

const anime = (overrides = {}) => ({
  id: 42,
  title: "Existing Anime",
  poster: "https://images.example.com/existing.jpg",
  score: "8.1",
  type: "TV",
  year: 2024,
  genres: ["Drama"],
  isSub: 1,
  isDub: 0,
  ...overrides,
})

const kitsu = (overrides = {}) => ({
  kitsuId: "kitsu-42",
  alternativeTitles: [],
  genres: [],
  categories: [],
  ...overrides,
})

test("preserves valid AnimExpo fields and fills missing values from AniList", () => {
  const merged = mergeAnimeMetadata(anime(), {
    title: "Different external title",
    poster: "https://images.example.com/external.jpg",
    score: "9.2",
    description: "AniList synopsis",
    aniListId: "203275",
    genres: ["Action", "Drama"],
  }, kitsu({ description: "Kitsu synopsis" }))

  assert.equal(merged.title, "Existing Anime")
  assert.equal(merged.poster, "https://images.example.com/existing.jpg")
  assert.equal(merged.score, "8.1")
  assert.equal(merged.description, "AniList synopsis")
  assert.equal(merged.genres.join(","), "Drama")
  assert.equal(merged.aniListId, "203275")
  assert.equal(merged.metadataSources?.description, "AniList")
  assert.equal(merged.metadataSources?.score, "AnimExpo")
})

test("uses Kitsu only when AnimExpo and AniList values are unavailable or invalid", () => {
  const merged = mergeAnimeMetadata(anime({ title: "Untitled", poster: "not-an-image", score: "100", episodeCount: "0" }), {
    title: "   ",
    poster: "javascript:alert(1)",
    score: "100",
    episodeCount: "0",
    genres: [],
  }, kitsu({ title: "Kitsu Title", poster: "https://images.example.com/kitsu.jpg", score: "7.4", episodeCount: "12", description: "Kitsu summary" }))

  assert.equal(merged.title, "Kitsu Title")
  assert.equal(merged.poster, "https://images.example.com/kitsu.jpg")
  assert.equal(merged.score, "7.4")
  assert.equal(merged.episodeCount, "12")
  assert.equal(merged.description, "Kitsu summary")
  assert.equal(merged.metadataSources?.description, "Kitsu")
})

test("cleans description markup and rejects invalid dates and unsupported trailer URLs", () => {
  const merged = mergeAnimeMetadata(anime({ startDate: "2024-02-30", trailerUrl: "https://example.com/video" }), {
    description: "<p>Safe <strong>synopsis</strong></p><script>alert(1)</script>",
    startDate: "2025-13-40",
    trailerUrl: "https://example.com/video",
  }, kitsu({ startDate: "2024-02-30", trailerUrl: "https://youtu.be/short" }))

  assert.match(merged.description ?? "", /Safe\s+synopsis/)
  assert.doesNotMatch(merged.description ?? "", /<script|<strong>/i)
  assert.equal(merged.startDate, undefined)
  assert.equal(merged.trailerUrl, undefined)
})

test("preserves validated AniList video links and converts no ratings in the merge layer", () => {
  const merged = mergeAnimeMetadata(anime({ score: "0" }), {
    score: "8.6",
    ratingSource: "AniList average score",
    trailerUrl: "https://www.youtube.com/watch?v=z_aHrTag3Ig",
  }, null)

  assert.equal(merged.score, "8.6")
  assert.equal(merged.ratingSource, "AniList average score")
  assert.equal(merged.trailerUrl, "https://www.youtube.com/watch?v=z_aHrTag3Ig")
})
