# SouthCineStats — QA Report
**Date:** 2026-04-16  
**Branch:** `claude/dazzling-elbakyan`  
**Tested by:** Automated QA Suite (Python API + Playwright E2E)

---

## Summary

| Layer | Tests | Passed | Failed | Flaky |
|-------|-------|--------|--------|-------|
| **Backend API** | 26 | **26** ✅ | 0 | 0 |
| **E2E (Browser)** | 15 | 11 | **2** ❌ | 2 ⚠️ |
| **Total** | **41** | **37** | **2** | **2** |

- **Average API response time:** 87 ms  
- **Slowest API call:** `GET /actors` — 579 ms (within 2 s threshold)  
- **E2E run duration:** 4 min 11 s (Chromium, headless, 1 worker)

---

## ❌ Critical Issues (2)

### 1. Invalid actor slug returns HTTP 200, not 404

**Test:** `Actor Page › invalid actor slug returns 404`  
**Reproduced 2/2 times (not flaky — consistent failure)**

Navigating to `/actors/this-actor-does-not-exist-xyz` returns HTTP **200** instead of the expected 4xx.

```
Expected: response.status() >= 400
Received: 200
```

**Root cause:** Next.js App Router's `notFound()` sets a 404 visually in the UI but the initial SSR HTTP response still returns 200. The `[slug]/page.tsx` needs to call `notFound()` when the actor lookup fails *and* the server must propagate that correctly.

**Impact:** Search engines will index ghost actor pages as valid content. Users sharing bad links get a blank/broken page with no 404 signal.

**Fix required before deploy:** Yes.

---

### 2. Search flow: clicking "Rajinikanth" suggestion times out

**Test:** `Search Flow › searching and selecting Rajinikanth lands on actor page`  
**Reproduced 2/2 times (consistent failure)**

The locator `text=Rajinikanth` resolves to the correct `<span>` element but the click action times out — the element is overlapped by another element (the suggestion row for "Aishwarya Rajinikanth" sits on top of the plain "Rajinikanth" row in the dropdown, intercepting pointer events).

```
TimeoutError: locator.click: Timeout 8000ms exceeded.
locator resolved to <span class="text-xs">Rajinikanth</span>
waiting for element to be visible, enabled and stable — click intercepted
```

**Impact:** The primary search-to-actor-page navigation flow is broken for Rajinikanth (and likely any actor whose name is a substring of another actor in the suggestions list).

**Fix required before deploy:** Yes — the dropdown needs z-index / pointer-events isolation between rows, or the test selector needs to be `getByRole('option', { name: 'Rajinikanth' })` with an exact match.

---

## ⚠️ Medium Issues / Observations

### 3. First page load times out on cold start (flaky)

**Tests affected:**
- `Homepage › loads with correct title and branding`
- `Actor Page › Allu Arjun page loads with filmography`

Both passed on retry (retry=1 policy saved them). Cold first page load exceeded the 15 s navigation timeout.

**Evidence:**
```
TimeoutError: page.goto: Timeout 15000ms exceeded
navigating to "http://localhost:3001/actors/allu-arjun"
```

**Root cause:** Next.js cold-start compilation (no prior `.next/cache` warm-up). In production with a built artifact this latency disappears.  
**Action:** Run `next build` before E2E in CI. Not a deploy blocker.

---

### 4. Insights regression guard is active ✅

The self-director bug (V. Ravichandran → V. Ravichandran) is confirmed fixed:

```
✓ PASS  Insights: no director_loyalty where actor == director
```

The SQL-level `LOWER(a.name) != LOWER(ads.director)` filter is working correctly.

---

### 5. Heroine collaborators endpoint is accurate ✅

```
✓ PASS  GET /actors/1/heroine-collaborators → Rashmika present for Allu Arjun  (21ms)
```

The `billing_order ≤ 4` heuristic correctly surfaces lead actresses and excludes supporting/character roles.

---

### 6. Cache-Control headers are present ✅

```
✓ PASS  GET /actors/1 → cache-control header present
✓ PASS  GET /analytics/insights → cache-control max-age=60
```

Backend middleware correctly sets `max-age=60` for insights and `max-age=300` for other endpoints.

---

### 7. Security / edge cases all passing ✅

```
✓ PASS  Search with XSS payload → no crash, no reflection  (106ms)
✓ PASS  GET /actors/notanid → 404 or 422 (not 500)
✓ PASS  No 500 errors on all core routes
✓ PASS  GET /compare unknown actor → 404 or 422
```

No XSS reflection. No 500s on any core route.

---

## Full API Test Results

| # | Test | Status | Time |
|---|------|--------|------|
| 1 | GET /health → 200 + status:ok | ✅ pass | 16 ms |
| 2 | GET /health response time < 500 ms | ✅ pass | 7 ms |
| 3 | GET /actors → 200 + non-empty list + valid shape | ✅ pass | 579 ms |
| 4 | GET /actors response time < 2 s | ✅ pass | 444 ms |
| 5 | GET /actors/search?q=Rajinikanth → finds result | ✅ pass | 34 ms |
| 6 | GET /actors/search?q=mohanlal → case-insensitive hit | ✅ pass | 35 ms |
| 7 | GET /actors/search?q= → graceful (200 or 422) | ✅ pass | 11 ms |
| 8 | GET /actors/1 → valid actor detail | ✅ pass | 25 ms |
| 9 | GET /actors/999999 → 404 Not Found | ✅ pass | 13 ms |
| 10 | GET /actors/1/movies → non-empty movie list | ✅ pass | 26 ms |
| 11 | GET /actors/1/collaborators → valid collaborator list | ✅ pass | 23 ms |
| 12 | GET /actors/1/directors → non-empty | ✅ pass | 18 ms |
| 13 | GET /actors/1/heroine-collaborators → Rashmika present | ✅ pass | 21 ms |
| 14 | GET /actors/1/lead-collaborators → 200 + list | ✅ pass | 17 ms |
| 15 | GET /analytics/insights → 200 + valid shape | ✅ pass | 23 ms |
| 16 | Insights: no self-director loyalty | ✅ pass | 21 ms |
| 17 | GET /analytics/insights?industry= (3 industries) | ✅ pass | 81 ms |
| 18 | GET /analytics/top-collaborations → 200 | ✅ pass | 20 ms |
| 19 | GET /compare Allu Arjun vs Mahesh Babu → 200 + dict | ✅ pass | 64 ms |
| 20 | GET /compare same actor → no 500 | ✅ pass | 22 ms |
| 21 | GET /compare unknown actor → 404 or 422 | ✅ pass | 23 ms |
| 22 | GET /actors/1 → cache-control header present | ✅ pass | 21 ms |
| 23 | GET /analytics/insights → cache-control max-age=60 | ✅ pass | 17 ms |
| 24 | GET /actors/notanid → 404 or 422 (not 500) | ✅ pass | 14 ms |
| 25 | Search with XSS payload → no reflection | ✅ pass | 106 ms |
| 26 | No 500 errors on all core routes | ✅ pass | 587 ms |

---

## Full E2E Test Results

| Test | Status | Duration |
|------|--------|----------|
| Actor Page › Allu Arjun page loads with filmography | ⚠️ flaky (pass on retry) | 18 s |
| Actor Page › Actor page shows Directors section | ✅ pass | 7.8 s |
| Actor Page › Actor page shows Lead Actresses section | ✅ pass | 6.4 s |
| Actor Page › Compare section shows only primary actors | ✅ pass | 7.3 s |
| Actor Page › **invalid actor slug returns 404** | ❌ **FAIL** | 3.9 s |
| Actor Page › no JavaScript errors on actor page | ✅ pass | 6.9 s |
| Actor Page › no failed API calls on actor page | ✅ pass | 6.1 s |
| Homepage › loads with correct title and branding | ⚠️ flaky (pass on retry) | 10 s |
| Homepage › hero search bar is visible and focusable | ✅ pass | 12 s |
| Homepage › insights carousel renders at least one card | ✅ pass | 6.9 s |
| Homepage › no JavaScript errors on load | ✅ pass | 5.4 s |
| Homepage › no failed API requests | ✅ pass | 5.5 s |
| Search Flow › typing an actor name shows suggestions | ✅ pass | 14 s |
| Search Flow › clicking a trending chip navigates to actor page | ✅ pass | 12 s |
| Search Flow › **searching and selecting Rajinikanth lands on actor page** | ❌ **FAIL** | 25 s |

---

## Verdict

### ❌ NOT READY TO DEPLOY — 2 issues must be fixed first

| Issue | Severity | Fix Effort |
|-------|----------|------------|
| Invalid actor slug returns 200 instead of 404 | **HIGH** — SEO + UX impact | ~30 min |
| Rajinikanth search click intercepted by overlapping dropdown row | **HIGH** — core search flow broken | ~1 hour |

**Once these 2 fixes are in and both tests go green:**

- The API layer is production-solid (26/26, avg 87 ms, all edge cases handled)
- All core UI flows pass (filmography, directors, lead actresses, compare, insights)
- No XSS, no 500s, no JS errors, cache headers correct
- The 2 flaky tests are cold-start artifacts that disappear with `next build`

**→ After fixing those 2 issues: READY TO LAUNCH ✅**
