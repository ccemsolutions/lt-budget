"""
Maps each activity code to its quantity derivation formula.
Each formula resolves a float quantity from the ProjectInputs.
"""
from __future__ import annotations

from app.engine.types import ProjectInputs

# Registry: activity_code -> resolver function
FORMULA_REGISTRY: dict[str, callable] = {}


def register(code: str):
    def decorator(fn):
        FORMULA_REGISTRY[code] = fn
        return fn
    return decorator


# ─── Serviços Preliminares ─────────────────────────────────────────────────────

@register("P1")  # Conferência de perfil (km)
def _p1(p: ProjectInputs) -> float:
    return p.line_length_km

@register("P2")  # Locação de torres (torre)
def _p2(p: ProjectInputs) -> float:
    return float(p.total_towers)

@register("P3")  # Limpeza de faixa em mata (ha)
def _p3(p: ProjectInputs) -> float:
    heavy_forest_km = p.line_length_km * p.vegetation_heavy_forest_pct / 100
    reforestation_km = p.line_length_km * p.vegetation_reforestation_pct / 100
    return (heavy_forest_km + reforestation_km) * 0.04 * 0.3  # simplificado

@register("P4")  # Limpeza em capoeira/agricultura (ha)
def _p4(p: ProjectInputs) -> float:
    agri_km = p.line_length_km * p.vegetation_agriculture_pct / 100
    light_km = p.line_length_km * p.vegetation_light_forest_pct / 100
    return (agri_km + light_km) * 0.25

@register("P5")  # Construção de acessos em terreno plano (km)
def _p5(p: ProjectInputs) -> float:
    flat_factor = (p.terrain_flat_pct + p.terrain_undulating_pct) / 100
    return p.new_roads_km * flat_factor

@register("P6")  # Construção de acessos em terreno acidentado (km)
def _p6(p: ProjectInputs) -> float:
    rough_factor = (p.terrain_steep_pct + p.terrain_mountainous_pct) / 100
    return p.new_roads_km * rough_factor

@register("P7")  # Manutenção de acessos (mês)
def _p7(p: ProjectInputs) -> float:
    if p.maintenance_km == 0:
        return 0
    return p.total_duration_months * (p.maintenance_km / 25)  # 1 equipe por 25km/mês

@register("P8")  # Instalação de placas de sinalização (torre)
def _p8(p: ProjectInputs) -> float:
    return float(p.total_towers)

@register("P9")  # Construção de estivas (m)
def _p9(p: ProjectInputs) -> float:
    return p.swamp_estivas_km * 1000

@register("P10")
def _p10(p: ProjectInputs) -> float:
    return 0

@register("P11")
def _p11(p: ProjectInputs) -> float:
    return 0

# ─── Obras Civis ──────────────────────────────────────────────────────────────

@register("C1")  # Escavação perfuratriz tubulão (m³)
def _c1(p: ProjectInputs) -> float:
    return p.engineering.excavation_tubulao_m3

@register("C2")  # Escavação mecanizada sapata (m³)
def _c2(p: ProjectInputs) -> float:
    return p.engineering.excavation_mecanizada_m3

@register("C3")  # Escavação solo fraco (m³)
def _c3(p: ProjectInputs) -> float:
    return p.engineering.excavation_solo_fraco_m3

@register("C4")  # Escavação manual martelo (m³)
def _c4(p: ProjectInputs) -> float:
    return p.engineering.excavation_manual_m3

@register("C5")  # Concreto usinado no canteiro (m³)
def _c5(p: ProjectInputs) -> float:
    return 0  # optional

@register("C6")  # Perfuração tirante rocha (m)
def _c6(p: ProjectInputs) -> float:
    return p.engineering.chumbadores_m * 0.5  # estimado

@register("C7")  # Encapsulamento haste estai (m)
def _c7(p: ProjectInputs) -> float:
    return p.engineering.contrapeso_m

@register("C8")  # Chumbadores em rocha (m)
def _c8(p: ProjectInputs) -> float:
    return p.engineering.chumbadores_m

@register("C9")  # Cravação estacas aço (m)
def _c9(p: ProjectInputs) -> float:
    return p.engineering.estacas_aco_m

@register("C10")  # Estacas escavadas (m)
def _c10(p: ProjectInputs) -> float:
    return 0

@register("C11")  # Estacas raiz (m)
def _c11(p: ProjectInputs) -> float:
    return p.engineering.estacas_raiz_m

@register("C12")  # Ensaio PDA (ensaio)
def _c12(p: ProjectInputs) -> float:
    return 0

@register("C13")  # Hastes helicoidais fornecimento (m)
def _c13(p: ProjectInputs) -> float:
    return 0

@register("C14")  # Hastes helicoidais instalação (m)
def _c14(p: ProjectInputs) -> float:
    return p.engineering.helicoidais_m

@register("C15")  # Ensaio hastes helicoidais (haste)
def _c15(p: ProjectInputs) -> float:
    return p.engineering.helicoidais_m / 10 if p.engineering.helicoidais_m else 0

@register("C16")  # Fornecimento aço CA-50 (kg)
def _c16(p: ProjectInputs) -> float:
    return p.engineering.rebar_ton * 1000

@register("C17")  # Corte, dobra e armação (kg)
def _c17(p: ProjectInputs) -> float:
    return p.engineering.rebar_ton * 1000

@register("C18")  # Escavação mecanizada moledo (m³)
def _c18(p: ProjectInputs) -> float:
    return p.engineering.excavation_moledo_m3

@register("C19")  # Fornecimento formas metálicas tubulão (torre)
def _c19(p: ProjectInputs) -> float:
    return float(p.engineering.guyed_towers)

@register("C20")  # Estacas concreto (m)
def _c20(p: ProjectInputs) -> float:
    return p.engineering.estacas_concreto_m

@register("C21")  # Transporte/instalação formas (torre)
def _c21(p: ProjectInputs) -> float:
    return float(p.total_towers)

@register("C22")  # Pré-moldados no canteiro (m³)
def _c22(p: ProjectInputs) -> float:
    return p.engineering.concrete_premoldado_m3

@register("C23")  # Transporte pré-moldados (peça)
def _c23(p: ProjectInputs) -> float:
    return p.engineering.concrete_premoldado_m3 / 0.33 if p.engineering.concrete_premoldado_m3 else 0

@register("C24")  # Instalação blocos pré-moldados (peça)
def _c24(p: ProjectInputs) -> float:
    return p.engineering.concrete_premoldado_m3 / 0.33 if p.engineering.concrete_premoldado_m3 else 0

@register("C25")  # Nivelamento stubs tubulão (pé) apenas para torres autoportantes
def _c25(p: ProjectInputs) -> float:
    return float(p.engineering.self_supporting_towers) * 4

@register("C26")  # Nivelamento stubs sapata (pé)
def _c26(p: ProjectInputs) -> float:
    return float(p.engineering.self_supporting_towers) * 4

@register("C27")  # Transporte agregados (m³)
def _c27(p: ProjectInputs) -> float:
    return p.engineering.concrete_canteiro_m3 + p.engineering.concrete_manual_m3

@register("C28")  # Concretagem manual (m³)
def _c28(p: ProjectInputs) -> float:
    return p.engineering.concrete_manual_m3

@register("C29")  # Concretagem usinada in loco (m³)
def _c29(p: ProjectInputs) -> float:
    return p.engineering.concrete_usinado_m3

@register("C30")  # Reaterro solo nativo (m³)
def _c30(p: ProjectInputs) -> float:
    return (p.engineering.excavation_tubulao_m3 + p.engineering.excavation_mecanizada_m3) * 0.6

@register("C31")  # Reaterro solo transportado (m³)
def _c31(p: ProjectInputs) -> float:
    return p.engineering.excavation_solo_fraco_m3 * 0.8

@register("C32")  # Reaterro solo-cimento (m³)
def _c32(p: ProjectInputs) -> float:
    return p.engineering.excavation_solo_fraco_m3 * 0.3

@register("C33")  # Formas de madeira (m²)
def _c33(p: ProjectInputs) -> float:
    return (p.engineering.concrete_canteiro_m3 + p.engineering.concrete_usinado_m3) * 3.0

@register("C34")
def _c34(p: ProjectInputs) -> float:
    return 0

# ─── Aterramento ──────────────────────────────────────────────────────────────

@register("A1")  # Aterramento em poço profundo (m)
def _a1(p: ProjectInputs) -> float:
    return 0

@register("A2")  # Instalação contrapeso/resistência (m)
def _a2(p: ProjectInputs) -> float:
    return p.engineering.contrapeso_m if p.engineering.contrapeso_m else p.line_length_km * 750

@register("A3")
def _a3(p: ProjectInputs) -> float:
    return 0

# ─── Montagem de Estruturas ───────────────────────────────────────────────────

@register("E1")  # Pátio de estruturas (mês)
def _e1(p: ProjectInputs) -> float:
    return p.total_duration_months * 0.8

@register("E2")  # Transporte de estruturas (ton)
def _e2(p: ProjectInputs) -> float:
    # Average 4.7 ton/tower
    return p.total_towers * 4.7

@register("E3")  # Corte cabos de estai (torre)
def _e3(p: ProjectInputs) -> float:
    return float(p.engineering.guyed_towers)

@register("E4")  # Montagem torre estaiada no solo (ton)
def _e4(p: ProjectInputs) -> float:
    # Guyed towers average 2.86 ton
    return p.engineering.guyed_towers * 2.86

@register("E5")  # Içamento torre estaiada monomastro 230kV (torre)
def _e5(p: ProjectInputs) -> float:
    return float(p.engineering.guyed_towers) * 0.9

@register("E6")  # Içamento torre estaiada cross rope (torre)
def _e6(p: ProjectInputs) -> float:
    return float(p.engineering.guyed_towers) * 0.9

@register("E7")  # Montagem manual torre estaiada (ton)
def _e7(p: ProjectInputs) -> float:
    return p.engineering.guyed_towers * 0.31

@register("E8")  # Nivelamento/tensionamento estaiada (torre)
def _e8(p: ProjectInputs) -> float:
    return float(p.engineering.guyed_towers)

@register("E9")  # Revisão torre estaiada (torre)
def _e9(p: ProjectInputs) -> float:
    return float(p.engineering.guyed_towers)

@register("E10")  # Pré-montagem torre AP (ton)
def _e10(p: ProjectInputs) -> float:
    return p.engineering.self_supporting_towers * 8.28

@register("E11")  # Montagem manual torre AP (ton)
def _e11(p: ProjectInputs) -> float:
    return p.engineering.self_supporting_towers * 8.28 * 0.1

@register("E12")  # Montagem com guindaste torre AP (ton)
def _e12(p: ProjectInputs) -> float:
    return p.engineering.self_supporting_towers * 8.28 * 0.9

@register("E13")  # Revisão torre AP (ton)
def _e13(p: ProjectInputs) -> float:
    return p.engineering.self_supporting_towers * 8.28

@register("E14")
def _e14(p: ProjectInputs) -> float:
    return 0

# ─── Lançamento de Cabos ──────────────────────────────────────────────────────

@register("L1")  # Seccionamento cercas (cerca)
def _l1(p: ProjectInputs) -> float:
    return p.line_length_km * 2.0  # estimate 2 fences/km

@register("L2")  # Pátio de bobinas (dia)
def _l2(p: ProjectInputs) -> float:
    return p.line_length_km * 0.78

@register("L3")  # Retirada e transporte bobinas (bobina)
def _l3(p: ProjectInputs) -> float:
    circuits = 2 if p.circuit_type == "double" else 1
    return p.line_length_km / 0.64 * circuits  # ~0.64km/bobina

@register("L4")  # Transporte/instalação cadeias isoladores (km)
def _l4(p: ProjectInputs) -> float:
    return p.line_length_km

@register("L5")  # Instalação cavaletes de proteção (km)
def _l5(p: ProjectInputs) -> float:
    return p.line_length_km

@register("L6")  # Preparação de praça (praça)
def _l6(p: ProjectInputs) -> float:
    return p.line_length_km / 3.9

@register("L7")  # Lançamento pára-raios 3/8" e pilotinho OPGW (km)
def _l7(p: ProjectInputs) -> float:
    return p.line_length_km

@register("L8")  # Lançamento OPGW e dotterel (km)
def _l8(p: ProjectInputs) -> float:
    return p.line_length_km

@register("L9")  # Nivelamento grampeação amortecedores (km)
def _l9(p: ProjectInputs) -> float:
    return p.line_length_km

@register("L10")  # Içamento cadeias/lançamento piloto (km)
def _l10(p: ProjectInputs) -> float:
    circuits = 2 if p.circuit_type == "double" else 1
    return p.line_length_km * circuits * 0.73  # ~73% spans need pilot

@register("L11")  # Travessia linha viva (travessia)
def _l11(p: ProjectInputs) -> float:
    return 0

@register("L12")  # Lançamento condutores 230kV CS (km)
def _l12(p: ProjectInputs) -> float:
    return p.line_length_km

@register("L13")  # Lançamento condutores 500kV CD (km)
def _l13(p: ProjectInputs) -> float:
    return 0

@register("L14")
def _l14(p: ProjectInputs) -> float:
    return 0

@register("L15")  # Topografia lançamento (mês)
def _l15(p: ProjectInputs) -> float:
    return p.line_length_km / 31.1  # teams×km

@register("L16")  # Nivelamento grampeação 230kV (km)
def _l16(p: ProjectInputs) -> float:
    return p.line_length_km

@register("L17")  # Nivelamento grampeação 500kV (km)
def _l17(p: ProjectInputs) -> float:
    return 0

@register("L18")  # Nivelamento grampeação 800kV (km)
def _l18(p: ProjectInputs) -> float:
    return 0

@register("L19")  # Espaçador/amortecedor (km)
def _l19(p: ProjectInputs) -> float:
    return 0

@register("L20")  # Instalação jumper (torre)
def _l20(p: ProjectInputs) -> float:
    return float(p.total_towers) * 0.083  # angle towers ~8.3%

@register("L21")  # Travessias guindaste (travessia)
def _l21(p: ProjectInputs) -> float:
    return 0

@register("L22")  # Travessias Carrier/Drone (travessia)
def _l22(p: ProjectInputs) -> float:
    return p.line_length_km / 90  # ~1 per 90km

@register("L23")  # Equipe seccionamento (unid)
def _l23(p: ProjectInputs) -> float:
    return 1.0

@register("L24")  # Retensionamento estais (torre)
def _l24(p: ProjectInputs) -> float:
    return float(p.engineering.guyed_towers)

@register("L25")  # Revisão final aérea (km)
def _l25(p: ProjectInputs) -> float:
    return p.line_length_km

@register("L26")  # Corte seletivo (árvore)
def _l26(p: ProjectInputs) -> float:
    return p.line_length_km * 2.0

# ─── Serviços Finais ──────────────────────────────────────────────────────────

@register("F1")  # Retirada madeira/revisão solo (km)
def _f1(p: ProjectInputs) -> float:
    return p.line_length_km

@register("F2")  # Apoio comissionamento (km)
def _f2(p: ProjectInputs) -> float:
    return p.line_length_km

@register("F3")  # Erradicação canavial (ha)
def _f3(p: ProjectInputs) -> float:
    return 0

@register("F4")  # Erradicação eucalipto (ha)
def _f4(p: ProjectInputs) -> float:
    return 0

@register("F5")  # Defensas de concreto (torre)
def _f5(p: ProjectInputs) -> float:
    return float(p.engineering.guyed_towers)

# ─── Outros ───────────────────────────────────────────────────────────────────

@register("O1")  # Lançamento piloto/içamento drone (km)
def _o1(p: ProjectInputs) -> float:
    return p.line_length_km * 0.26

@register("O2")
def _o2(p: ProjectInputs) -> float:
    return 0

@register("O3")  # Apoio logístico (mês)
def _o3(p: ProjectInputs) -> float:
    return float(p.total_duration_months)

@register("O4")
def _o4(p: ProjectInputs) -> float:
    return 0

@register("O5")
def _o5(p: ProjectInputs) -> float:
    return 0


# Register empty slots O6-O15
for _code in [f"O{i}" for i in range(6, 16)]:
    @register(_code)
    def _empty(p: ProjectInputs, c=_code) -> float:
        return 0.0


class QuantityEngine:
    def resolve(self, formula_key: str, inputs: ProjectInputs) -> float:
        resolver = FORMULA_REGISTRY.get(formula_key)
        if resolver is None:
            return 0.0
        try:
            return max(0.0, resolver(inputs))
        except Exception:
            return 0.0
