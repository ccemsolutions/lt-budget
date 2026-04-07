from __future__ import annotations
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models import *  # noqa: F401 - ensure all models are loaded
from app.database import Base
from app.api.v1.router import api_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (dev only; use Alembic migrations in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Auto-seed reference data if tables are empty
    from app.database import AsyncSessionLocal
    from app.services.seed_service import seed_all
    async with AsyncSessionLocal() as db:
        counts = await seed_all(db)
        if any(v > 0 for v in counts.values()):
            print(f"Seeded reference data: {counts}")

    yield


app = FastAPI(
    title="LT Budget SaaS",
    description="Plataforma de Orçamentos para Linhas de Transmissão",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}
