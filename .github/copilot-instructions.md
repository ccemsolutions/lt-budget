# LT Budget Project Guidelines

## Architecture

This is a full-stack application with FastAPI backend, React frontend, and PostgreSQL database, containerized with Docker Compose.

### Backend (Python/FastAPI)
- Async FastAPI with SQLAlchemy ORM and asyncpg driver
- Multi-tenancy: Company-scoped users and projects
- Calculation engine: Idempotent pipeline for quantity resolution, cost computation, and summaries
- Auth: JWT-based with roles (admin|editor|viewer)
- Cost components: mo (labor), vem (equipment), mat (materials), sub (subcontracts), fd (freight/dispatch)
- Categories: 6 Portuguese work phases (Preliminares, Civis, Aterramento, Montagem, Lançamento, Finais)

### Frontend (React/TypeScript)
- React 18 + TypeScript on Vite, with React Router, Zustand for auth, TanStack Query for server state
- Forms: React Hook Form + Zod, deeply nested ProjectInputs structure
- Auto-polling: Budget status polled every 2s during calculation

### Infrastructure
- Docker Compose for development: PostgreSQL, backend, frontend services
- Alembic for migrations (dev auto-creates tables)
- Auto-seeding from JSON fixtures on startup

## Build and Test

### Development Setup
Run `docker-compose up` from `infrastructure/` to start full stack with hot-reload.

### Backend
- Dev server: `uvicorn app.main:app --reload` (port 8000)
- Test: `pytest` (test suite currently empty)
- Migrations: Alembic configured

### Frontend
- Dev: `npm run dev` (proxies `/api` to backend)
- Build: `npm run build`
- Preview: `npm run preview`

### Database
- First-run creates tables automatically (dev only); use Alembic for production
- Reference data seeded from `backend/fixtures/` JSON files

## Conventions

- **Naming**: PascalCase for React components, Portuguese labels in UI, English in code
- **Data Types**: UUIDs for IDs, Numeric for financial precision, JSONB for flexible inputs
- **Status Enums**: Projects (draft|calculated|approved), Budgets (calculating|ready|error)
- **API**: `/api/v1` endpoints, JWT Bearer auth
- **Forms**: Use FormProvider for nested forms, DEFAULT_INPUTS for initialization
- **Salary Params**: encargos_pct=91, hours_per_month=220, working_days_per_month=22

## Code Style

- Backend: Follow FastAPI/SQLAlchemy patterns; async/await for database operations
- Frontend: TypeScript strict mode off (noUnusedLocals: false); Tailwind for styling
- Imports: Relative paths within modules

## Potential Pitfalls

- **JWT_SECRET**: Change from default "change-me-in-production"
- **CORS**: Hardcoded to localhost; adjust for production
- **WeasyPrint**: Requires system dependencies in Docker
- **No tests**: Empty test directories
- **Auto-polling**: May miss updates if timeout
- **Database**: Dev mode skips migrations; use Alembic in production