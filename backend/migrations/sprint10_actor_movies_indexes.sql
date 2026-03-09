-- =============================================================================
-- Migration: Sprint 10 — actor_movies performance indexes
-- File     : backend/migrations/sprint10_actor_movies_indexes.sql
-- Target   : PostgreSQL 14+
--
-- What this migration does:
--   Adds two indexes that enable efficient query plans for:
--     1. The analytics UNION joins in build_analytics_tables.py, which join
--        actor_movies ON movie_id (the non-leading PK column).
--     2. The GET /analytics/top-collaborations endpoint, which reads
--        actor_collaborations ORDER BY collaboration_count DESC LIMIT N.
--
-- Why idx_actor_movies_actor is NOT added here:
--   actor_movies has a composite PK (actor_id, movie_id).  PostgreSQL
--   automatically creates a btree index on (actor_id, movie_id) for the PK.
--   The leading actor_id column means WHERE actor_id = ? already uses an
--   index scan — a separate single-column index would be redundant.
--
-- New indexes added:
--   idx_actor_movies_movie
--       ON actor_movies(movie_id)
--       Enables the movie-side JOIN in the all_credits CTE used by
--       build_analytics_tables.py and any future ad-hoc movie queries.
--       Without this, a sequential scan on actor_movies is needed each time
--       the analytics pipeline runs.
--
--   idx_collab_count_desc
--       ON actor_collaborations(collaboration_count DESC)
--       Enables PostgreSQL to satisfy
--         ORDER BY collaboration_count DESC LIMIT N
--       with an index scan rather than a full sort.  For the top-collaborations
--       endpoint (default LIMIT 20) this converts a O(n log n) sort of 43 000+
--       rows into a O(N) index scan that returns almost instantly.
--
-- Safe to re-run: both CREATE INDEX statements use IF NOT EXISTS.
--
-- Run order: after sprint6_indexes.sql (and after sprint8_supporting_actor_schema.sql,
--            which creates the actor_movies table).
-- =============================================================================

BEGIN;


-- ---------------------------------------------------------------------------
-- actor_movies(movie_id) — movie-side join index
-- ---------------------------------------------------------------------------
-- The PK index on actor_movies covers (actor_id, movie_id) with actor_id as
-- the leading column.  Queries that filter or join on movie_id alone cannot
-- use the PK index efficiently; this single-column index fills that gap.
--
-- Primarily used by the WITH all_credits AS (...) CTE in:
--   • build_analytics_tables.py  (all four analytics table builds)
-- and also serves any future query pattern:
--   SELECT * FROM actor_movies WHERE movie_id = ?

CREATE INDEX IF NOT EXISTS idx_actor_movies_movie
    ON actor_movies (movie_id);

COMMENT ON INDEX idx_actor_movies_movie IS
    'Movie-side join index on actor_movies; complements the PK (actor_id, movie_id). Added Sprint 10.';


-- ---------------------------------------------------------------------------
-- actor_collaborations(collaboration_count DESC) — top-N read index
-- ---------------------------------------------------------------------------
-- The GET /analytics/top-collaborations endpoint issues:
--
--   SELECT ... FROM actor_collaborations
--   WHERE  actor1_id < actor2_id
--   ORDER  BY collaboration_count DESC
--   LIMIT  :lim
--
-- Without a covering index on collaboration_count, PostgreSQL must scan all
-- ~43 000 rows and sort before truncating to LIMIT N.  This index allows a
-- top-N index scan: the planner reads rows in descending order, applies the
-- WHERE filter, and stops as soon as LIMIT rows pass — typically reading only
-- a few hundred rows total regardless of table size.

CREATE INDEX IF NOT EXISTS idx_collab_count_desc
    ON actor_collaborations (collaboration_count DESC);

COMMENT ON INDEX idx_collab_count_desc IS
    'Descending collaboration_count index for efficient top-N pair queries. Added Sprint 10.';


-- ---------------------------------------------------------------------------
-- Verification queries (uncomment to confirm after applying)
-- ---------------------------------------------------------------------------

-- SELECT indexname, indexdef
-- FROM   pg_indexes
-- WHERE  indexname IN (
--            'idx_actor_movies_movie',
--            'idx_collab_count_desc'
--        )
-- ORDER  BY indexname;


COMMIT;
