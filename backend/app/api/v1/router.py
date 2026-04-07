from __future__ import annotations
from fastapi import APIRouter
from app.api.v1 import auth, projects, budgets, reports

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(budgets.router, prefix="/budgets", tags=["Budgets"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
