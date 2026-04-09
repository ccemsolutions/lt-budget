"""
Schedule Preview Service.
Runs only the QuantityEngine (no CPU, no indirect) to compute per-activity
quantities and durations given current project inputs + teams/factors override.
Fast enough to call on every form keystroke (debounced).
"""
from __future__ import annotations
import uuid
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.project import ProjectInputs as ProjectInputsModel
from app.models.static_data import ActivityCatalog
from app.engine.quantity_engine import QuantityEngine
from app.engine.types import ProjectInputs, EngineeringData, SalaryParams


@dataclass
class ActivityScheduleItem:
    code: str
    description: str
    category: str
    unit: str
    quantity: float
    duration_months: float
    start_month: int


async def compute_schedule_preview(
    project_id: uuid.UUID,
    teams_by_activity: dict[str, int],
    productivity_factors: dict[str, float],
    db: AsyncSession,
) -> list[ActivityScheduleItem]:
    # Load saved project inputs
    result = await db.execute(
        select(ProjectInputsModel).where(ProjectInputsModel.project_id == project_id)
    )
    rec = result.scalar_one_or_none()
    if not rec:
        return []

    eng = rec.engineering or {}
    terrain = rec.terrain or {}
    veg = rec.vegetation or {}
    access = rec.access_roads or {}
    schedule = rec.schedule or {}
    sp = rec.salary_params or {}

    working_days = float(sp.get("working_days_per_month", 22))

    start_month_by_category = {
        "Serviços Preliminares": int(schedule.get("start_month_preliminares", 1)),
        "Obras Civis":           int(schedule.get("start_month_civil", 2)),
        "Aterramento":           int(schedule.get("start_month_aterramento", 6)),
        "Montagem de Estruturas":int(schedule.get("start_month_montagem", 8)),
        "Lançamento de Cabos":   int(schedule.get("start_month_lancamento", 12)),
        "Serviços Finais":       int(schedule.get("start_month_finais", 20)),
        "Outros":                1,
    }

    inputs = ProjectInputs(
        line_length_km=float(rec.line_length_km or 0),
        circuit_type=rec.circuit_type or "single",
        total_towers=int(rec.total_towers or 0),
        engineering=EngineeringData(
            guyed_towers=eng.get("guyed_towers", 0),
            self_supporting_towers=eng.get("self_supporting_towers", 0),
            ancoragens=eng.get("ancoragens", 0),
            peso_torres_estaiadas_ton=eng.get("peso_torres_estaiadas_ton", 0),
            peso_torres_ap_ton=eng.get("peso_torres_ap_ton", 0),
            montagem_manual_estaiada_pct=eng.get("montagem_manual_estaiada_pct", 10),
            montagem_manual_ap_pct=eng.get("montagem_manual_ap_pct", 10),
            excavation_tubulao_m3=eng.get("excavation_tubulao_m3", 0),
            excavation_mecanizada_m3=eng.get("excavation_mecanizada_m3", 0),
            excavation_solo_fraco_m3=eng.get("excavation_solo_fraco_m3", 0),
            excavation_manual_m3=eng.get("excavation_manual_m3", 0),
            excavation_rocha_m3=eng.get("excavation_rocha_m3", 0),
            excavation_moledo_m3=eng.get("excavation_moledo_m3", 0),
            reaterro_normal_m3=eng.get("reaterro_normal_m3", 0),
            reaterro_solo_cimento_m3=eng.get("reaterro_solo_cimento_m3", 0),
            reaterro_solo_emprestimo_m3=eng.get("reaterro_solo_emprestimo_m3", 0),
            concrete_usinado_m3=eng.get("concrete_usinado_m3", 0),
            concrete_canteiro_m3=eng.get("concrete_canteiro_m3", 0),
            concrete_manual_m3=eng.get("concrete_manual_m3", 0),
            concrete_premoldado_m3=eng.get("concrete_premoldado_m3", 0),
            concrete_premoldado_pecas=eng.get("concrete_premoldado_pecas", 0),
            rebar_ton=eng.get("rebar_ton", 0),
            chumbadores_ton=eng.get("chumbadores_ton", 0),
            grampo_u_un=eng.get("grampo_u_un", 0),
            tubulao_tr=eng.get("tubulao_tr", 0),
            chumbadores_m=eng.get("chumbadores_m", 0),
            estai_ancorado_rocha_m=eng.get("estai_ancorado_rocha_m", 0),
            viga_l_m=eng.get("viga_l_m", 0),
            estacas_aco_m=eng.get("estacas_aco_m", 0),
            estacas_concreto_m=eng.get("estacas_concreto_m", 0),
            estacas_escavadas_m=eng.get("estacas_escavadas_m", 0),
            estacas_raiz_m=eng.get("estacas_raiz_m", 0),
            helicoidais_m=eng.get("helicoidais_m", 0),
            contrapeso_m=eng.get("contrapeso_m", 0),
            perfuracao_m=eng.get("perfuracao_m", 0),
            defensas_concreto_tr=eng.get("defensas_concreto_tr", 0),
            poco_profundo_m=eng.get("poco_profundo_m", 0),
        ),
        terrain_flat_pct=terrain.get("flat_pct", 0),
        terrain_undulating_pct=terrain.get("undulating_pct", 0),
        terrain_steep_pct=terrain.get("steep_pct", 0),
        terrain_mountainous_pct=terrain.get("mountainous_pct", 0),
        vegetation_agriculture_pct=veg.get("agriculture_pct", 0),
        vegetation_light_forest_pct=veg.get("light_forest_pct", 0),
        vegetation_heavy_forest_pct=veg.get("heavy_forest_pct", 0),
        vegetation_reforestation_pct=veg.get("reforestation_pct", 0),
        vegetation_open_pct=veg.get("open_pct", 0),
        new_roads_km=float(access.get("new_roads_km", 0)),
        maintenance_km=float(access.get("maintenance_km", 0)),
        swamp_estivas_km=float(access.get("swamp_estivas_km", 0)),
        total_duration_months=int(schedule.get("total_duration_months", 24)),
        start_month_by_category=start_month_by_category,
        teams_by_activity=teams_by_activity,
        productivity_factors=productivity_factors,
        salary=SalaryParams(
            hours_per_month=float(sp.get("hours_per_month", 220)),
            working_days_per_month=working_days,
        ),
    )

    # Load activities (code + formula + productivity only)
    act_result = await db.execute(
        select(ActivityCatalog)
        .where(ActivityCatalog.is_active == True)
        .order_by(ActivityCatalog.sort_order)
    )
    catalog = act_result.scalars().all()

    qty_engine = QuantityEngine()
    items: list[ActivityScheduleItem] = []

    for act in catalog:
        quantity = qty_engine.resolve(act.quantity_formula, inputs)
        if quantity <= 0:
            continue

        teams = teams_by_activity.get(act.code, 1)
        factor = productivity_factors.get(act.code, 1.0)
        adopted = float(act.productivity_per_day) * factor

        if teams > 0 and adopted > 0:
            duration = quantity / (teams * working_days * adopted)
        else:
            duration = 0.0

        start_month = start_month_by_category.get(act.category, 1)

        items.append(ActivityScheduleItem(
            code=act.code,
            description=act.description,
            category=act.category,
            unit=act.unit,
            quantity=round(quantity, 3),
            duration_months=round(duration, 2),
            start_month=start_month,
        ))

    return items
