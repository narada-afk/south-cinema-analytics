"""
enrich_directors.py
--------------------
Sprint 19 — fetch director names for all movies that have a tmdb_id but
no director value in the movies.director TEXT column.

The TMDB /movie/{id}/credits endpoint returns the full crew array.
We extract the first person whose job == 'Director'.

After updating the movies table we also rebuild actor_director_stats so
the actor profile pages show correct director counts immediately.

Usage
-----
    python -m data_pipeline.enrich_directors --api-key YOUR_KEY [--dry-run]

Arguments
---------
--api-key   TMDB API v3 key (or set TMDB_API_KEY env var)
--dry-run   Print what would be updated without writing to the database
--limit N   Only process N movies (useful for testing; default: all)

Rate limiting
-------------
TMDB allows 40 requests per 10 s on the free tier.  We sleep 0.26 s
between requests (≈ 3.8 rps) which stays comfortably under the cap and
finishes 604 movies in about 2.5 minutes.
"""

import argparse
import os
import sys
import time

import requests

from sqlalchemy import create_engine, text

# ── Config ────────────────────────────────────────────────────────────────────

TMDB_BASE        = "https://api.themoviedb.org/3"
SLEEP_BETWEEN    = 0.26   # seconds between requests (~3.8 rps)
RETRY_SLEEP      = 10.0   # seconds to wait on a 429 rate-limit response
MAX_RETRIES      = 3

# ── TMDB helper ───────────────────────────────────────────────────────────────

def tmdb_get(path: str, api_key: str, retries: int = MAX_RETRIES) -> dict | None:
    """Call a TMDB API endpoint and return the parsed JSON, or None on error."""
    url = f"{TMDB_BASE}{path}"
    params = {"api_key": api_key}
    for attempt in range(retries):
        try:
            resp = requests.get(url, params=params, timeout=10)
            if resp.status_code == 429:
                print(f"    [rate-limit] sleeping {RETRY_SLEEP}s …")
                time.sleep(RETRY_SLEEP)
                continue
            if resp.status_code == 404:
                return None   # movie not found on TMDB — skip
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            print(f"    [error] {exc}")
            return None
    return None


def get_director_from_credits(tmdb_id: int, api_key: str) -> str | None:
    """Return the first director name from the TMDB credits, or None."""
    data = tmdb_get(f"/movie/{tmdb_id}/credits", api_key)
    if not data:
        return None
    crew = data.get("crew", [])
    for member in crew:
        if member.get("department") == "Directing" and member.get("job") == "Director":
            return member.get("name")
    return None


# ── Rebuild analytics ─────────────────────────────────────────────────────────

def rebuild_director_stats(db) -> int:
    """
    Rebuild actor_director_stats from actor_movies ⋈ movies.
    Counts films per actor+director pair.
    Returns number of rows inserted.
    """
    db.execute(text("DELETE FROM actor_director_stats"))
    result = db.execute(text("""
        INSERT INTO actor_director_stats (actor_id, director, film_count)
        SELECT
            am.actor_id,
            m.director,
            COUNT(*) AS film_count
        FROM   actor_movies am
        JOIN   movies m ON am.movie_id = m.id
        WHERE  m.director IS NOT NULL AND m.director <> ''
        GROUP  BY am.actor_id, m.director
        HAVING COUNT(*) >= 1
    """))
    db.commit()
    return result.rowcount


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Enrich movies.director from TMDB credits")
    parser.add_argument("--api-key", default=os.getenv("TMDB_API_KEY"),
                        help="TMDB API v3 key")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print updates without writing to DB")
    parser.add_argument("--limit", type=int, default=0,
                        help="Process only N movies (0 = all)")
    args = parser.parse_args()

    if not args.api_key:
        sys.exit("ERROR: provide --api-key or set TMDB_API_KEY env var")

    db_url = os.getenv("DATABASE_URL", "postgresql://sca:sca@localhost:5432/sca")
    engine = create_engine(db_url)

    with engine.connect() as db:
        # Fetch all movies that need enrichment
        query = """
            SELECT id, tmdb_id, title, release_year
            FROM   movies
            WHERE  tmdb_id IS NOT NULL
              AND  (director IS NULL OR director = '')
            ORDER  BY release_year DESC
        """
        if args.limit:
            query += f" LIMIT {args.limit}"

        movies = db.execute(text(query)).fetchall()
        total = len(movies)
        print(f"Movies to enrich: {total}")
        if args.dry_run:
            print("[DRY RUN — no DB writes]\n")

        updated  = 0
        skipped  = 0
        not_found = 0

        for i, movie in enumerate(movies, 1):
            director = get_director_from_credits(movie.tmdb_id, args.api_key)

            if director:
                print(f"[{i:>4}/{total}] ✓  {movie.title} ({movie.release_year}) → {director}")
                if not args.dry_run:
                    db.execute(
                        text("UPDATE movies SET director = :d WHERE id = :id"),
                        {"d": director, "id": movie.id},
                    )
                    db.commit()
                updated += 1
            else:
                print(f"[{i:>4}/{total}] –  {movie.title} ({movie.release_year}) — no director found")
                not_found += 1

            time.sleep(SLEEP_BETWEEN)

        print()
        print("=" * 50)
        print(f"Updated   : {updated}")
        print(f"Not found : {not_found}")
        print(f"Skipped   : {skipped}")

        if not args.dry_run and updated > 0:
            print()
            print("Rebuilding actor_director_stats …")
            rows = rebuild_director_stats(db)
            print(f"actor_director_stats rebuilt — {rows} rows")

    print("\nDone.")


if __name__ == "__main__":
    main()
