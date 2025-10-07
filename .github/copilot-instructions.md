# AI agent quick-start for this codebase

This workspace is a full-stack app with a FastAPI backend (under `FastAPI/CiviCodeAPI`) and a React frontend (under `my-project`). These notes capture the specific architecture, workflows, and conventions used here so agents can be productive fast.

## Architecture and data flow
- Backend: FastAPI app in `FastAPI/CiviCodeAPI/main.py` including multiple routers from `CiviCodeAPI/routes/*`. CORS is open to `*`.
- Routers: Each domain (addresses, users, businesses, violations, comments, citations, inspections, codes, licenses, dashboard, permits, SIR, notifications, word_templates) defines an `APIRouter` in its file and is re-exported via `routes/__init__.py`, then registered in `main.py`.
- Persistence: SQLAlchemy models in `CiviCodeAPI/models.py` use declarative base and explicit relationships with cascades (e.g., `Address` → `Inspections`, `Violations`, `Businesses`). Tables are created via `Base.metadata.create_all(bind=engine)` in `main.py` for local dev.
- Database config: `CiviCodeAPI/database.py` loads `.env.development` or `.env` (unless on Heroku) and resolves `DATABASE_URL` (normalizes `postgres://` → `postgresql+psycopg2://`; adds `sslmode=require` on dynos). Session factory `SessionLocal` and `get_db()` dependency provided.
- Storage/Media: Azure Blob via `CiviCodeAPI/storage.py` (`container_client`) and helpers in `image_utils.py`, `video_utils.py`, `media_service.py`. `word_templates` router exposes document templating endpoints.
- Frontend: CRA React app. API calls go through `src/Services/api.js` which creates an axios instance using `process.env.REACT_APP_API_URL` and attaches `Authorization: Bearer <token>` from `localStorage`.

## Run, build, and test
- Backend dev server (from `FastAPI/CiviCodeAPI/`): `uvicorn main:app --host 0.0.0.0 --port 8000`.
- Frontend dev server (from `my-project/`): `npm start`.
- Frontend tests: `npm test` (React Testing Library preconfigured).
- Backend tests: `pytest` in `FastAPI/CiviCodeAPI` (see `pytest.ini` and `tests/`).
- Env files: Place backend secrets in `FastAPI/.env.development` or `FastAPI/.env`; CRA env in `my-project/.env` using `REACT_APP_*` keys. Example: `REACT_APP_API_URL=http://localhost:8000`.
- Alembic: Migrations live in `FastAPI/alembic/` with versions under `alembic/versions`. Use Alembic for schema evolution in non-local environments.

## Conventions and patterns
- Router wiring: When adding a new route module:
  1) Create `CiviCodeAPI/routes/<feature>.py` with `router = APIRouter(prefix="/<feature>")`.
  2) Export it from `routes/__init__.py`.
  3) Register in `main.py` via `app.include_router(<feature>_router)`.
- DB access: Prefer `Depends(get_db)` from `database.py` in route handlers. Return Pydantic schemas from `schemas.py` when present; otherwise, ensure JSON-serializable responses.
- Auth: Axios attaches a `Bearer` token from `localStorage`. Backend has `fastapi-users` in requirements and a `users` router; check `routes/users.py` for auth flows when calling protected endpoints.
- Cross-component contract: Frontend expects consistent base URLs and JSON shapes. If you change a route path or payload, update `src/Services/*` consumers and any components using them.
- Media/Blobs: When dealing with uploads, use the storage helpers (`storage.py`, `media_service.py`) rather than calling Azure SDK directly.

## Integration examples
- Frontend service pattern (`src/Services/api.js`): centralized axios instance logs base URL and injects `Authorization` from `localStorage`.
- Typical backend handler: `@router.get("/addresses/{id}")` obtains a DB session via `Depends(get_db)` and returns ORM data mapped to schemas.

## Troubleshooting tips
- If frontend 401s: ensure a valid token in `localStorage`; check CORS config (open by default) and `REACT_APP_API_URL`.
- If DB connection fails: verify `FastAPI/.env.development` has a valid `DATABASE_URL` (Postgres), or that the default local URL matches your environment. Heroku dynos require SSL; the helper adds `sslmode=require`.
- CRA build/start issues: confirm `react-scripts` v5 is installed and Node is supported; Tailwind config is present in `tailwind.config.js`.

## Where to look
- Backend entry: `FastAPI/CiviCodeAPI/main.py`; routers: `FastAPI/CiviCodeAPI/routes/`; models: `FastAPI/CiviCodeAPI/models.py`.
- Backend config: `FastAPI/CiviCodeAPI/database.py`, `FastAPI/CiviCodeAPI/config.py`, env files in `FastAPI/`.
- Frontend entry: `my-project/src/index.js`; routing/components in `src/Layouts`, `src/Components`, services in `src/Services`.
