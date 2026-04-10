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
        # Add new columns that may not exist in older DB instances
        migrations = [
            "ALTER TABLE project_inputs ADD COLUMN IF NOT EXISTS indirect_config JSONB DEFAULT '{}'",
            "ALTER TABLE project_inputs ADD COLUMN IF NOT EXISTS financial_params JSONB DEFAULT '{}'",
            "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS total_indirect_cost NUMERIC(18,4)",
            "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS total_cost NUMERIC(18,4)",
            "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS selling_price NUMERIC(18,4)",
            "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS gross_margin NUMERIC(8,4)",
            "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS max_exposure NUMERIC(18,4)",
            "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS hh_per_km NUMERIC(10,2)",
            "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS hh_per_tower NUMERIC(10,2)",
            "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS cost_per_hh NUMERIC(14,4)",
            "ALTER TABLE budgets ADD COLUMN IF NOT EXISTS hh_per_ton NUMERIC(10,4)",
            "ALTER TABLE project_inputs ADD COLUMN IF NOT EXISTS state VARCHAR(2) DEFAULT ''",
            "ALTER TABLE project_inputs ADD COLUMN IF NOT EXISTS crossings JSONB DEFAULT '{}'",
            # BD_MO — new columns
            "ALTER TABLE labor_roles ADD COLUMN IF NOT EXISTS dissidio NUMERIC(14,4) DEFAULT 0",
            "ALTER TABLE labor_roles ADD COLUMN IF NOT EXISTS adic_transf NUMERIC(14,4) DEFAULT 0",
            "ALTER TABLE labor_roles ADD COLUMN IF NOT EXISTS periculosidade_val NUMERIC(14,4) DEFAULT 0",
            "ALTER TABLE labor_roles ADD COLUMN IF NOT EXISTS subtotal_sem_he NUMERIC(14,4) DEFAULT 0",
            "ALTER TABLE labor_roles ADD COLUMN IF NOT EXISTS adic_produtividade NUMERIC(14,4) DEFAULT 0",
            "ALTER TABLE labor_roles ADD COLUMN IF NOT EXISTS custo_admissao NUMERIC(14,4) DEFAULT 0",
            "ALTER TABLE labor_roles ADD COLUMN IF NOT EXISTS desp_folga NUMERIC(14,4) DEFAULT 0",
            # BD_VEM — new columns
            "ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS preco_combustivel NUMERIC(10,4) DEFAULT 0",
            "ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS lavagem_mes NUMERIC(14,4) DEFAULT 0",
            "ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS lubrificantes_mes NUMERIC(14,4) DEFAULT 0",
            "ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS manutencao_pct NUMERIC(8,4) DEFAULT 0",
            # Company base params — seed singleton row if table just created
            """INSERT INTO company_base_params (id, default_alimentacao, default_cesta_basica,
                default_transporte, default_epi, default_seguro_vida, default_ppr,
                default_assist_medica, default_aux_moradia, ot_50_horas_mes,
                ot_100_horas_mes, working_days_per_month,
                preco_diesel, preco_gasolina, preco_alcool, updated_at)
               SELECT gen_random_uuid(), 1350, 308, 0, 235, 0, 0, 0, 0, 40, 8, 25,
                      6.50, 6.00, 4.50, NOW()
               WHERE NOT EXISTS (SELECT 1 FROM company_base_params LIMIT 1)""",
        ]
        for sql in migrations:
            await conn.execute(__import__("sqlalchemy").text(sql))

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
