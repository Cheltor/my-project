# AI agent quick-start for this codebase
## AI agent quick-start — CiviCode (concise)

Purpose: give an AI coding agent immediate, practical context to make safe, small, high-value edits across the FastAPI backend and React frontend.

Big picture (one line each):
- Backend: FastAPI app at `FastAPI/CiviCodeAPI` (entry: `main.py`, routers in `routes/`, models in `models.py`).
- Frontend: Create React App in `my-project/` (services in `my-project/src/Services`, entry `src/index.js`).
- Data: Postgres via SQLAlchemy; migrations in `FastAPI/alembic/`.
- Media/Storage: Azure Blob via `FastAPI/CiviCodeAPI/storage.py` + `media_service.py` for HEIC/MOV conversions.

Quick start (files to open first):
- `FastAPI/CiviCodeAPI/main.py` — app wiring, CORS, router registration.
- `FastAPI/CiviCodeAPI/database.py` — DB URL normalization, `get_db()` dependency.
- `FastAPI/CiviCodeAPI/models.py`, `schemas.py` — canonical data shapes.
- `FastAPI/CiviCodeAPI/routes/<feature>.py` — individual feature handlers.
- `my-project/src/Services/api.js` — centralized axios instance and auth header behavior.

Run & test (most common commands):
- Backend dev (from `FastAPI/`): `uvicorn CiviCodeAPI.main:app --host 0.0.0.0 --port 8000 --reload`.
- Frontend dev (from `my-project/`): `npm start`.
- Backend tests (from `FastAPI/`): `pytest` (fixtures override DB for isolated runs).
- DB migrations: `alembic revision --autogenerate -m "..."` then `alembic upgrade head`.

Project-specific conventions (do these):
- Router pattern: add `APIRouter` in `routes/<x>.py`, export in `routes/__init__.py`, then include in `main.py`.
- DB access: always use `Depends(get_db)` in routes; prefer returning Pydantic schemas from `schemas.py`.
- Media: use `media_service.ensure_blob_browser_safe` and `storage.py` helpers — do not instantiate Blob clients ad-hoc.
- Auth: frontend reads token from `localStorage`; backend expects `Authorization: Bearer <token>`.

Integration & gotchas to watch for:
- Env vars: backend loads `.env.development`/`.env` in `FastAPI/`; frontend reads `REACT_APP_*` vars in `my-project/`.
- FFmpeg is required for video conversion (Aptfile/Procfile mention). Tests may mock conversion helpers.
- `database.py` rewrites `postgres://` → `postgresql+psycopg2://` and appends SSL on dynos — changing it affects deployments.

Small actionable examples (copy/paste targets):
- To add a new API: create `FastAPI/CiviCodeAPI/routes/foos.py` with `router=APIRouter(prefix='/foos')`, export and include in `main.py`.
- To call backend from React: use `my-project/src/Services/api.js` axios instance (it uses `REACT_APP_API_URL`).

When unsure, open `FastAPI/CiviCodeAPI/main.py` then the matching `routes/<feature>.py` and `models.py` to see DB shape and side effects. After edits, run the backend tests (`pytest`) and start the frontend to verify integration.

If anything here is unclear or you'd like more examples (e.g., sample PR format, preferred commit message style, or specific testing snippets), tell me which area to expand.
