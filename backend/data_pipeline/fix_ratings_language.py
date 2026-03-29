"""
fix_ratings_language.py
=======================
Two quick DB fixes:

1. RATINGS — copy vote_average → imdb_rating for all movies where
   imdb_rating IS NULL and vote_average > 0.  Both are 0-10 scales so
   the data is directly comparable.

2. LANGUAGE — for movies missing a language tag that have a tmdb_id,
   fetch original_language from TMDB and map iso code → display name.

Run inside the Docker container:
  docker exec south-cinema-analytics-backend-1 \
    python /app/data_pipeline/fix_ratings_language.py
"""

import os
import time
import psycopg2
import requests

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://sca:sca@postgres:5432/sca")
TMDB_KEY     = os.getenv("TMDB_API_KEY", "")

LANG_MAP = {
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
    "kn": "Kannada",
    "hi": "Hindi",
    "en": "English",
    "mr": "Marathi",
    "bn": "Bengali",
    "pa": "Punjabi",
    "si": "Sinhala",
    "ur": "Urdu",
}


def get_conn():
    return psycopg2.connect(DATABASE_URL)


# ── Fix 1: ratings ────────────────────────────────────────────────────────────

def fix_ratings(conn):
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE movies
            SET imdb_rating = ROUND(vote_average::numeric, 1)
            WHERE imdb_rating IS NULL
              AND vote_average IS NOT NULL
              AND vote_average > 0
        """)
        updated = cur.rowcount
        conn.commit()
    print(f"[ratings] Updated {updated} movies: vote_average → imdb_rating")


# ── Fix 2: language ───────────────────────────────────────────────────────────

def fix_language(conn):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, tmdb_id FROM movies
            WHERE (language IS NULL OR language = '')
              AND tmdb_id IS NOT NULL
            ORDER BY id
        """)
        rows = cur.fetchall()

    print(f"[language] {len(rows)} movies need language lookup")
    if not rows:
        return

    if not TMDB_KEY:
        print("[language] TMDB_API_KEY not set — attempting DB-only fallback")
        # Fallback: infer from industry column if present
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE movies m
                SET language = CASE
                    WHEN LOWER(industry) LIKE '%telugu%'   THEN 'Telugu'
                    WHEN LOWER(industry) LIKE '%tamil%'    THEN 'Tamil'
                    WHEN LOWER(industry) LIKE '%malayalam%' THEN 'Malayalam'
                    WHEN LOWER(industry) LIKE '%kannada%'  THEN 'Kannada'
                    WHEN LOWER(industry) LIKE '%hindi%'    THEN 'Hindi'
                    ELSE NULL
                END
                WHERE (language IS NULL OR language = '')
                  AND industry IS NOT NULL
                  AND industry != ''
            """)
            updated = cur.rowcount
            conn.commit()
        print(f"[language] Industry-based fallback updated {updated} rows")
        return

    updated = 0
    errors  = 0
    for idx, (movie_id, tmdb_id) in enumerate(rows):
        try:
            url  = f"https://api.themoviedb.org/3/movie/{tmdb_id}"
            resp = requests.get(url, params={"api_key": TMDB_KEY}, timeout=8)
            if resp.status_code == 200:
                data     = resp.json()
                iso_lang = data.get("original_language", "")
                display  = LANG_MAP.get(iso_lang, iso_lang.capitalize() if iso_lang else None)
                if display:
                    with conn.cursor() as cur:
                        cur.execute(
                            "UPDATE movies SET language = %s WHERE id = %s",
                            (display, movie_id)
                        )
                    updated += 1
            elif resp.status_code == 404:
                pass  # movie not on TMDB anymore
            else:
                errors += 1

            if (idx + 1) % 50 == 0:
                conn.commit()
                print(f"  [{idx+1}/{len(rows)}] {updated} updated, {errors} errors")

            time.sleep(0.04)   # ~25 req/s — well within TMDB 40 req/s limit

        except Exception as e:
            errors += 1
            if errors < 5:
                print(f"  Error on tmdb_id={tmdb_id}: {e}")

    conn.commit()
    print(f"[language] Done — {updated} updated, {errors} errors out of {len(rows)} movies")


if __name__ == "__main__":
    conn = get_conn()
    try:
        fix_ratings(conn)
        fix_language(conn)
    finally:
        conn.close()
    print("\nAll done.")
