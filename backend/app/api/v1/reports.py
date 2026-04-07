from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.project import Budget
from app.models.tenant import User
from app.services.report_service import generate_pdf

router = APIRouter()


@router.get("/{budget_id}/pdf")
async def export_pdf(
    budget_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    budget = await db.get(Budget, budget_id)
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    if budget.status != "ready":
        raise HTTPException(status_code=400, detail="Budget is not ready yet")

    content = await generate_pdf(budget_id, db)

    # Detect if WeasyPrint was available (PDF magic bytes) or HTML fallback
    is_pdf = content[:4] == b"%PDF"
    media_type = "application/pdf" if is_pdf else "text/html; charset=utf-8"
    filename = f"orcamento_R{budget.version}.pdf" if is_pdf else f"orcamento_R{budget.version}.html"

    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
