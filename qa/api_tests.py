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
