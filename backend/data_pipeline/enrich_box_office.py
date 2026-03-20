"""
enrich_box_office.py
====================
Enriches movie records with worldwide box office revenue from TMDB.

For every movie where tmdb_id IS NOT NULL and box_office IS NULL the script:
  1. Calls GET /movie/{tmdb_id} on TMDB to retrieve the revenue field.
  2. Converts the USD value to INR crore using a fixed exchange rate.
  3. Updates movies.box_office only when TMDB returns revenue > 0.
  4. Commits each row individually so progress is preserved on interruption.

Currency note
-------------
TMDB stores revenue in USD (whole dollars) as contributed by the community.
This script converts to INR crore using:

    crores = revenue_usd * USD_TO_INR / 10_000_000

where USD_TO_INR defaults to 84.0 (approximate 2024–25 mid-market rate).
Coverage is best for post-2010 blockbusters; older/smaller films will show 0
on TMDB and are skipped (box_office stays NULL for those).

Usage
-----
    # From the backend/ directory:
    python -m data_pipeline.enrich_box_office
    python -m data_pipeline.enrich_box_office --dry-run
    python -m data_pipeline.enrich_box_office --batch-size 200
    python -m data_pipeline.enrich_box_office --industry Telugu

Flags
-----
    --dry-run          Print what would be written without touching the DB.
    --batch-size N     Stop after N movies (0 = unlimited).
    --industry X       Restrict to movies.industry = X.
    --min-crore F      Only store values >= F crore (default: 0.5).
                       Filters out noise from tiny/zero-budget titles where
                       TMDB may have an accidental low revenue entry.

Environment
-----------
    DATABASE_URL   PostgreSQL DSN (default: postgresql://sca:sca@postgres:5432/sca)
    TMDB_API_KEY   Your TMDB v3 API key (required)
"""

import argparse
import os
import sys
import time
from typing import Optional

# ---------------------------------------------------------------------------
# Path bootstrap — same pattern used across the data_pipeline package
# ---------------------------------------------------------------------------
_BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Movie
from data_pipeline.tmdb_client import fetch_movie_details

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Approximate mid-market USD → INR rate (2024–25).
# Accuracy to ±5 % is fine for a curiosity / analytics platform.
USD_TO_INR = 84.0

_CRORE = 10_000_000  # 1 crore = 10,000,000

_SEP_THIN = "-" * 60
_SEP_BOLD = "=" * 60


# ---------------------------------------------------------------------------
# Currency helpers
# ---------------------------------------------------------------------------

def usd_to_crore(usd: int) -> float:
    """Convert a USD integer (as returned by TMDB) to INR crore."""
    return round(usd * USD_TO_INR / _CRORE, 2)


def fmt_crore(crore: float) -> str:
    """Format a crore value for display, e.g. '₹1,243.50 Cr'."""
    return f"₹{crore:,.2f} Cr"


# ---------------------------------------------------------------------------
# Console helpers
# ---------------------------------------------------------------------------

def _print_header(total: int, dry_run: bool, industry: str, min_crore: float) -> None:
    mode = "  [DRY RUN — no DB writes]" if dry_run else ""
    print(f"\n{_SEP_BOLD}")
    print(f"  Box Office Enrichment (TMDB → INR crore){mode}")
    print(f"  Movies to process : {total}")
    if industry:
        print(f"  Industry filter   : {industry}")
    print(f"  Min threshold     : {fmt_crore(min_crore)}")
    print(f"  Exchange rate     : 1 USD = ₹{USD_TO_INR:.1f}")
    print(f"{_SEP_BOLD}\n")


def _print_summary(
    processed: int,
    updated: int,
    zero_revenue: int,
    below_min: int,
    errors: int,
    elapsed: float,
    dry_run: bool,
) -> None:
    mode = "  [DRY RUN]" if dry_run else ""
    verb = "Would update" if dry_run else "Updated"
    print(f"\n{_SEP_BOLD}")
    print(f"  Box Office Enrichment complete{mode}")
    print(_SEP_THIN)
    print(f"  Processed         : {processed}")
    print(f"  {verb:<17}   : {updated}  (revenue > threshold)")
    print(f"  Zero / unknown    : {zero_revenue}  (TMDB has no revenue data)")
    print(f"  Below threshold   : {below_min}  (TMDB value < min_crore)")
    print(f"  Errors            : {errors}")
    print(f"  Elapsed           : {elapsed:.1f} s")
    print(f"{_SEP_BOLD}\n")


# ---------------------------------------------------------------------------
# Core per-movie logic
# ---------------------------------------------------------------------------

def _process_one(
    movie: Movie,
    dry_run: bool,
    min_crore: float,
    index: int,
    total: int,
) -> dict:
    """
    Fetch TMDB details for one movie, convert revenue, and optionally persist.

    Returns dict: {updated, zero_revenue, below_min, error}
    """
    details = fetch_movie_details(movie.tmdb_id)

    if details is None:
        print(f"[{index:>5}/{total}] {movie.title} ({movie.release_year})  — API error, skipped")
        return {"updated": False, "zero_revenue": False, "below_min": False, "error": True}

    revenue_usd = details["revenue"]

    if revenue_usd == 0:
        print(f"[{index:>5}/{total}] {movie.title} ({movie.release_year})  — no revenue on TMDB")
        return {"updated": False, "zero_revenue": True, "below_min": False, "error": False}

    crore = usd_to_crore(revenue_usd)

    if crore < min_crore:
        print(
            f"[{index:>5}/{total}] {movie.title} ({movie.release_year})  "
            f"— {fmt_crore(crore)} (below {fmt_crore(min_crore)}, skipped)"
        )
        return {"updated": False, "zero_revenue": False, "below_min": True, "error": False}

    # Revenue is valid — persist (unless dry-run)
    print(
        f"[{index:>5}/{total}] {movie.title} ({movie.release_year})  "
        f"→ {fmt_crore(crore)}{'  [DRY RUN]' if dry_run else '  ✓'}"
    )

    if not dry_run:
        try:
            db: Session = SessionLocal()
            try:
                db_movie = db.query(Movie).filter(Movie.id == movie.id).first()
                if db_movie:
                    db_movie.box_office = crore
                    db.commit()
            finally:
                db.close()
        except Exception as exc:
            print(f"         ✗ DB write failed: {exc}")
            return {"updated": False, "zero_revenue": False, "below_min": False, "error": True}

    return {"updated": True, "zero_revenue": False, "below_min": False, "error": False}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def enrich_box_office(
    batch_size: int  = 0,
    dry_run:    bool = False,
    industry:   str  = "",
    min_crore:  float = 0.5,
) -> int:
    """
    Fetch and store box office revenue for all movies with a TMDB ID
    but no box_office value yet.

    Returns 0 on success, 1 on fatal error.
    """
    t_start = time.monotonic()

    # Validate API key early
    if not os.getenv("TMDB_API_KEY", "").strip():
        print(
            "\n✗ TMDB_API_KEY is not set.\n"
            "  Get a free key at https://www.themoviedb.org/settings/api\n"
            "  Then run:  export TMDB_API_KEY=your_key_here\n"
        )
        return 1

    # Query movies that have a tmdb_id but no box_office yet
    db: Session = SessionLocal()
    try:
        q = (
            db.query(Movie)
            .filter(Movie.tmdb_id.isnot(None))
            .filter(Movie.box_office.is_(None))
            .order_by(Movie.release_year.desc())
        )
        if industry:
            q = q.filter(Movie.industry == industry)
        if batch_size and batch_size > 0:
            q = q.limit(batch_size)
        movies = q.all()
    finally:
        db.close()

    total = len(movies)
    if total == 0:
        print("\n✓ All movies already have box office data — nothing to do.\n")
        return 0

    _print_header(total=total, dry_run=dry_run, industry=industry, min_crore=min_crore)

    n_updated      = 0
    n_zero_revenue = 0
    n_below_min    = 0
    n_errors       = 0

    for idx, movie in enumerate(movies, start=1):
        try:
            outcome = _process_one(
                movie=movie,
                dry_run=dry_run,
                min_crore=min_crore,
                index=idx,
                total=total,
            )
        except RuntimeError:
            # TMDB_API_KEY missing mid-run
            return 1

        if outcome["error"]:
            n_errors += 1
        elif outcome["zero_revenue"]:
            n_zero_revenue += 1
        elif outcome["below_min"]:
            n_below_min += 1
        elif outcome["updated"]:
            n_updated += 1

    elapsed = time.monotonic() - t_start
    _print_summary(
        processed=total,
        updated=n_updated,
        zero_revenue=n_zero_revenue,
        below_min=n_below_min,
        errors=n_errors,
        elapsed=elapsed,
        dry_run=dry_run,
    )
    return 0


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Enrich South Cinema Analytics movies with TMDB box office revenue.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "examples:\n"
            "  python -m data_pipeline.enrich_box_office\n"
            "  python -m data_pipeline.enrich_box_office --dry-run\n"
            "  python -m data_pipeline.enrich_box_office --batch-size 500\n"
            "  python -m data_pipeline.enrich_box_office --industry Telugu\n"
            "  python -m data_pipeline.enrich_box_office --min-crore 10\n"
        ),
    )
    p.add_argument(
        "--batch-size", "-n",
        type=int, default=0, metavar="N",
        help="Process at most N movies per run (default: 0 = no limit).",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be updated without writing to the database.",
    )
    p.add_argument(
        "--industry",
        type=str, default="", metavar="INDUSTRY",
        help='Restrict to movies with this industry (e.g. "Telugu", "Tamil").',
    )
    p.add_argument(
        "--min-crore",
        type=float, default=0.5, metavar="F",
        help="Only store revenue values >= F crore (default: 0.5).",
    )
    return p.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    sys.exit(
        enrich_box_office(
            batch_size=args.batch_size,
            dry_run=args.dry_run,
            industry=args.industry,
            min_crore=args.min_crore,
        )
    )
