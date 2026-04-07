"""
Composição de Preços Unitários (CPU):
Computes cost per unit of activity broken down into MO, VEM, MAT, SUB, FD.
"""
from __future__ import annotations

from app.engine.types import (
    ActivityData, ProjectInputs, LaborRoleData, EquipmentItemData, ResourceItem
)


class CPUEngine:
    def __init__(
        self,
        labor_roles: dict[str, LaborRoleData],   # role_code -> LaborRoleData
        equipment: dict[str, EquipmentItemData],  # equipment_code -> EquipmentItemData
    ):
        self._labor = labor_roles
        self._equipment = equipment

    def compute(
        self,
        activity: ActivityData,
        quantity: float,
        teams: int,
        duration_months: float,
        params: ProjectInputs,
    ) -> tuple[float, float, float, float, float]:
        """
        Returns (mo_per_unit, vem_per_unit, mat_per_unit, sub_per_unit, fd_per_unit)
        All in R$ per activity unit.
        """
        if quantity <= 0 or teams <= 0:
            return 0.0, 0.0, 0.0, 0.0, 0.0

        mo_total = 0.0
        vem_total = 0.0
        mat_total = 0.0
        sub_total = 0.0

        working_days = duration_months * params.salary.working_days_per_month

        for res in activity.resources:
            if res.resource_type == "MO":
                role = self._labor.get(res.role_code)
                if role and role.company_cost_hh > 0:
                    # people_total = qty_per_team * teams (people-days) * hours_per_day
                    people_total_hh = (
                        res.qty_per_team
                        * working_days
                        * (params.salary.hours_per_month / params.salary.working_days_per_month)
                    )
                    mo_total += role.company_cost_hh * people_total_hh

            elif res.resource_type == "VEM":
                equip = self._equipment.get(res.equipment_code)
                if equip and equip.company_cost_daily > 0:
                    # qty_per_team units for duration_months
                    total_equipment_days = res.qty_per_team * working_days
                    vem_total += equip.company_cost_daily * total_equipment_days

            elif res.resource_type == "MAT":
                if res.material_unit_price > 0 and res.material_qty_per_unit > 0:
                    mat_total += res.material_qty_per_unit * res.material_unit_price * quantity

            elif res.resource_type == "SUB":
                if res.subcontractor_cost_per_unit > 0:
                    sub_total += res.subcontractor_cost_per_unit * quantity

        if quantity > 0:
            mo_per_unit = mo_total / quantity
            vem_per_unit = vem_total / quantity
            mat_per_unit = mat_total / quantity
            sub_per_unit = sub_total / quantity
        else:
            mo_per_unit = vem_per_unit = mat_per_unit = sub_per_unit = 0.0

        # Ferramentas Diversas: % of MO cost per unit
        fd_per_unit = mo_per_unit * activity.fd_pct

        return mo_per_unit, vem_per_unit, mat_per_unit, sub_per_unit, fd_per_unit
