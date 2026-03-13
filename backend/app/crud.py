# crud.py
# Contains all database query logic (Create, Read, Update, Delete).
# The routes in main.py call these functions — keeping routes clean and simple.
#
# Sprint history:
#   Sprint 1-2 : get_all_actors, get_actor_by_name, get_movies_by_actor,
#                get_actor_stats (legacy — computes from movies table)
#   Sprint 6   : search_actors, get_actor_with_stats,
#                get_actor_movies_enriched, get_actor_collaborators,
#                get_actor_directors, get_actor_production,
#                get_actor_compare_stats, get_health_counts
#   Sprint 10  : get_top_collaborations
#   Sprint 15  : get_insights
#   Sprint 19  : get_top_directors, get_top_production_houses

from sqlalchemy.orm import Session
from sqlalchemy import func, text, case
from typing import Optional

from . import models, schemas


# ===========================================================================
# Core actor helpers  (used by multiple endpoints)
# ===========================================================================

def get_all_actors(db: Session):
    """Return all actors from the database (used by GET /actors)."""
    return db.query(models.Actor).all()


def get_actor_by_name(db: Session, name: str) -> Optional[models.Actor]:
    """
    Find a single actor by their exact name (case-insensitive).
    Uses the functional index idx_actors_name_lower for an indexed scan.
    """
    return (
        db.query(models.Actor)
        .filter(func.lower(models.Actor.name) == name.lower())
        .first()
    )


def get_actor_by_id(db: Session, actor_id: int) -> Optional[models.Actor]:
    """Return the Actor row for a given primary key, or None."""
    return db.query(models.Actor).filter(models.Actor.id == actor_id).first()


# ===========================================================================
# Search  (GET /actors/search?q=)
# ===========================================================================

def search_actors(db: Session, q: str, limit: int = 20, lead_only: bool = False) -> list:
    """
    Case-insensitive partial-match search on actors.name.

    Uses ILIKE '%q%' — with a leading wildcard a btree index cannot be used,
    but the table is small enough that a sequential scan completes in < 1 ms.
    Returns at most `limit` results (default 20).

    Ordering priority
    -----------------
    1. Exact name match (case-insensitive) — prevents "Aishwarya Rajinikanth"
       ranking above "Rajinikanth" when the query is "rajinikanth".
    2. Primary actors (is_primary_actor = True) — heroes before supporting cast.
    3. Alphabetical tiebreaker.

    When lead_only=True only actors with is_primary_actor=True are returned,
    filtering out supporting cast entirely.
    """
    exact_first = case(
        (func.lower(models.Actor.name) == q.lower(), 0),
        else_=1,
    )
    query = (
        db.query(models.Actor.id, models.Actor.name)
        .filter(models.Actor.name.ilike(f"%{q}%"))
    )
    if lead_only:
        query = query.filter(models.Actor.is_primary_actor == True)  # noqa: E712
    return (
        query
        .order_by(
            exact_first,
            models.Actor.is_primary_actor.desc(),
            models.Actor.name,
        )
        .limit(limit)
        .all()
    )


# ===========================================================================
# Actor profile  (GET /actors/{actor_id})
# ===========================================================================

def get_actor_with_stats(
    db: Session, actor_id: int
) -> Optional[tuple[models.Actor, Optional[models.ActorStats]]]:
    """
    Return (Actor, ActorStats | None) for the given actor_id.
    ActorStats is read from the precomputed actor_stats table (O(1) lookup).
    Returns None if the actor does not exist.
    """
    actor = get_actor_by_id(db, actor_id)
    if not actor:
        return None

    stats = (
        db.query(models.ActorStats)
        .filter(models.ActorStats.actor_id == actor_id)
        .first()
    )
    return actor, stats


# ===========================================================================
# Actor movies  (GET /actors/{actor_id}/movies)
# ===========================================================================

def get_movies_by_actor(db: Session, actor_id: int):
    """
    Return all movies an actor appeared in (legacy — used by seed_data
    and older tooling).  Not ordered; use get_actor_movies_enriched for
    the Sprint 6 endpoint.
    """
    return (
        db.query(models.Movie)
        .join(models.Cast, models.Cast.movie_id == models.Movie.id)
        .filter(models.Cast.actor_id == actor_id)
        .all()
    )


def get_actor_movies_enriched(db: Session, actor_id: int) -> list:
    """
    Return all movies for an actor, ordered by release_year DESC.

    Unions two sources so every pipeline path is covered:
      • "cast"        — Wikidata-sourced links (Sprints 1-5, original 13 actors)
      • actor_movies  — TMDB-sourced links   (Sprints 8-9, supporting + Malayalam)

    Returns full Movie objects so Pydantic can read enriched fields
    (runtime, production_company, language, poster_url, etc.).
    """
    from sqlalchemy import union, select

    cast_ids        = select(models.Cast.movie_id).where(
        models.Cast.actor_id == actor_id
    )
    actor_movie_ids = select(models.ActorMovie.movie_id).where(
        models.ActorMovie.actor_id == actor_id
    )
    all_movie_ids   = union(cast_ids, actor_movie_ids).scalar_subquery()

    return (
        db.query(models.Movie)
        .filter(models.Movie.id.in_(all_movie_ids))
        .order_by(models.Movie.release_year.desc())
        .all()
    )


# ===========================================================================
# Actor collaborators  (GET /actors/{actor_id}/collaborators)
# ===========================================================================

def get_actor_collaborators(db: Session, actor_id: int) -> list:
    """
    Return top co-stars for an actor, ordered by collaboration_count DESC.
    Reads from the precomputed actor_collaborations table (O(1) scan per actor).

    Returns a list of (name: str, collaboration_count: int) named tuples.
    Because both directions are stored in actor_collaborations, querying
    WHERE actor1_id = ? always returns the full collaborator set.

    Uses the idx_collab_actor1 index.
    """
    return (
        db.query(
            models.Actor.name,
            models.ActorCollaboration.collaboration_count,
        )
        .join(
            models.ActorCollaboration,
            models.ActorCollaboration.actor2_id == models.Actor.id,
        )
        .filter(models.ActorCollaboration.actor1_id == actor_id)
        .order_by(models.ActorCollaboration.collaboration_count.desc())
        .all()
    )


# ===========================================================================
# Actor directors  (GET /actors/{actor_id}/directors)
# ===========================================================================

def get_actor_directors(db: Session, actor_id: int) -> list:
    """
    Return all directors an actor has worked with, ordered by film_count DESC.
    Reads from the precomputed actor_director_stats table.
    Uses the idx_director_actor index.
    """
    return (
        db.query(models.ActorDirectorStat)
        .filter(models.ActorDirectorStat.actor_id == actor_id)
        .order_by(models.ActorDirectorStat.film_count.desc())
        .all()
    )


# ===========================================================================
# Actor production companies  (GET /actors/{actor_id}/production)
# ===========================================================================

def get_actor_production(db: Session, actor_id: int) -> list:
    """
    Return production companies an actor has worked with, ordered by
    film_count DESC. Reads from the precomputed actor_production_stats table.
    Uses the idx_production_actor index.
    """
    return (
        db.query(models.ActorProductionStat)
        .filter(models.ActorProductionStat.actor_id == actor_id)
        .order_by(models.ActorProductionStat.film_count.desc())
        .all()
    )


# ===========================================================================
# Actor comparison  (GET /compare?actor1=...&actor2=...)
# ===========================================================================

def get_actor_compare_stats(
    db: Session, actor_name: str
) -> Optional[tuple[models.Actor, models.ActorStats]]:
    """
    Look up an actor by name and return their precomputed stats.
    Both the actor row and the actor_stats row are required; if either is
    missing (e.g. the analytics tables haven't been built yet) returns None.

    This is the Sprint 6 compare helper — reads only two indexed rows per
    actor (actors PK + actor_stats PK), so the response is O(1).
    """
    actor = get_actor_by_name(db, actor_name)
    if not actor:
        return None

    stats = (
        db.query(models.ActorStats)
        .filter(models.ActorStats.actor_id == actor.id)
        .first()
    )
    if not stats:
        return None

    return actor, stats


# ===========================================================================
# Health  (GET /health)
# ===========================================================================

def get_health_counts(db: Session) -> tuple[int, int]:
    """
    Return (actor_count, movie_count) for the /health endpoint.
    Uses COUNT aggregates — fast even without dedicated indexes since
    PostgreSQL tracks table sizes in pg_class.
    """
    actor_count = db.query(func.count(models.Actor.id)).scalar() or 0
    movie_count = db.query(func.count(models.Movie.id)).scalar() or 0
    return actor_count, movie_count


# ===========================================================================
# Top collaborations  (GET /analytics/top-collaborations)
# ===========================================================================

def get_top_collaborations(db: Session, limit: int = 20) -> list:
    """
    Return the actor pairs with the most shared films, ranked descending.

    Data source
    -----------
    Reads from the **actor_collaborations** precomputed table, which is built
    by `build_analytics_tables.py` from the union of both ingestion pipelines:
        • "cast"        — Wikidata-sourced links (Sprints 1-5, 13 original actors)
        • actor_movies  — TMDB-sourced links   (Sprints 8-9, supporting + Malayalam)

    Using the precomputed table (O(1) scan) instead of re-joining actor_movies
    at query time keeps response latency sub-millisecond regardless of dataset size.

    The table stores both directions (A→B and B→A).  The WHERE clause
    ``actor1_id < actor2_id`` selects only one canonical direction per pair,
    eliminating duplicates without a DISTINCT pass.

    Parameters
    ----------
    db    : Active SQLAlchemy session.
    limit : Maximum rows to return (default 20, passed as query parameter).

    Returns
    -------
    List of Row objects, each with fields: actor_1 (str), actor_2 (str), films (int).
    Ordered by films DESC.

    Example
    -------
    >>> rows = get_top_collaborations(db, limit=5)
    >>> rows[0]
    ('Mohanlal', 'Jagathy Sreekumar', 60)
    """
    sql = text("""
        SELECT
            a1.name                          AS actor_1,
            a2.name                          AS actor_2,
            ac.collaboration_count           AS films
        FROM   actor_collaborations ac
        JOIN   actors a1 ON ac.actor1_id = a1.id
        JOIN   actors a2 ON ac.actor2_id = a2.id
        WHERE  ac.actor1_id < ac.actor2_id
        ORDER  BY ac.collaboration_count DESC
        LIMIT  :lim
    """)
    result = db.execute(sql, {"lim": limit})
    return result.fetchall()


# ===========================================================================
# Insight engine  (GET /analytics/insights)
# ===========================================================================

def get_insights(db: Session, industry: Optional[str] = None) -> list:
    """
    Build a mixed list of 8 dynamic cinema insight objects for the homepage.

    Runs three independent queries and interleaves the results so the response
    always has a variety of insight types:

    1. Collaboration insights — actor pairs with the most shared films,
       sourced from the precomputed actor_collaborations table.  The
       ``actor1_id < actor2_id`` guard picks one canonical direction per pair.

    2. Director partnership insights — actor + director duos with the highest
       co-film counts, computed from actor_movies ⋈ movies.

    3. Supporting actor insights — the most prolific supporting performers,
       computed from actor_movies rows where role_type = 'supporting'.

    Parameters
    ----------
    industry : Optional industry filter (e.g. "telugu", "tamil").  Pass None
               or "all" for the cross-industry global view.  Matching is
               case-insensitive against the actors.industry column.
               When a specific industry is selected the director HAVING
               threshold is relaxed from 4 → 2 to ensure results even for
               smaller industries (e.g. Kannada).

    Interleaving strategy
    ---------------------
    Zip the three lists together (collab, director, supporting, collab, …)
    and take the first 8 entries.  With 5 rows per query this yields
    3 collaborations + 3 directors + 2 supporting = 8 total, guaranteeing
    a balanced mix without hardcoding per-type limits.

    Returns
    -------
    list of plain dicts — converted to Insight Pydantic models in the route.
    """
    from itertools import zip_longest

    # Normalise: None / "all" / "explore" → no filter
    ind = (
        industry.lower()
        if industry and industry.lower() not in ("all", "explore")
        else None
    )

    # Relax thresholds for industry-specific views so smaller industries
    # (Kannada, etc.) still return results.
    dir_threshold  = 2  if ind else 4   # director co-film minimum
    supp_threshold = 5  if ind else 10  # supporting actor minimum films
    # 10+ globally means a genuinely prolific character actor (e.g. Brahmanandam
    # with 58 films, Nassar with 79).  5+ for a single industry is still
    # meaningful without letting 1- or 2-film cameos pollute the cards.

    # ── Query 1: Top actor-actor collaborations ──────────────────────────────
    collab_rows = db.execute(text("""
        SELECT
            a1.name                AS actor1,
            a2.name                AS actor2,
            a1.id                  AS actor1_id,
            a2.id                  AS actor2_id,
            ac.collaboration_count
        FROM   actor_collaborations ac
        JOIN   actors a1 ON ac.actor1_id = a1.id
        JOIN   actors a2 ON ac.actor2_id = a2.id
        WHERE  ac.actor1_id < ac.actor2_id
          AND  (:ind IS NULL OR LOWER(a1.industry) = :ind)
          AND  (:ind IS NULL OR LOWER(a2.industry) = :ind)
        ORDER  BY ac.collaboration_count DESC
        LIMIT  5
    """), {"ind": ind}).fetchall()

    collab_insights = [
        {
            "type":      "collaboration",
            "headline":  f"{row.actor1} and {row.actor2} have appeared together in",
            "value":     row.collaboration_count,
            "unit":      "films",
            "actors":    [row.actor1, row.actor2],
            "actor_ids": [row.actor1_id, row.actor2_id],
        }
        for row in collab_rows
    ]

    # ── Query 2: Actor-director partnerships ─────────────────────────────────
    director_rows = db.execute(text("""
        SELECT
            a.name       AS actor,
            a.id         AS actor_id,
            m.director,
            COUNT(*)     AS films
        FROM   actor_movies am
        JOIN   actors  a ON am.actor_id  = a.id
        JOIN   movies  m ON am.movie_id  = m.id
        WHERE  m.director IS NOT NULL
          AND  m.director <> ''
          AND  (:ind IS NULL OR LOWER(a.industry) = :ind)
        GROUP  BY a.name, a.id, m.director
        HAVING COUNT(*) >= :threshold
        ORDER  BY films DESC
        LIMIT  5
    """), {"ind": ind, "threshold": dir_threshold}).fetchall()

    director_insights = [
        {
            "type":      "director",
            "headline":  f"{row.actor}'s most frequent director is",
            "value":     row.films,
            "unit":      "films",
            "actors":    [row.actor, row.director],
            # Director is not in the actors table — only the actor's ID is returned
            "actor_ids": [row.actor_id],
        }
        for row in director_rows
    ]

    # ── Query 3: Prolific supporting actors ──────────────────────────────────
    # Minimum threshold keeps low-count cameos (1–9 films) off the homepage.
    # The HAVING guard is the key quality gate:
    #   - globally:          10+ films  →  genuinely prolific character actor
    #   - industry-specific:  5+ films  →  meaningful within a smaller pool
    supporting_rows = db.execute(text("""
        SELECT
            a.name,
            a.id,
            COUNT(*) AS films
        FROM   actor_movies am
        JOIN   actors a ON am.actor_id = a.id
        WHERE  am.role_type = 'supporting'
          AND  (:ind IS NULL OR LOWER(a.industry) = :ind)
        GROUP  BY a.name, a.id
        HAVING COUNT(*) >= :supp_threshold
        ORDER  BY films DESC
        LIMIT  5
    """), {"ind": ind, "supp_threshold": supp_threshold}).fetchall()

    supporting_insights = [
        {
            "type":      "supporting",
            "headline":  f"A defining face in South Indian cinema, {row.name} has appeared in",
            "value":     row.films,
            "unit":      "films",
            "actors":    [row.name],
            "actor_ids": [row.id],
        }
        for row in supporting_rows
    ]

    # ── Interleave and cap at 8 ───────────────────────────────────────────────
    interleaved: list = []
    for c, d, s in zip_longest(collab_insights, director_insights, supporting_insights):
        if c:
            interleaved.append(c)
        if d:
            interleaved.append(d)
        if s:
            interleaved.append(s)

    return interleaved[:8]


# ===========================================================================
# Shared films  (GET /actors/{actor1_id}/shared/{actor2_id})
# ===========================================================================

def get_shared_films(db: Session, actor1_id: int, actor2_id: int) -> list:
    """
    Return movies that both actors have appeared in together, ordered newest-first.

    Searches across both ingestion pipelines:
      • "cast"        — Wikidata-sourced links (original 13 actors);
                        has role_type but no character_name
      • actor_movies  — TMDB-sourced links (supporting + Malayalam);
                        has role_type AND character_name

    Uses LEFT JOINs on both tables for each actor so we can collect their
    role_type and character_name in the same row.  COALESCE prefers the
    TMDB data (actor_movies) since it has richer character info.

    A movie qualifies only if at least one link for each actor exists —
    it does not matter which pipeline produced each link.
    """
    sql = text("""
        SELECT
            m.title,
            m.release_year,
            m.director,
            m.poster_url,
            m.vote_average,
            m.popularity,
            -- Actor 1: prefer TMDB character name; fall back to Wikidata role_type
            COALESCE(am1.character_name)                        AS actor1_character,
            COALESCE(am1.role_type, c1.role_type)               AS actor1_role,
            -- Actor 2: same
            COALESCE(am2.character_name)                        AS actor2_character,
            COALESCE(am2.role_type, c2.role_type)               AS actor2_role
        FROM   movies m
        LEFT JOIN actor_movies am1 ON am1.movie_id = m.id AND am1.actor_id = :a1
        LEFT JOIN "cast"       c1  ON c1.movie_id  = m.id AND c1.actor_id  = :a1
        LEFT JOIN actor_movies am2 ON am2.movie_id = m.id AND am2.actor_id = :a2
        LEFT JOIN "cast"       c2  ON c2.movie_id  = m.id AND c2.actor_id  = :a2
        WHERE (am1.actor_id IS NOT NULL OR c1.actor_id IS NOT NULL)
          AND (am2.actor_id IS NOT NULL OR c2.actor_id IS NOT NULL)
        ORDER BY m.release_year DESC
    """)
    return db.execute(sql, {"a1": actor1_id, "a2": actor2_id}).fetchall()


# ===========================================================================
# Legacy helpers  (retained for backward compatibility)
# ===========================================================================

def get_actor_stats(db: Session, actor_name: str) -> Optional[schemas.LegacyActorStats]:
    """
    Compute analytics for a single actor on the fly from the movies table.

    LEGACY — originally used by /compare (Sprint 1-2). Kept so any tooling
    that imports this function still works. New endpoints should call
    get_actor_compare_stats() which reads from the precomputed actor_stats
    table and is significantly faster.
    """
    actor = get_actor_by_name(db, actor_name)
    if not actor:
        return None

    movies = get_movies_by_actor(db, actor.id)
    total_movies = len(movies)

    ratings = [m.imdb_rating for m in movies if m.imdb_rating is not None]
    avg_rating = round(sum(ratings) / len(ratings), 2) if ratings else None

    movies_after_2015 = sum(1 for m in movies if m.release_year > 2015)

    box_offices = [m.box_office for m in movies if m.box_office is not None]
    avg_box_office = round(sum(box_offices) / len(box_offices), 2) if box_offices else None

    return schemas.LegacyActorStats(
        name=actor.name,
        total_movies=total_movies,
        avg_rating=avg_rating,
        movies_after_2015=movies_after_2015,
        avg_box_office=avg_box_office,
    )


# ===========================================================================
# Top directors  (GET /analytics/directors)  Sprint 19
# ===========================================================================

def get_top_directors(
    db: Session, industry: Optional[str] = None, limit: int = 30
) -> list:
    """
    Return directors ranked by number of films in the database.

    Data source
    -----------
    Reads from the legacy ``movies.director`` TEXT column — the denormalized
    field that is always populated.  The normalised ``movie_directors`` join
    table is more correct but only covers a subset of movies; this query uses
    the legacy column for maximum coverage.

    Filtering
    ---------
    industry : optional case-insensitive match against ``movies.industry``.
               Pass None / "all" / "explore" for the cross-industry view.

    Deduplication
    -------------
    Only directors with ≥ 2 films are included — eliminates one-off credits
    that pollute the leaderboard with unique names.

    Returns
    -------
    List of Row objects with fields: name (str), film_count (int),
    industries (str — comma-separated, e.g. "Telugu, Tamil").
    Ordered by film_count DESC.
    """
    ind = (
        industry.lower()
        if industry and industry.lower() not in ("all", "explore")
        else None
    )
    sql = text("""
        SELECT
            m.director                               AS name,
            COUNT(*)                                 AS film_count,
            STRING_AGG(DISTINCT m.industry, ', ')    AS industries
        FROM   movies m
        WHERE  m.director IS NOT NULL
          AND  m.director <> ''
          AND  (:ind IS NULL OR LOWER(m.industry) = :ind)
        GROUP  BY m.director
        HAVING COUNT(*) >= 2
        ORDER  BY film_count DESC
        LIMIT  :lim
    """)
    return db.execute(sql, {"ind": ind, "lim": limit}).fetchall()


# ===========================================================================
# Top production houses  (GET /analytics/production-houses)  Sprint 19
# ===========================================================================

def get_top_production_houses(
    db: Session, industry: Optional[str] = None, limit: int = 20
) -> list:
    """
    Return production companies ranked by number of films in the database.

    Data source
    -----------
    Reads from ``movies.production_company`` — populated by enrich_movies.py
    via Wikipedia infobox scraping.  Rows where the column is NULL or empty
    are excluded.

    Filtering
    ---------
    industry : optional case-insensitive match against ``movies.industry``.

    Deduplication
    -------------
    Only companies with ≥ 2 films are included.

    Returns
    -------
    List of Row objects with fields: name (str), film_count (int),
    industries (str — comma-separated).
    Ordered by film_count DESC.
    """
    ind = (
        industry.lower()
        if industry and industry.lower() not in ("all", "explore")
        else None
    )
    sql = text("""
        SELECT
            m.production_company                     AS name,
            COUNT(*)                                 AS film_count,
            STRING_AGG(DISTINCT m.industry, ', ')    AS industries
        FROM   movies m
        WHERE  m.production_company IS NOT NULL
          AND  m.production_company <> ''
          AND  (:ind IS NULL OR LOWER(m.industry) = :ind)
        GROUP  BY m.production_company
        HAVING COUNT(*) >= 2
        ORDER  BY film_count DESC
        LIMIT  :lim
    """)
    return db.execute(sql, {"ind": ind, "lim": limit}).fetchall()


# ===========================================================================
# Sprint 21 — Stats for Nerds  (GET /stats/*)
# ===========================================================================

def get_stats_overview(db: Session) -> dict:
    """Global DB snapshot: movies, actors, links, industries."""
    total_movies = db.execute(text(
        "SELECT COUNT(*) FROM movies WHERE industry IN ('Tamil','Telugu','Malayalam','Kannada')"
    )).scalar()
    total_actors = db.execute(text(
        "SELECT COUNT(*) FROM actors WHERE actor_tier IN ('primary','network')"
    )).scalar()
    total_links = db.execute(text("SELECT COUNT(*) FROM actor_movies")).scalar()
    return {
        "total_movies":  total_movies,
        "total_actors":  total_actors,
        "total_links":   total_links,
        "industries":    4,
    }


def get_most_connected_actors(db: Session, limit: int = 25) -> list:
    """Actors ranked by number of unique co-stars (primary + network tier only)."""
    rows = db.execute(text("""
        WITH costar_counts AS (
            SELECT am1.actor_id,
                   COUNT(DISTINCT am2.actor_id) AS unique_costars
            FROM actor_movies am1
            JOIN actor_movies am2
              ON am1.movie_id = am2.movie_id AND am1.actor_id != am2.actor_id
            GROUP BY am1.actor_id
        ),
        film_counts AS (
            SELECT actor_id, COUNT(DISTINCT movie_id) AS film_count
            FROM actor_movies
            GROUP BY actor_id
        )
        SELECT a.id, a.name, a.industry, a.actor_tier,
               COALESCE(cc.unique_costars, 0) AS unique_costars,
               COALESCE(fc.film_count, 0)     AS film_count
        FROM actors a
        LEFT JOIN costar_counts cc ON cc.actor_id = a.id
        LEFT JOIN film_counts   fc ON fc.actor_id = a.id
        WHERE a.actor_tier IN ('primary','network')
        ORDER BY unique_costars DESC
        LIMIT :lim
    """), {"lim": limit}).fetchall()
    return [
        {"id": r[0], "name": r[1], "industry": r[2], "tier": r[3],
         "unique_costars": r[4], "film_count": r[5]}
        for r in rows
    ]


def get_industry_distribution(db: Session) -> list:
    """Film counts per South Indian industry, including per-decade breakdown."""
    rows = db.execute(text("""
        SELECT industry,
               COUNT(*)                                      AS total,
               COUNT(*) FILTER (WHERE release_year < 1980)  AS pre_1980,
               COUNT(*) FILTER (WHERE release_year BETWEEN 1980 AND 1999) AS s1980s,
               COUNT(*) FILTER (WHERE release_year BETWEEN 2000 AND 2009) AS s2000s,
               COUNT(*) FILTER (WHERE release_year BETWEEN 2010 AND 2019) AS s2010s,
               COUNT(*) FILTER (WHERE release_year >= 2020)               AS s2020s
        FROM movies
        WHERE industry IN ('Tamil','Telugu','Malayalam','Kannada')
        GROUP BY industry
        ORDER BY total DESC
    """)).fetchall()
    return [
        {"industry": r[0], "total": r[1],
         "pre_1980": r[2], "s1980s": r[3], "s2000s": r[4],
         "s2010s": r[5], "s2020s": r[6]}
        for r in rows
    ]


def get_top_director_partnerships(db: Session, limit: int = 15) -> list:
    """Most prolific actor–director pairs (requires movies.director column)."""
    rows = db.execute(text("""
        SELECT a.name                               AS actor_name,
               m.director,
               COUNT(*)                            AS film_count,
               MAX(m.industry)                     AS industry,
               array_agg(m.title ORDER BY m.release_year DESC) AS films
        FROM actor_movies am
        JOIN actors a ON a.id = am.actor_id
        JOIN movies m  ON m.id = am.movie_id
        WHERE m.director IS NOT NULL
          AND m.director != ''
          AND a.actor_tier IN ('primary','network')
        GROUP BY a.name, m.director
        HAVING COUNT(*) >= 3
        ORDER BY film_count DESC
        LIMIT :lim
    """), {"lim": limit}).fetchall()
    return [
        {"actor": r[0], "director": r[1], "film_count": r[2],
         "industry": r[3], "films": list(r[4])[:5]}
        for r in rows
    ]


def get_career_timeline(db: Session, actor_id: int) -> list:
    """Films per year for a given actor."""
    rows = db.execute(text("""
        SELECT m.release_year AS year, COUNT(*) AS count
        FROM movies m
        JOIN actor_movies am ON am.movie_id = m.id
        WHERE am.actor_id = :aid
          AND m.release_year > 1950
          AND m.release_year <= EXTRACT(YEAR FROM NOW())::int
        GROUP BY m.release_year
        ORDER BY m.release_year
    """), {"aid": actor_id}).fetchall()
    return [{"year": r[0], "count": r[1]} for r in rows]


def get_top_costars(db: Session, limit: int = 15) -> list:
    """Actors with the highest unique co-star counts across all tiers."""
    rows = db.execute(text("""
        WITH costar_counts AS (
            SELECT am1.actor_id,
                   COUNT(DISTINCT am2.actor_id) AS unique_costars,
                   COUNT(DISTINCT am1.movie_id) AS film_count
            FROM actor_movies am1
            JOIN actor_movies am2
              ON am1.movie_id = am2.movie_id AND am1.actor_id != am2.actor_id
            GROUP BY am1.actor_id
        )
        SELECT a.id, a.name, a.industry, cc.unique_costars, cc.film_count
        FROM actors a
        JOIN costar_counts cc ON cc.actor_id = a.id
        WHERE a.actor_tier IN ('primary','network')
        ORDER BY cc.unique_costars DESC
        LIMIT :lim
    """), {"lim": limit}).fetchall()
    return [
        {"id": r[0], "name": r[1], "industry": r[2],
         "unique_costars": r[3], "film_count": r[4]}
        for r in rows
    ]


def find_actor_connection(db: Session, actor1_id: int, actor2_id: int,
                          max_depth: int = 6) -> dict:
    """
    BFS shortest path between two actors through the collaboration graph.
    Returns path (list of actors) + connecting movies for each edge.
    """
    from collections import defaultdict, deque

    # Build adjacency list: actor_id -> {neighbor_id: (movie_id, movie_title)}
    # One movie per pair, chosen by highest popularity.
    rows = db.execute(text("""
        SELECT DISTINCT ON (am1.actor_id, am2.actor_id)
            am1.actor_id, am2.actor_id, m.id, m.title
        FROM actor_movies am1
        JOIN actor_movies am2
          ON am1.movie_id = am2.movie_id AND am1.actor_id < am2.actor_id
        JOIN movies m ON m.id = am1.movie_id
        ORDER BY am1.actor_id, am2.actor_id, m.popularity DESC NULLS LAST
    """)).fetchall()

    graph: dict[int, dict[int, tuple]] = defaultdict(dict)
    for a, b, mid, mtitle in rows:
        graph[a][b] = (mid, mtitle or "Unknown")
        graph[b][a] = (mid, mtitle or "Unknown")

    if actor1_id == actor2_id:
        row = db.execute(text("SELECT id, name FROM actors WHERE id=:id"),
                         {"id": actor1_id}).fetchone()
        return {"found": True, "depth": 0,
                "path": [{"id": row[0], "name": row[1]}], "connections": []}

    # BFS
    visited = {actor1_id}
    prev: dict[int, tuple] = {}   # neighbor -> (from_actor_id, movie_id, movie_title)
    queue = deque([actor1_id])
    found = False

    while queue and not found:
        current = queue.popleft()
        if len(prev) > 500_000:   # safety cap
            break
        for neighbor, (mid, mtitle) in graph[current].items():
            if neighbor not in visited:
                visited.add(neighbor)
                prev[neighbor] = (current, mid, mtitle)
                if neighbor == actor2_id:
                    found = True
                    break
                queue.append(neighbor)

    if not found:
        return {"found": False, "depth": -1, "path": [], "connections": []}

    # Reconstruct path
    path_ids, connections = [], []
    cur = actor2_id
    while cur in prev:
        prev_actor, movie_id, movie_title = prev[cur]
        path_ids.insert(0, cur)
        connections.insert(0, {"movie_id": movie_id, "movie_title": movie_title})
        cur = prev_actor
    path_ids.insert(0, actor1_id)

    # Fetch actor names
    actor_rows = db.execute(
        text("SELECT id, name FROM actors WHERE id = ANY(:ids)"),
        {"ids": path_ids}
    ).fetchall()
    name_map = {r[0]: r[1] for r in actor_rows}

    return {
        "found": True,
        "depth": len(path_ids) - 1,
        "path": [{"id": aid, "name": name_map.get(aid, "?")} for aid in path_ids],
        "connections": connections,
    }
