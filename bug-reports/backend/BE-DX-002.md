# BE-DX-002 — Backend startup (`app.main:startup`) is PostgreSQL-only; cannot run without Postgres

**Severity:** Medium (blocks local E2E testing without Docker or a PostgreSQL service)
**Component:** `app/main.py:78–132` (the `startup()` event handler)
**Status:** Partially mitigated — QA added try/except guards around the PG-specific SQL so the server no longer crashes on startup with SQLite, but SQLite is still unusable for runtime because the ORM uses many PostgreSQL-only features (`now()`, `TIMESTAMPTZ`, `UUID` type, `ADD COLUMN IF NOT EXISTS`). Full E2E runs require a real PostgreSQL instance.

## Summary

The `startup()` event handler runs three blocks of hard-coded PostgreSQL SQL:

1. `ALTER TABLE tracks ADD COLUMN created_at TIMESTAMPTZ DEFAULT now()` — `TIMESTAMPTZ` and `now()` are PG-specific. SQLite returns `OperationalError: unknown function: now()` when inserting a row that triggers the column default.
2. `ALTER TABLE tracks ADD COLUMN IF NOT EXISTS album_id UUID REFERENCES albums(album_id)` — `UUID` type and `IF NOT EXISTS` on `ALTER TABLE` are PG-specific.
3. `CREATE EXTENSION IF NOT EXISTS pg_trgm` + three GIN indexes — PG-only.

When block 3 was reached the server exited during startup, making it impossible to start the backend locally with SQLite for E2E testing.

## Impact on QA

- `npm run test:e2e:real` requires a running backend (Playwright global-setup hits `/api/auth/register`).
- Developers without Docker Desktop running or a local Postgres service cannot run the real-API Playwright suite at all.
- Docker is the most practical solution; the team should supply a `docker-compose.yml` (or `compose.yaml`) so any contributor can bring up Postgres + the API with a single command.

## QA workaround applied (`app/main.py`)

Added try/except around all three PG-specific blocks so the server at least starts on SQLite. The GIN index block is silently skipped; the `ALTER TABLE` blocks are also silenced. This does **not** make SQLite a working backend — the ORM still fails at the INSERT level (`now()` in `server_default`, PostgreSQL `UUID` dialect). These guards exist only to prevent startup crashes during local experiments.

## Suggested fix

1. Add a `docker-compose.yml` at the project root (or `Backend/docker-compose.yml`) with a `postgres:16-alpine` service and the `fastapi` service wired to it.
2. Update the README with:
   ```bash
   docker compose up          # starts Postgres + FastAPI
   npm run test:e2e:real      # from Frontend/media/
   ```
3. (Optional) Replace hard-coded `ALTER TABLE` migrations with Alembic migrations so the startup event doesn't need dialect-specific SQL at all.

## Verification

```bash
# Without PG:
DATABASE_URL=sqlite:///./dev.db SECRET_KEY=test AUTO_CREATE_TABLES=true \
  uvicorn app.main:app --app-dir Backend
# → OperationalError: near "EXTENSION": syntax error   (before QA mitigation)
# → starts OK but INSERT fails: unknown function: now()   (after QA mitigation)
```
