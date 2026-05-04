"""
prod_data_fixes.py — idempotent data corrections run after every deploy.

Add fixes here when bad data is found in production. Each fix must be safe
to run multiple times (DELETE WHERE, ON CONFLICT DO UPDATE, etc.).
"""
import os, psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://sca:sca@/sca?host=/tmp")
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

# ── Fix 1: Remove spurious Jack & Daniel credit for Rajinikanth ──────────────
# TMDB incorrectly linked Rajinikanth (actor_id=11) to Jack & Daniel (movie_id=132),
# a Malayalam film he has no connection to.
cur.execute("DELETE FROM actor_movies WHERE actor_id = 11 AND movie_id = 132")
print(f"Fix 1 (Raj/Jack&Daniel): deleted {cur.rowcount} rows")

# ── Fix 2: Rebuild actor_collaborations from source data ─────────────────────
# Ensures collaboration counts match actual actor_movies entries.
# Fixes Malayalam pairs (e.g. Dileep+Jayaram) that had stale counts.
cur.execute("""
    INSERT INTO actor_collaborations (actor1_id, actor2_id, collaboration_count)
    SELECT am1.actor_id, am2.actor_id, COUNT(*)
    FROM actor_movies am1
    JOIN actor_movies am2
      ON am1.movie_id = am2.movie_id AND am1.actor_id != am2.actor_id
    GROUP BY am1.actor_id, am2.actor_id
    ON CONFLICT (actor1_id, actor2_id)
    DO UPDATE SET collaboration_count = EXCLUDED.collaboration_count
""")
print(f"Fix 2 (actor_collaborations rebuild): upserted {cur.rowcount} rows")

conn.commit()
conn.close()
print("All data fixes complete.")
