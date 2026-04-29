# BE-DX-001 — Strict env config breaks pytest at import without `DATABASE_URL`/`SECRET_KEY`

**Severity:** Info (developer experience / CI friction)
**Component:** `app/core/config.py:10-11`
**Status:** Open (raised during `tests/be-qa` post-merge run)

## Summary

After the recent merge of `feature/be-payment` and `feature/admin-panel`, `app/core/config.py` switched from `os.environ.get(...)` (with implicit `None`/empty defaults) to strict `os.environ[...]` lookups for `DATABASE_URL` and `SECRET_KEY`:

```python
DATABASE_URL = os.environ["DATABASE_URL"]
SECRET_KEY = os.environ["SECRET_KEY"]
```

Tests under `tests/api/conftest.py` import `app.core.security`, which imports `app.core.config` at module-import time. Without these env vars set, **pytest cannot even collect the test suite**:

```
ImportError while loading conftest 'tests/api/conftest.py'.
KeyError: 'DATABASE_URL'
```

## Why this matters

- New contributors and CI runners now need to set env vars even for tests that use in-memory SQLite via `StaticPool`. The values aren't actually used by the test DB session, but their absence prevents collection.
- The existing GitHub workflow `.github/workflows/backend.yml` does set these in the matrix but local devs must remember to do so. Easy footgun.

## Workaround currently in use

```bash
DATABASE_URL=sqlite:///./test.db SECRET_KEY=test pytest tests/api tests/unit
```

## Suggested fix (pick one)

**Option A — autouse fixture in `conftest.py`** (zero footprint outside tests):

```python
# tests/conftest.py (top-level)
import os, pytest

@pytest.fixture(scope="session", autouse=True)
def _set_default_env():
    os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
    os.environ.setdefault("SECRET_KEY", "test-secret-key")
```

**Option B — relax `config.py` for the test scenario**:

```python
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./test.db")
SECRET_KEY = os.environ.get("SECRET_KEY", "test-secret")
```

Production deployments still set these via `.env` / secrets, so the defaults only ever apply locally.

**Option C — `.env.test`** loaded by an early `load_dotenv` if present:

```python
if Path(".env.test").exists() and os.environ.get("PYTEST_CURRENT_TEST"):
    load_dotenv(".env.test")
```

## Note

This is not a runtime bug — production behaviour is correct. Filed as DX so the team can decide whether tightening is intentional or accidental.
