# South Cinema Analytics

An analytics platform for South Indian cinema. Ingests filmography data from Wikidata and Wikipedia, precomputes actor statistics, and exposes a FastAPI REST API for a dashboard frontend to consume.

---

## What it does

- Pulls complete filmographies for 13 major South Indian actors from **Wikidata** via SPARQL
- Enriches movie records with runtime, production company, and language from **Wikipedia**
- Precomputes analytics tables (career stats, collaborations, director pairings) so dashboard queries are O(1)
- Serves all data through a typed **FastAPI** REST API with interactive docs

---

## Actors covered

| Actor | Industry |
|---|---|
| Allu Arjun | Telugu |
| Mahesh Babu | Telugu |
| Prabhas | Telugu |
| Ram Charan | Telugu |
| N. T. Rama Rao Jr. | Telugu |
| Pawan Kalyan | Telugu |
| Vijay | Tamil |
| Ajith Kumar | Tamil |
| Suriya | Tamil |
| Dhanush | Tamil |
| Karthi | Tamil |
| Rajinikanth | Tamil |
| Kamal Haasan | Tamil |

**Dataset size:** ~734 movies, ~759 cast links

---

## Tech stack

| Layer | Technology |
|---|---|
| API | FastAPI + Uvicorn |
| ORM | SQLAlchemy |
| Database | PostgreSQL 15 |
| Data sources | Wikidata SPARQL, Wikipedia |
| HTTP clients | requests, requests-cache (Wikipedia caching) |
| Retry logic | urllib3 `Retry` (3 retries, backoff) |

---

## Project structure

```
south-cinema-analytics/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI routes
│   │   ├── crud.py          # Database query functions
│   │   ├── models.py        # SQLAlchemy ORM models
│   │   ├── schemas.py       # Pydantic request/response schemas
│   │   └── database.py      # DB connection + session factory
│   ├── data_pipeline/
│   │   ├── ingest_all_actors.py        # Wikidata batch ingestion
│   │   ├── ingest_actor.py             # Per-actor upsert logic
│   │   ├── enrich_movies.py            # Wikipedia enrichment
│   │   ├── build_analytics_tables.py   # Precompute analytics tables
│   │   ├── refresh_analytics_views.py  # Refresh materialized views
│   │   ├── wikidata_client.py          # Single-actor SPARQL client
│   │   ├── wikidata_batch_client.py    # Batched SPARQL client (VALUES clause)
│   │   └── wikipedia_client.py        # Wikipedia scraper with caching
│   ├── migrations/
│   │   ├── sprint2_add_directors.sql
│   │   ├── sprint3_add_actor_registry.sql
│   │   ├── sprint4_indexes_and_constraints.sql
│   │   ├── sprint4_pipeline_runs.sql
│   │   ├── sprint4_materialized_views.sql
│   │   ├── sprint5_analytics_tables.sql
│   │   └── sprint6_indexes.sql
│   └── requirements.txt
└── README.md
```

---

## Database schema

```
actor_registry          seed catalog — Wikidata QIDs for ingestion
actors                  ingested actor records
movies                  ingested film records (enriched by Wikipedia)
cast                    actor ↔ movie join table (many-to-many)
directors               normalized director entities
movie_directors         movie ↔ director join table (many-to-many)
pipeline_runs           audit log for every pipeline execution

actor_stats             precomputed: film count, career span, avg runtime
actor_collaborations    precomputed: co-occurrence counts (bidirectional)
actor_director_stats    precomputed: actor × director film counts
actor_production_stats  precomputed: actor × production company film counts
```

---

## Setup

### Prerequisites

- Python 3.11+
- PostgreSQL 15 running locally on port 5432
- A database named `sca` with user `sca` / password `sca`

```sql
CREATE USER sca WITH PASSWORD 'sca';
CREATE DATABASE sca OWNER sca;
```

### Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Run all migrations (in order)

```bash
psql -h localhost -p 5432 -U sca -d sca -f migrations/sprint2_add_directors.sql
psql -h localhost -p 5432 -U sca -d sca -f migrations/sprint3_add_actor_registry.sql
psql -h localhost -p 5432 -U sca -d sca -f migrations/sprint4_indexes_and_constraints.sql
psql -h localhost -p 5432 -U sca -d sca -f migrations/sprint4_pipeline_runs.sql
psql -h localhost -p 5432 -U sca -d sca -f migrations/sprint4_materialized_views.sql
psql -h localhost -p 5432 -U sca -d sca -f migrations/sprint5_analytics_tables.sql
psql -h localhost -p 5432 -U sca -d sca -f migrations/sprint6_indexes.sql
```

All migrations use `IF NOT EXISTS` and are safe to re-run.

---

## Running the data pipeline

Run these three commands in order. Each step builds on the previous one.

```bash
cd backend

# 1. Pull filmographies from Wikidata (all 13 actors in one batched SPARQL query)
DATABASE_URL=postgresql://sca:sca@localhost:5432/sca python -m data_pipeline.ingest_all_actors

# 2. Enrich movies with runtime, production company, language from Wikipedia
DATABASE_URL=postgresql://sca:sca@localhost:5432/sca python -m data_pipeline.enrich_movies

# 3. Build precomputed analytics tables (fast O(1) reads for the API)
DATABASE_URL=postgresql://sca:sca@localhost:5432/sca python -m data_pipeline.build_analytics_tables
```

### Pipeline options

```bash
# Ingest only Telugu actors, limit to 50 movies for testing
python -m data_pipeline.ingest_all_actors --industry Telugu --limit 50

# Dry-run enrichment (no DB writes) with 4 parallel workers
python -m data_pipeline.enrich_movies --dry-run --workers 4

# Refresh materialized views after ingestion
python -m data_pipeline.refresh_analytics_views
```

---

## Starting the API server

```bash
cd backend
DATABASE_URL=postgresql://sca:sca@localhost:5432/sca python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

- **Swagger UI (interactive):** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc

---

## API endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Service status + live actor/movie counts |
| GET | `/actors` | List all actors |
| GET | `/actors/search?q=` | Case-insensitive partial name search (max 20) |
| GET | `/actors/{id}` | Actor profile with precomputed career stats |
| GET | `/actors/{id}/movies` | Filmography ordered newest-first |
| GET | `/actors/{id}/collaborators` | Top co-stars by shared film count |
| GET | `/actors/{id}/directors` | Directors sorted by collaboration count |
| GET | `/actors/{id}/production` | Production companies sorted by film count |
| GET | `/compare?actor1=&actor2=` | Side-by-side career comparison |

### Example responses

**GET /health**
```json
{ "status": "ok", "actors": 13, "movies": 734 }
```

**GET /actors/search?q=raj**
```json
[{ "id": 11, "name": "Rajinikanth" }]
```

**GET /actors/11**
```json
{
  "id": 11,
  "name": "Rajinikanth",
  "industry": "Tamil",
  "film_count": 157,
  "first_film_year": 1957,
  "last_film_year": 2025,
  "avg_runtime": 170.0
}
```

**GET /actors/11/collaborators**
```json
[
  { "actor": "Kamal Haasan", "films": 12 },
  { "actor": "Prabhas", "films": 1 }
]
```

**GET /actors/11/directors**
```json
[
  { "director": "S. P. Muthuraman", "films": 23 },
  { "director": "R. Thyagarajan", "films": 10 }
]
```

**GET /compare?actor1=Rajinikanth&actor2=Kamal Haasan**
```json
{
  "actor1": { "name": "Rajinikanth", "films": 157, "avg_runtime": 170.0, "first_film": 1957, "last_film": 2025 },
  "actor2": { "name": "Kamal Haasan", "films": 174, "avg_runtime": 182.0, "first_film": 1957, "last_film": 2024 }
}
```

---

## Performance

All analytics endpoints read from precomputed tables — no heavy joins at request time.

| Endpoint | Strategy | Typical response |
|---|---|---|
| `/actors/{id}` | PK lookup on `actor_stats` | < 5 ms |
| `/actors/{id}/collaborators` | Index scan on `actor_collaborations` | < 5 ms |
| `/actors/{id}/directors` | Index scan on `actor_director_stats` | < 5 ms |
| `/compare` | Two PK lookups on `actor_stats` | < 5 ms |
| `/actors/{id}/movies` | Index join `cast` → `movies` | < 20 ms |

Rebuild analytics tables after any ingestion run:
```bash
python -m data_pipeline.build_analytics_tables
```
