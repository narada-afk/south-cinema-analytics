-- =============================================================================
-- Migration: Sprint 9 — Malayalam actor expansion
-- File     : backend/migrations/sprint9_add_movie_industry.sql
-- Target   : PostgreSQL 14+
--
-- What this migration does:
--
--   Part A — Ensure industry column exists on movies
--     The movies table already carries an industry VARCHAR NOT NULL column
--     (added in the original schema).  This ALTER TABLE is a safe no-op when
--     the column is present; it ensures the migration is re-runnable on any
--     environment where the column might be absent.
--
--   Part B — Add performance indexes
--     idx_movies_industry  — fast GROUP BY / filter on industry
--     idx_movies_language  — fast filter by original language
--
--   Part C — Expand actor_movies to support ON CONFLICT upserts
--     No structural change needed — the composite PK (actor_id, movie_id)
--     already makes ON CONFLICT DO NOTHING work for idempotent inserts.
--
-- Industry value conventions (consistent with existing data):
--     'Malayalam'   — Malayalam-language films
--     'Tamil'       — Tamil-language films
--     'Telugu'      — Telugu-language films
--     'Kannada'     — Kannada-language films
--     'Hindi'       — Hindi-language films
--     'English'     — English-language films
--
-- Safe to re-run: all statements use IF NOT EXISTS.
-- Run order: after sprint8_supporting_actor_schema.sql.
-- =============================================================================

BEGIN;


-- ===========================================================================
-- Part A — Ensure industry column exists
-- ===========================================================================

-- This is typically a no-op because the column was created with the initial
-- schema.  Safe to run again; IF NOT EXISTS prevents errors on re-run.
ALTER TABLE movies
    ADD COLUMN IF NOT EXISTS industry TEXT;

COMMENT ON COLUMN movies.industry IS
    'Film industry classification: Malayalam, Tamil, Telugu, Kannada, Hindi, English, etc.';


-- ===========================================================================
-- Part B — Indexes for analytics queries
-- ===========================================================================

-- Fast GROUP BY industry / WHERE industry = 'Malayalam'
CREATE INDEX IF NOT EXISTS idx_movies_industry
    ON movies (industry);

COMMENT ON INDEX idx_movies_industry IS
    'Enables fast filtering and grouping of movies by industry.';

-- Fast filter by original language (populated by TMDB enrichment)
CREATE INDEX IF NOT EXISTS idx_movies_language
    ON movies (language);

COMMENT ON INDEX idx_movies_language IS
    'Enables fast filtering of movies by language (e.g. "Malayalam", "Tamil").';


-- ===========================================================================
-- Verification (uncomment to inspect after applying)
-- ===========================================================================

-- Check column exists:
-- SELECT column_name, data_type, is_nullable
-- FROM   information_schema.columns
-- WHERE  table_name = 'movies' AND column_name = 'industry';

-- Check indexes:
-- SELECT indexname, indexdef
-- FROM   pg_indexes
-- WHERE  indexname IN ('idx_movies_industry', 'idx_movies_language');


COMMIT;
