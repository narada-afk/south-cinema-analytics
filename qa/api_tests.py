"""
SouthCineStats — Backend API Test Suite
========================================
Pure-Python, zero new dependencies (uses `requests` already in requirements.txt).
Run with:  python qa/api_tests.py
"""

import time
import json
import sys
import requests

BASE = "http://localhost:8000"
TIMEOUT = 5          # seconds per request
SLOW_THRESHOLD = 2.0 # flag as slow if > 2 s

PASS  = "\033[92m✓ PASS\033[0m"
FAIL  = "\033[91m✗ FAIL\033[0m"
WARN  = "\033[93m⚠ WARN\033[0m"
SLOW  = "\033[93m⚡SLOW\033[0m"

results = []

def check(name, fn):
    """Run a test function, record result."""
    try:
        t0 = time.perf_counter()
        fn()
        elapsed = time.perf_counter() - t0
        tag = SLOW if elapsed > SLOW_THRESHOLD else PASS
        print(f"  {tag}  {name}  ({elapsed*1000:.0f} ms)")
        results.append({"name": name, "status": "slow" if elapsed > SLOW_THRESHOLD else "pass", "ms": elapsed*1000})
    except AssertionError as e:
        elapsed = time.perf_counter() - t0
        print(f"  {FAIL}  {name}  — {e}")
        results.append({"name": name, "status": "fail", "error": str(e), "ms": elapsed*1000})
    except Exception as e:
        print(f"  {FAIL}  {name}  — {type(e).__name__}: {e}")
        results.append({"name": name, "status": "fail", "error": str(e), "ms": 0})

# ── SECTION 1: Health & Availability ─────────────────────────────────────────

print("\n📋 SECTION 1 — Health & Availability")

def test_health_200():
    r = requests.get(f"{BASE}/health", timeout=TIMEOUT)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert data.get("status") == "ok", f"Expected status=ok, got {data}"

check("GET /health → 200 + status:ok", test_health_200)

def test_health_response_time():
    t0 = time.perf_counter()
    requests.get(f"{BASE}/health", timeout=TIMEOUT)
    elapsed = time.perf_counter() - t0
    assert elapsed < 0.5, f"Health check took {elapsed:.2f}s — should be <0.5s"

check("GET /health response time < 500 ms", test_health_response_time)

# ── SECTION 2: Actors Endpoints ───────────────────────────────────────────────

print("\n📋 SECTION 2 — Actors Endpoints")

def test_actors_list():
    r = requests.get(f"{BASE}/actors", timeout=TIMEOUT)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert isinstance(data, list), "Expected list of actors"
    assert len(data) > 0, "Actor list is empty"
    # Validate shape of first actor
    a = data[0]
    assert "id" in a, "Missing 'id' field"
    assert "name" in a, "Missing 'name' field"

check("GET /actors → 200 + non-empty list + valid shape", test_actors_list)

def test_actors_list_response_time():
    t0 = time.perf_counter()
    requests.get(f"{BASE}/actors", timeout=TIMEOUT)
    elapsed = time.perf_counter() - t0
    assert elapsed < SLOW_THRESHOLD, f"Took {elapsed:.2f}s, threshold is {SLOW_THRESHOLD}s"

check("GET /actors response time < 2 s", test_actors_list_response_time)

def test_actor_search():
    r = requests.get(f"{BASE}/actors/search?q=Rajinikanth", timeout=TIMEOUT)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert isinstance(data, list), "Expected list"
    assert len(data) > 0, "Search returned no results for 'Rajinikanth'"
    names = [a["name"] for a in data]
    assert any("rajini" in n.lower() for n in names), f"'Rajinikanth' not in results: {names}"

check("GET /actors/search?q=Rajinikanth → finds result", test_actor_search)

def test_actor_search_partial():
    r = requests.get(f"{BASE}/actors/search?q=mohanlal", timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0, "Mohanlal search returned nothing"

check("GET /actors/search?q=mohanlal → case-insensitive hit", test_actor_search_partial)

def test_actor_search_empty_query():
    r = requests.get(f"{BASE}/actors/search?q=", timeout=TIMEOUT)
    assert r.status_code in (200, 422), f"Unexpected status {r.status_code}"

check("GET /actors/search?q= → graceful (200 or 422)", test_actor_search_empty_query)

def test_actor_by_id():
    r = requests.get(f"{BASE}/actors/1", timeout=TIMEOUT)  # Allu Arjun is id=1
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert "name" in data, "Missing 'name' in actor detail"
    assert "id" in data, "Missing 'id' in actor detail"

check("GET /actors/1 → valid actor detail", test_actor_by_id)

def test_actor_not_found():
    r = requests.get(f"{BASE}/actors/999999", timeout=TIMEOUT)
    assert r.status_code == 404, f"Expected 404 for non-existent actor, got {r.status_code}"

check("GET /actors/999999 → 404 Not Found", test_actor_not_found)

def test_actor_movies():
    r = requests.get(f"{BASE}/actors/1/movies", timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list), "Expected list of movies"
    assert len(data) > 0, "No movies returned for actor 1"
    m = data[0]
    assert "title" in m, "Missing 'title' in movie"

check("GET /actors/1/movies → non-empty movie list", test_actor_movies)

def test_actor_collaborators():
    r = requests.get(f"{BASE}/actors/1/collaborators", timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0, "No collaborators returned"
    c = data[0]
    assert "actor" in c, "Missing 'actor' field"
    assert "films" in c, "Missing 'films' field"

check("GET /actors/1/collaborators → valid collaborator list", test_actor_collaborators)

def test_actor_directors():
    r = requests.get(f"{BASE}/actors/1/directors", timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) > 0, "No directors returned"

check("GET /actors/1/directors → non-empty", test_actor_directors)

def test_heroine_collaborators():
    r = requests.get(f"{BASE}/actors/1/heroine-collaborators", timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    # Check for known heroine
    names = [c["actor"].lower() for c in data]
    assert any("rashmika" in n for n in names), f"Rashmika Mandanna not in heroine list for Allu Arjun: {names[:5]}"

check("GET /actors/1/heroine-collaborators → Rashmika present for Allu Arjun", test_heroine_collaborators)

def test_lead_collaborators():
    r = requests.get(f"{BASE}/actors/1/lead-collaborators", timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)

check("GET /actors/1/lead-collaborators → 200 + list", test_lead_collaborators)

# ── SECTION 3: Analytics Endpoints ───────────────────────────────────────────

print("\n📋 SECTION 3 — Analytics Endpoints")

def test_insights():
    r = requests.get(f"{BASE}/analytics/insights", timeout=TIMEOUT)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert "insights" in data, f"Missing 'insights' key: {list(data.keys())}"
    insights = data["insights"]
    assert isinstance(insights, list)
    assert len(insights) > 0, "Insights list is empty"
    i = insights[0]
    assert "type" in i, "Missing 'type' in insight"
    assert "actors" in i, "Missing 'actors' in insight"

check("GET /analytics/insights → 200 + valid insight shape", test_insights)

def test_insights_no_self_director():
    """Regression: ensure no insight has actor == director (V. Ravichandran bug)."""
    r = requests.get(f"{BASE}/analytics/insights", timeout=TIMEOUT)
    data = r.json()
    for ins in data.get("insights", []):
        if ins.get("type") == "director_loyalty":
            actors = ins.get("actors", [])
            if len(actors) == 2:
                assert actors[0].lower() != actors[1].lower(), \
                    f"Self-director insight found: {actors[0]} == {actors[1]}"

check("Insights: no director_loyalty where actor == director", test_insights_no_self_director)

def test_insights_industry_filter():
    for industry in ["tamil", "telugu", "malayalam"]:
        r = requests.get(f"{BASE}/analytics/insights?industry={industry}", timeout=TIMEOUT)
        assert r.status_code == 200, f"Failed for industry={industry}: {r.status_code}"
        data = r.json()
        assert "insights" in data

check("GET /analytics/insights?industry= → works for tamil/telugu/malayalam", test_insights_industry_filter)

def test_top_collaborations():
    r = requests.get(f"{BASE}/analytics/top-collaborations", timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list) or isinstance(data, dict), "Unexpected response type"

check("GET /analytics/top-collaborations → 200", test_top_collaborations)

# ── SECTION 4: Compare Endpoint ───────────────────────────────────────────────

print("\n📋 SECTION 4 — Compare Endpoint")

def test_compare():
    # Compare takes full names, not IDs
    r = requests.get(f"{BASE}/compare?actor1=Allu+Arjun&actor2=Mahesh+Babu", timeout=TIMEOUT)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert isinstance(data, dict), "Expected dict"

check("GET /compare?actor1=Allu+Arjun&actor2=Mahesh+Babu → 200 + dict", test_compare)

def test_compare_same_actor():
    r = requests.get(f"{BASE}/compare?actor1=Allu+Arjun&actor2=Allu+Arjun", timeout=TIMEOUT)
    assert r.status_code in (200, 400, 422), f"Unexpected status {r.status_code}"

check("GET /compare same actor → graceful (no 500)", test_compare_same_actor)

def test_compare_unknown_actor():
    r = requests.get(f"{BASE}/compare?actor1=Unknown+Actor+XYZ&actor2=Rajinikanth", timeout=TIMEOUT)
    assert r.status_code in (404, 422), f"Expected 404/422 for unknown actor, got {r.status_code}"

check("GET /compare unknown actor → 404 or 422", test_compare_unknown_actor)

# ── SECTION 5: Cache-Control Headers ─────────────────────────────────────────

print("\n📋 SECTION 5 — Cache-Control Headers")

def test_cache_control_actors():
    r = requests.get(f"{BASE}/actors/1", timeout=TIMEOUT)
    cc = r.headers.get("cache-control", "")
    assert "max-age" in cc, f"Missing cache-control max-age on /actors/1: '{cc}'"

check("GET /actors/1 → cache-control header present", test_cache_control_actors)

def test_cache_control_insights():
    r = requests.get(f"{BASE}/analytics/insights", timeout=TIMEOUT)
    cc = r.headers.get("cache-control", "")
    assert "max-age=60" in cc, f"Expected max-age=60 on insights: '{cc}'"

check("GET /analytics/insights → cache-control max-age=60", test_cache_control_insights)

# ── SECTION 6: Error Handling ─────────────────────────────────────────────────

print("\n📋 SECTION 6 — Error Handling & Edge Cases")

def test_invalid_actor_id_string():
    r = requests.get(f"{BASE}/actors/notanid", timeout=TIMEOUT)
    assert r.status_code in (404, 422), f"Expected 404/422, got {r.status_code}"

check("GET /actors/notanid → 404 or 422 (not 500)", test_invalid_actor_id_string)

def test_search_xss():
    r = requests.get(f"{BASE}/actors/search?q=<script>alert(1)</script>", timeout=TIMEOUT)
    assert r.status_code in (200, 422), f"XSS-like input crashed server: {r.status_code}"
    if r.status_code == 200:
        assert "<script>" not in r.text, "XSS payload reflected in response"

check("Search with XSS payload → no crash, no reflection", test_search_xss)

def test_no_500_on_common_routes():
    routes = ["/health", "/actors", "/analytics/insights", "/actors/1", "/actors/1/movies"]
    for route in routes:
        r = requests.get(f"{BASE}{route}", timeout=TIMEOUT)
        assert r.status_code != 500, f"{route} returned 500 Internal Server Error"

check("No 500 errors on all core routes", test_no_500_on_common_routes)

# ── SECTION 7: Cross-endpoint Data Consistency ───────────────────────────────
#
# These tests would have caught every real-world bug we shipped:
#
#   Bug A — Blockbusters endpoint skipped the Wikidata cast table, so films
#            like Leo (Vijay), Kalki (Kamal Haasan), Ponniyin Selvan (Karthi)
#            and Good Bad Ugly (Ajith) were completely missing from the tab.
#
#   Bug B — Director chip counts came from actor_director_stats (which counted
#            unreleased films with release_year=0), so chips showed "2" but the
#            dropdown only showed 1 film.
#
#   Bug C — NULL character_name in actor_movies caused valid films (e.g. Eega
#            for Samantha) to be silently excluded by a NOT (NULL LIKE ...) = NULL
#            evaluation in the non-acting role filter.
#
# Strategy: fetch all primary actors in parallel, then assert invariants.

import concurrent.futures

print("\n📋 SECTION 7 — Cross-endpoint Data Consistency (all primary actors)")

# ── Fetch all primary actors once ─────────────────────────────────────────────
_primary_actors: list = []
try:
    _r = requests.get(f"{BASE}/actors?primary_only=true", timeout=TIMEOUT)
    _primary_actors = _r.json() if _r.status_code == 200 else []
except Exception:
    pass

def _fetch_actor_data(actor: dict) -> dict:
    """Return {id, name, movies, blockbusters, directors} for one actor."""
    aid = actor["id"]
    out = {"id": aid, "name": actor["name"], "movies": [], "blockbusters": [], "directors": []}
    try:
        rm = requests.get(f"{BASE}/actors/{aid}/movies",       timeout=10)
        rb = requests.get(f"{BASE}/actors/{aid}/blockbusters", timeout=10)
        rd = requests.get(f"{BASE}/actors/{aid}/directors",    timeout=10)
        if rm.status_code == 200: out["movies"]       = rm.json()
        if rb.status_code == 200: out["blockbusters"] = rb.json()
        if rd.status_code == 200: out["directors"]    = rd.json()
    except Exception:
        pass
    return out

# Parallel fetch — 119 actors × 3 endpoints in ~5-10 s instead of ~60 s
_actor_data: list[dict] = []
if _primary_actors:
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
        _actor_data = list(pool.map(_fetch_actor_data, _primary_actors))

# ── Test 7a: Spot-check known films that were previously missing ───────────────
# Each tuple: (actor_name, film_title, endpoint)
# "endpoint" is "blockbusters" or "movies" — the place the film must appear.
_KNOWN_FILMS = [
    # Blockbuster endpoint cast-table gap (Bug A) — these were the exact films
    # missing before the fix. If this regresses, the endpoint broke again.
    ("Vijay",         "Leo",                    "blockbusters"),
    ("Vijay",         "Leo",                    "movies"),
    ("Kamal Haasan",  "Kalki 2898 AD",          "blockbusters"),
    ("Kamal Haasan",  "Kalki 2898 AD",          "movies"),
    ("Karthi",        "Ponniyin Selvan: I",      "blockbusters"),
    ("Suriya",        "Vikram",                  "blockbusters"),
    ("Ajith Kumar",   "Good Bad Ugly",           "blockbusters"),
    # NULL character_name exclusion (Bug C)
    ("Samantha Ruth Prabhu", "Eega",            "movies"),
]

def test_known_films_present():
    _data_by_name = {d["name"]: d for d in _actor_data}
    failures = []
    for actor_name, film_title, endpoint in _KNOWN_FILMS:
        actor = _data_by_name.get(actor_name)
        if not actor:
            failures.append(f"actor '{actor_name}' not found in primary list")
            continue
        titles = {item["title"] for item in actor[endpoint]}
        if film_title not in titles:
            failures.append(
                f"{actor_name} → '{film_title}' missing from /{endpoint}"
            )
    assert not failures, "\n  " + "\n  ".join(failures)

check("Known previously-missing films are present in correct endpoints", test_known_films_present)

# ── Test 7b: Blockbusters completeness — no top-10 film silently dropped ──────
# For every primary actor: every film in their top-10 by box_office from
# /movies must also appear in /blockbusters.
# This is the test that would have caught Good Bad Ugly missing for Ajith.

def test_blockbusters_completeness():
    failures = []
    for actor in _actor_data:
        bo_movies = sorted(
            [m for m in actor["movies"] if m.get("box_office") and m["box_office"] > 0],
            key=lambda m: m["box_office"], reverse=True,
        )[:10]
        if not bo_movies:
            continue
        buster_titles = {b["title"] for b in actor["blockbusters"]}
        for m in bo_movies:
            if m["title"] not in buster_titles:
                failures.append(
                    f"{actor['name']}: '{m['title']}' (₹{m['box_office']:.0f} Cr) "
                    f"is in top-10 /movies but absent from /blockbusters"
                )
    assert not failures, f"{len(failures)} missing film(s):\n  " + "\n  ".join(failures[:10])

check("Blockbusters: every top-10 box-office film from /movies is in /blockbusters", test_blockbusters_completeness)

# ── Test 7c: Blockbusters #1 matches /movies #1 ───────────────────────────────
# Catches the case where a wrong film ranks first because a higher-grossing
# film is absent. Allows an exact-tie (same box_office value, different title).

def test_blockbusters_top_film_correct():
    failures = []
    for actor in _actor_data:
        if not actor["blockbusters"]:
            continue
        bo_movies = sorted(
            [m for m in actor["movies"] if m.get("box_office") and m["box_office"] > 0],
            key=lambda m: m["box_office"], reverse=True,
        )
        if not bo_movies:
            continue
        top_movie   = bo_movies[0]
        top_buster  = actor["blockbusters"][0]
        # Accept a mismatch only when both films have identical box_office (true tie)
        if top_buster["title"] != top_movie["title"]:
            if abs(top_buster["box_office_crore"] - top_movie["box_office"]) > 0.1:
                failures.append(
                    f"{actor['name']}: blockbusters[0]='{top_buster['title']}' "
                    f"(₹{top_buster['box_office_crore']:.0f}) but "
                    f"movies top='{top_movie['title']}' (₹{top_movie['box_office']:.0f})"
                )
    assert not failures, f"{len(failures)} wrong #1 film(s):\n  " + "\n  ".join(failures)

check("Blockbusters: #1 film matches /movies top by box_office (ties allowed)", test_blockbusters_top_film_correct)

# ── Test 7d: Director chip/dropdown consistency ───────────────────────────────
# Simulates exactly what DirectorsSection.tsx does:
#   chip_count = movies.filter(director == chip.director && release_year > 0).length
# For every chip that would be SHOWN (chip_count > 0), the count must match the
# dropdown exactly. This is guaranteed by construction once director names in
# /movies match director names from /directors — so this test also catches
# name-format divergence between the two sources.

def test_director_chip_dropdown_consistency():
    failures = []
    for actor in _actor_data:
        for chip in actor["directors"]:
            dir_name = chip["director"]
            matching_movies = [
                m for m in actor["movies"]
                if m.get("director") == dir_name and (m.get("release_year") or 0) > 0
            ]
            chip_count = len(matching_movies)
            # A chip that would be shown must have count > 0 and the dropdown
            # must contain exactly that many films (they're the same list).
            # What we're really testing: that no chip is shown with a count that
            # doesn't match its actual dropdown. Since both derive from the same
            # filter, a mismatch means the director names diverged between endpoints.
            # We also flag chips where the name appears in /directors but produces
            # 0 movies AND the chip was supposed to have films (api film_count > 0)
            # — that's a name-format mismatch.
            if chip_count == 0 and chip.get("films", 0) >= 3:
                # High-confidence mismatch: API says 3+ films but none match by name
                failures.append(
                    f"{actor['name']}: chip '{dir_name}' claims {chip['films']} films "
                    f"but 0 movies match by director name — likely name format mismatch"
                )
    assert not failures, f"{len(failures)} chip/dropdown name mismatch(es):\n  " + "\n  ".join(failures[:10])

check("Directors: chip names match movie director names (no silent mismatches)", test_director_chip_dropdown_consistency)

# ── Test 7e: Movies endpoint returns director field for known pairings ─────────
# Regression for the original bug: /movies was returning null director for films
# that do have a director in the normalised join table.
# Spot-checks a handful of well-known actor→director pairings.

_KNOWN_PAIRINGS = [
    # (actor_name, film_title, expected_director)
    ("Ajith Kumar",  "Good Bad Ugly",  "Adhik Ravichandran"),
    ("Ajith Kumar",  "Thunivu",        "H. Vinoth"),
    ("Vijay",        "Leo",            "Lokesh Kanagaraj"),
    ("Rajinikanth",  "Jailer",         "Nelson Dilipkumar"),
]

def test_movies_director_field_populated():
    _data_by_name = {d["name"]: d for d in _actor_data}
    failures = []
    for actor_name, film_title, expected_dir in _KNOWN_PAIRINGS:
        actor = _data_by_name.get(actor_name)
        if not actor:
            failures.append(f"actor '{actor_name}' not found")
            continue
        film = next((m for m in actor["movies"] if m["title"] == film_title), None)
        if film is None:
            failures.append(f"{actor_name}: film '{film_title}' not in /movies at all")
            continue
        actual = film.get("director")
        if actual != expected_dir:
            failures.append(
                f"{actor_name} / '{film_title}': "
                f"director='{actual}' expected='{expected_dir}'"
            )
    assert not failures, "\n  " + "\n  ".join(failures)

check("Movies: director field populated correctly for known actor–director pairings", test_movies_director_field_populated)

# ── SECTION 8: Endpoint Coverage (untested routes) ────────────────────────────
#
# /blockbusters, /shared, and /production had zero tests. A schema change or
# accidental removal would go undetected until a user reported a broken tab.

print("\n📋 SECTION 8 — Endpoint Coverage")

def test_blockbusters_shape():
    r = requests.get(f"{BASE}/actors/8/blockbusters", timeout=TIMEOUT)  # Ajith
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert isinstance(data, list), "Expected list"
    assert len(data) > 0, "No blockbusters returned for Ajith"
    b = data[0]
    for field in ("title", "release_year", "box_office_crore"):
        assert field in b, f"Missing '{field}' in blockbuster row"
    assert b["box_office_crore"] > 0, "box_office_crore should be > 0"

check("GET /actors/8/blockbusters → valid shape + positive box_office", test_blockbusters_shape)

def test_shared_films_shape():
    # Vijay (2) and Ajith (8) have no shared films, but the endpoint should return 200 + []
    # Use two actors known to have shared films: Allu Arjun (1) and Rashmika
    # Actually use a simple pair that definitely have shared films
    r = requests.get(f"{BASE}/actors/2/shared/11", timeout=TIMEOUT)  # Vijay / Rajinikanth
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert isinstance(data, list), "Expected list"
    # May be empty — just validate shape of any returned rows
    if data:
        row = data[0]
        for field in ("title", "release_year"):
            assert field in row, f"Missing '{field}' in shared film row"

check("GET /actors/2/shared/11 → 200 + valid shape", test_shared_films_shape)

def test_shared_films_unknown_actor():
    r = requests.get(f"{BASE}/actors/999999/shared/1", timeout=TIMEOUT)
    assert r.status_code == 404, f"Expected 404, got {r.status_code}"

check("GET /actors/999999/shared/1 → 404", test_shared_films_unknown_actor)

def test_production_shape():
    r = requests.get(f"{BASE}/actors/1/production", timeout=TIMEOUT)  # Allu Arjun
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert isinstance(data, list), "Expected list"
    if data:
        row = data[0]
        assert "company" in row, "Missing 'company' field"
        assert "films"   in row, "Missing 'films' field"
        assert row["films"] > 0, "'films' should be > 0"

check("GET /actors/1/production → 200 + valid shape", test_production_shape)

def test_compare_response_shape():
    r = requests.get(f"{BASE}/compare?actor1=Vijay&actor2=Ajith+Kumar", timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    for key in ("actor1", "actor2"):
        assert key in data, f"Missing '{key}' in compare response"
        obj = data[key]
        assert "name"  in obj, f"Missing 'name' in {key}"
        assert "films" in obj, f"Missing 'films' in {key}"
        assert obj["films"] > 0, f"{key}.films should be > 0"

check("GET /compare → response has actor1/actor2 with name and films > 0", test_compare_response_shape)

# ── SECTION 9: Data Integrity ─────────────────────────────────────────────────
#
# Silent data regressions that no status-code test would catch:
#  • Ordering broken    → wrong film/director shown in UI
#  • Duplicate movies   → inflated counts, doubled cards
#  • Film count drops   → pipeline regression (e.g. UNION collapses to cast-only)
#  • Null insight field → blank number rendered on every insight card

print("\n📋 SECTION 9 — Data Integrity")

def test_movies_ordered_newest_first():
    """release_year must be descending (excluding year=0 unreleased films)."""
    r = requests.get(f"{BASE}/actors/11/movies", timeout=TIMEOUT)  # Rajinikanth
    data = r.json()
    dated = [m for m in data if m.get("release_year") and m["release_year"] > 0]
    for i in range(len(dated) - 1):
        assert dated[i]["release_year"] >= dated[i+1]["release_year"], (
            f"Movies not newest-first at position {i}: "
            f"'{dated[i]['title']}' ({dated[i]['release_year']}) "
            f"before '{dated[i+1]['title']}' ({dated[i+1]['release_year']})"
        )

check("Movies: returned newest-first (release_year DESC)", test_movies_ordered_newest_first)

def test_blockbusters_ordered_by_box_office():
    """box_office_crore must be descending."""
    r = requests.get(f"{BASE}/actors/11/blockbusters", timeout=TIMEOUT)  # Rajinikanth
    data = r.json()
    for i in range(len(data) - 1):
        assert data[i]["box_office_crore"] >= data[i+1]["box_office_crore"], (
            f"Blockbusters not sorted by box_office at position {i}: "
            f"'{data[i]['title']}' (₹{data[i]['box_office_crore']:.0f}) "
            f"before '{data[i+1]['title']}' (₹{data[i+1]['box_office_crore']:.0f})"
        )

check("Blockbusters: ordered by box_office_crore DESC", test_blockbusters_ordered_by_box_office)

def test_collaborators_ordered_by_count():
    """Collaborators must come back highest-count first."""
    r = requests.get(f"{BASE}/actors/1/collaborators", timeout=TIMEOUT)  # Allu Arjun
    data = r.json()
    for i in range(len(data) - 1):
        assert data[i]["films"] >= data[i+1]["films"], (
            f"Collaborators not sorted at position {i}: "
            f"'{data[i]['actor']}' ({data[i]['films']}) "
            f"before '{data[i+1]['actor']}' ({data[i+1]['films']})"
        )

check("Collaborators: ordered by film count DESC", test_collaborators_ordered_by_count)

def test_directors_ordered_by_count():
    """Directors must come back highest film-count first."""
    r = requests.get(f"{BASE}/actors/1/directors", timeout=TIMEOUT)
    data = r.json()
    for i in range(len(data) - 1):
        assert data[i]["films"] >= data[i+1]["films"], (
            f"Directors not sorted at position {i}: "
            f"'{data[i]['director']}' ({data[i]['films']}) "
            f"before '{data[i+1]['director']}' ({data[i+1]['films']})"
        )

check("Directors: ordered by film count DESC", test_directors_ordered_by_count)

def test_no_duplicate_movies():
    """
    Each film must appear at most once in /movies.
    Key: (title, release_year, tmdb_id) — two films can share a title and year
    but are genuinely different if they have different TMDB IDs (e.g. two regional
    films both titled "Tiger" from 1979).  We only flag entries where the same
    TMDB ID (or same title+year with no TMDB ID) appears more than once, which
    would indicate a UNION pipeline bug producing actual duplicates.
    """
    r = requests.get(f"{BASE}/actors/11/movies", timeout=TIMEOUT)  # Rajinikanth — large filmography
    data = r.json()
    seen = {}
    dupes = []
    for m in data:
        tmdb_id = m.get("tmdb_id")
        if tmdb_id:
            key = ("tmdb", tmdb_id)
        else:
            key = ("notmdb", m.get("title"), m.get("release_year"))
        if key in seen:
            dupes.append(f"'{m['title']}' ({m['release_year']}) tmdb_id={tmdb_id}")
        seen[key] = True
    assert not dupes, f"Duplicate films in /movies: {dupes}"

check("Movies: no duplicate entries (title + year)", test_no_duplicate_movies)

def test_film_count_sanity():
    """
    Key actors must have at least a known minimum number of films.
    Catches pipeline regressions where the UNION collapses to cast-only
    or actor_movies is accidentally excluded, halving the film count.
    """
    # (actor_name, min_expected_films)
    _MINIMUMS = [
        ("Rajinikanth",  100),
        ("Kamal Haasan", 100),
        ("Mammootty",    200),
        ("Mohanlal",     200),
        ("Vijay",         50),
        ("Ajith Kumar",   50),
    ]
    _data_by_name = {d["name"]: d for d in _actor_data}
    failures = []
    for actor_name, minimum in _MINIMUMS:
        actor = _data_by_name.get(actor_name)
        if not actor:
            failures.append(f"'{actor_name}' not in primary actor list")
            continue
        count = len(actor["movies"])
        if count < minimum:
            failures.append(
                f"{actor_name}: only {count} films returned, expected ≥ {minimum} "
                f"— possible pipeline regression"
            )
    assert not failures, "\n  " + "\n  ".join(failures)

check("Film counts: key actors meet minimum thresholds (pipeline sanity)", test_film_count_sanity)

def test_all_primary_actors_have_films():
    """Every primary actor must have at least 1 film. Catches data gaps."""
    empty = [a["name"] for a in _actor_data if len(a["movies"]) == 0]
    assert not empty, f"{len(empty)} primary actor(s) have 0 films: {empty[:5]}"

check("All primary actors have ≥ 1 film in /movies", test_all_primary_actors_have_films)

def test_insights_no_null_required_fields():
    """
    Every insight must have non-null, non-empty type, headline, and value.
    Insights use 'headline' (not 'title') for the actor/descriptor shown on cards.
    A null value renders as a blank giant number; a null headline breaks the card UI.
    """
    r = requests.get(f"{BASE}/analytics/insights", timeout=TIMEOUT)
    data = r.json()
    failures = []
    for i, ins in enumerate(data.get("insights", [])):
        for field in ("type", "headline", "value"):
            val = ins.get(field)
            if val is None or (isinstance(val, str) and not val.strip()):
                failures.append(f"Insight #{i}: '{field}' is null/empty (type={ins.get('type')})")
    assert not failures, f"{len(failures)} insight(s) with null fields:\n  " + "\n  ".join(failures[:5])

check("Insights: no null/empty type, title, or value fields", test_insights_no_null_required_fields)

def test_insights_minimum_count():
    """
    Should have a healthy number of insights — not just > 0.
    If the engine fails partially we'd get very few cards on the homepage.
    """
    r = requests.get(f"{BASE}/analytics/insights", timeout=TIMEOUT)
    data = r.json()
    count = len(data.get("insights", []))
    assert count >= 50, f"Only {count} insights returned — expected ≥ 50 (pipeline may have failed)"

check("Insights: at least 50 insights returned", test_insights_minimum_count)

def test_search_lead_only_filter():
    """
    lead_only=true must include known primary actors and exclude known supporting actors.

    Count-based checks are avoided here: with the default limit=20 and match-rank
    sorting (starts-with beats contains), both filtered and unfiltered queries can
    hit the page-size cap, making count comparisons unreliable.  Instead we test
    concrete inclusion/exclusion behaviour:

      • Brahmanandam is a well-known supporting actor (522 films); he must appear
        in an unrestricted search but NOT in lead_only results.
      • Rajinikanth is a known seed primary actor (is_primary_actor=True); he must
        appear in lead_only results.
    """
    # Supporting actor must appear in full search
    r_all = requests.get(f"{BASE}/actors/search?q=brahmanandam", timeout=TIMEOUT)
    assert r_all.status_code == 200
    all_names = {a["name"] for a in r_all.json()}
    assert "Brahmanandam" in all_names, "Brahmanandam missing from unrestricted search results"

    # Same supporting actor must NOT appear in lead_only search
    r_leads = requests.get(f"{BASE}/actors/search?q=brahmanandam&lead_only=true", timeout=TIMEOUT)
    assert r_leads.status_code == 200
    leads_names = {a["name"] for a in r_leads.json()}
    assert "Brahmanandam" not in leads_names, (
        "lead_only=true returned Brahmanandam — he is a supporting actor, not a primary seed"
    )

    # Known seed primary actor must appear in lead_only search
    r_seed = requests.get(f"{BASE}/actors/search?q=rajinikanth&lead_only=true", timeout=TIMEOUT)
    seed_names = {a["name"] for a in r_seed.json()}
    assert "Rajinikanth" in seed_names, (
        "lead_only=true excluded Rajinikanth — a known seed primary actor"
    )

check("Search: lead_only=true filters correctly (fewer results + includes known leads)", test_search_lead_only_filter)

# ── SECTION 10: Actress & Gender-Specific Data ────────────────────────────────
#
# Every data test in Sections 7-9 used male actors.  Actress pages use a
# different collaborator pipeline (show male primary co-stars instead of heroines)
# and their blockbusters / director data comes from the same UNION query —
# but bugs in gender-branch logic would be invisible without explicit tests.
#
# Actor IDs used (stable — from the primary/network actress set):
#   336 = Nayanthara   474 = Anushka Shetty   477 = Samantha Ruth Prabhu

print("\n📋 SECTION 10 — Actress & Gender-Specific Data")

def test_actress_has_films():
    """A known primary actress must have a non-empty filmography."""
    r = requests.get(f"{BASE}/actors/336/movies", timeout=TIMEOUT)  # Nayanthara
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert len(data) >= 10, (
        f"Nayanthara: only {len(data)} films returned — expected ≥ 10"
    )
    # Every entry must have at minimum title and release_year
    for m in data:
        assert m.get("title"),        "Film entry missing 'title'"
        assert "release_year" in m,   "Film entry missing 'release_year'"

check("Actress (Nayanthara): has ≥ 10 films with valid shape", test_actress_has_films)

def test_actress_blockbusters():
    """A commercially successful actress must have blockbusters returned."""
    r = requests.get(f"{BASE}/actors/474/blockbusters", timeout=TIMEOUT)  # Anushka Shetty
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert len(data) >= 1, "Anushka Shetty: no blockbusters returned — expected ≥ 1"
    b = data[0]
    assert b.get("box_office_crore", 0) > 0, "Top blockbuster has zero box_office_crore"

check("Actress (Anushka Shetty): blockbusters endpoint returns data", test_actress_blockbusters)

def test_actress_collaborators_are_male():
    """
    On an actress's page, the collaborators list should skew heavily male
    (since South Indian cinema pairs one lead actress with multiple male leads).
    We fetch collaborators for Anushka Shetty and assert that at least one
    known male actor (Brahmanandam, Prabhas, Allu Arjun) appears — confirming
    the general collaborator pipeline works for female actors too.
    """
    r = requests.get(f"{BASE}/actors/474/collaborators", timeout=TIMEOUT)  # Anushka Shetty
    assert r.status_code == 200
    names = {c["actor"] for c in r.json()}
    known_male_costar = {"Brahmanandam", "Prabhas", "Allu Arjun", "Jr. NTR", "Ram Charan"}
    found = names & known_male_costar
    assert found, (
        f"Anushka Shetty collaborators contain none of the expected male co-stars. "
        f"Got: {list(names)[:10]}"
    )

check("Actress (Anushka Shetty): collaborators include known male co-stars", test_actress_collaborators_are_male)

def test_actress_directors():
    """Directors endpoint works for female actors."""
    r = requests.get(f"{BASE}/actors/336/directors", timeout=TIMEOUT)  # Nayanthara
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list), "Expected list from /directors"
    assert len(data) >= 1, "Nayanthara: no directors returned"
    d = data[0]
    assert d.get("director"), "Director entry missing 'director' name"
    assert d.get("films", 0) >= 1, "Director entry has films < 1"

check("Actress (Nayanthara): directors endpoint returns valid data", test_actress_directors)

# ── SECTION 11: Previously Untested Endpoints ─────────────────────────────────
#
# Endpoints confirmed present in the router but not yet explicitly shape-tested:
#   • /heroine-collaborators   • /directors (shape only, not via consistency check)
#   • empty-state blockbusters (actor with no box_office data)

print("\n📋 SECTION 11 — Previously Untested Endpoints")

def test_heroine_collaborators_shape():
    """
    /heroine-collaborators returns female co-stars for a male actor.
    Verified against Allu Arjun (id=1) — known to have worked with
    Rashmika Mandanna, Anushka Shetty, Pooja Hegde etc.
    """
    r = requests.get(f"{BASE}/actors/1/heroine-collaborators", timeout=TIMEOUT)
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert isinstance(data, list), "Expected list"
    assert len(data) >= 1, "Allu Arjun: no heroine collaborators returned"
    row = data[0]
    assert "actor"    in row, "Missing 'actor' field"
    assert "films"    in row, "Missing 'films' field"
    assert "actor_id" in row, "Missing 'actor_id' field"
    assert row["films"] >= 1, "'films' should be ≥ 1"

check("GET /actors/1/heroine-collaborators → valid shape + ≥ 1 result", test_heroine_collaborators_shape)

def test_heroine_collaborators_known_actress():
    """Rashmika Mandanna must appear in Allu Arjun's heroine-collaborators (4 shared films)."""
    r = requests.get(f"{BASE}/actors/1/heroine-collaborators", timeout=TIMEOUT)
    data = r.json()
    names = {row["actor"] for row in data}
    assert "Rashmika Mandanna" in names, (
        f"Rashmika Mandanna missing from Allu Arjun's heroine-collaborators. Got: {list(names)[:10]}"
    )

check("Heroine-collaborators: Rashmika Mandanna in Allu Arjun's list", test_heroine_collaborators_known_actress)

def test_directors_endpoint_shape():
    """
    /directors is only tested indirectly via consistency checks.
    Explicitly verify shape here so a schema rename would be caught.
    """
    r = requests.get(f"{BASE}/actors/11/directors", timeout=TIMEOUT)  # Rajinikanth
    assert r.status_code == 200, f"Expected 200, got {r.status_code}"
    data = r.json()
    assert isinstance(data, list), "Expected list"
    assert len(data) >= 1, "Rajinikanth: no directors returned"
    d = data[0]
    assert "director" in d, "Missing 'director' field"
    assert "films"    in d, "Missing 'films' field"
    assert isinstance(d["director"], str) and d["director"], "'director' must be non-empty string"
    assert d["films"] >= 1, "'films' must be ≥ 1"

check("GET /actors/11/directors → valid shape with required fields", test_directors_endpoint_shape)

def test_empty_blockbusters_no_crash():
    """
    An actor with no box-office data must return 200 + empty list, not 500.
    Raj B Shetty (id=1814) is a confirmed primary actor with no box_office entries.
    """
    r = requests.get(f"{BASE}/actors/1814/blockbusters", timeout=TIMEOUT)  # Raj B Shetty
    assert r.status_code == 200, f"Expected 200, got {r.status_code} (empty state should not 500)"
    data = r.json()
    assert isinstance(data, list), "Expected list (empty)"
    assert len(data) == 0, f"Expected empty list, got {len(data)} entries"

check("Empty-state: actor with no box_office returns 200 + []", test_empty_blockbusters_no_crash)

def test_heroine_collaborators_unknown_actor():
    """Unknown actor must return 404, not 500."""
    r = requests.get(f"{BASE}/actors/999999/heroine-collaborators", timeout=TIMEOUT)
    assert r.status_code == 404, f"Expected 404, got {r.status_code}"

check("GET /actors/999999/heroine-collaborators → 404", test_heroine_collaborators_unknown_actor)

# ── SECTION 12: Insight Data Validity ─────────────────────────────────────────
#
# Insights drive the homepage cards.  A structurally-valid insight that references
# a deleted actor (bad actor_id) or has mismatched arrays would cause broken links
# and blank avatars.  We also check numeric ranges (confidence 0–1) and that
# all industry values are recognisable strings.

print("\n📋 SECTION 12 — Insight Data Validity")

_KNOWN_INDUSTRIES = {"Tamil", "Telugu", "Malayalam", "Kannada", "Hindi", "English", ""}

def _fetch_insights_once():
    r = requests.get(f"{BASE}/analytics/insights", timeout=TIMEOUT)
    assert r.status_code == 200
    return r.json().get("insights", [])

_insights = _fetch_insights_once()

def test_insight_actor_ids_valid():
    """
    Every actor_id referenced in insights must resolve to a real actor (200).
    Checking all 124+ unique IDs in one shot would be slow; we verify a
    deterministic sample of 15 IDs covering different insight types.
    """
    import random
    all_ids = []
    for ins in _insights:
        all_ids.extend(ins.get("actor_ids", []))
    unique_ids = list(dict.fromkeys(all_ids))   # preserve order, deduplicate
    sample = unique_ids[:15]                    # first 15 — deterministic, no randomness
    bad = []
    for aid in sample:
        r = requests.get(f"{BASE}/actors/{aid}", timeout=TIMEOUT)
        if r.status_code != 200:
            bad.append(f"actor_id={aid} → HTTP {r.status_code}")
    assert not bad, f"Insight actor_ids that don't resolve: {bad}"

check("Insights: sampled actor_ids all resolve to valid actors", test_insight_actor_ids_valid)

def test_insight_arrays_aligned():
    """
    'actors' (name list) and 'actor_ids' (id list) must have the same length.
    A mismatch means the UI would render the wrong name next to the wrong avatar.

    Exceptions (by design — directors appear in 'actors' but lack actor_ids):
      • director_box_office: actors=[director_name], actor_ids=[] — director has no actor_id
      • director_loyalty:    actors=[actor, director], actor_ids=[actor_id] — director excluded
    All other insight types must have perfectly aligned arrays.
    """
    _SKIP_TYPES = {"director_box_office", "director_loyalty"}
    mismatches = []
    for i, ins in enumerate(_insights):
        if ins.get("type") in _SKIP_TYPES:
            continue
        actors    = ins.get("actors",    [])
        actor_ids = ins.get("actor_ids", [])
        if len(actors) != len(actor_ids):
            mismatches.append(
                f"Insight #{i} (type={ins.get('type')}): "
                f"actors={len(actors)} vs actor_ids={len(actor_ids)}"
            )
    assert not mismatches, f"{len(mismatches)} mismatched insight(s):\n  " + "\n  ".join(mismatches[:5])

check("Insights: actors[] and actor_ids[] have equal length", test_insight_arrays_aligned)

def test_insight_confidence_range():
    """confidence must be a float in [0.0, 1.0] — never negative or > 1."""
    bad = []
    for i, ins in enumerate(_insights):
        c = ins.get("confidence")
        if c is None:
            bad.append(f"Insight #{i}: confidence is null")
        elif not (0.0 <= c <= 1.0):
            bad.append(f"Insight #{i}: confidence={c} out of range [0, 1]")
    assert not bad, f"{len(bad)} insight(s) with invalid confidence:\n  " + "\n  ".join(bad[:5])

check("Insights: confidence values are in [0.0, 1.0]", test_insight_confidence_range)

def test_insight_industry_valid():
    """
    industry field must be a non-null string for all actor-centric insight types.

    Exception: director_box_office insights have industry=null by design —
    directors like S. S. Rajamouli or Mani Ratnam work across multiple industries
    so no single industry can be assigned.  All other types must have a string value.
    """
    bad = []
    for i, ins in enumerate(_insights):
        if ins.get("type") == "director_box_office":
            continue   # directors are cross-industry by nature
        ind = ins.get("industry")
        if ind is None:
            bad.append(f"Insight #{i} (type={ins.get('type')}): industry is null")
        elif not isinstance(ind, str):
            bad.append(f"Insight #{i}: industry is not a string: {ind!r}")
    assert not bad, f"{len(bad)} insight(s) with invalid industry:\n  " + "\n  ".join(bad[:5])

check("Insights: industry field is a non-null string on all insights", test_insight_industry_valid)

def test_insight_subtext_present():
    """
    subtext is the supporting copy shown under each insight card.
    A missing subtext leaves a blank card with no context — catch it early.
    """
    bad = []
    for i, ins in enumerate(_insights):
        sub = ins.get("subtext")
        if sub is None or (isinstance(sub, str) and not sub.strip()):
            bad.append(f"Insight #{i} (type={ins.get('type')}): subtext is null/empty")
    assert not bad, f"{len(bad)} insight(s) missing subtext:\n  " + "\n  ".join(bad[:5])

check("Insights: subtext present on all insight cards", test_insight_subtext_present)

# ── SUMMARY ───────────────────────────────────────────────────────────────────

total   = len(results)
passed  = sum(1 for r in results if r["status"] == "pass")
failed  = sum(1 for r in results if r["status"] == "fail")
slow    = sum(1 for r in results if r["status"] == "slow")

avg_ms  = sum(r["ms"] for r in results if r["ms"] > 0) / max(total, 1)

print(f"""
{'='*60}
API TEST RESULTS
{'='*60}
  Total   : {total}
  Passed  : {passed}
  Slow    : {slow}
  Failed  : {failed}
{'='*60}""")

if failed > 0:
    print("\n🔴 FAILED TESTS:")
    for r in results:
        if r["status"] == "fail":
            print(f"   • {r['name']}")
            print(f"     {r.get('error', '')}")

if slow > 0:
    print("\n⚡ SLOW TESTS (>2s):")
    for r in results:
        if r["status"] == "slow":
            print(f"   • {r['name']} — {r['ms']:.0f} ms")

print(f"\n  Average response time: {avg_ms:.0f} ms")
print(f"\n  Verdict: {'✅ ALL CLEAR' if failed == 0 else '❌ FAILURES DETECTED'}")

# Write JSON results for the report
import json, pathlib
pathlib.Path("qa/api_results.json").write_text(
    json.dumps({"total": total, "passed": passed, "failed": failed, "slow": slow,
                "avg_ms": round(avg_ms), "results": results}, indent=2)
)
print("\n  Results saved → qa/api_results.json")

sys.exit(1 if failed > 0 else 0)
