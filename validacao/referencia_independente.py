"""
Spekta - verificação independente do cálculo (Python/NumPy)

Implementação escrita a partir da descrição do método, sem reaproveitar o
código do Spekta. Compara três fontes, valor a valor:
  - referência (este script, precisão dupla, sem arredondamento)
  - Spekta v1.0 (saídas geradas pelo código publicado)
  - Spectroscopy Pro-Tools (saídas oficiais do experimento)

Uso: python3 referencia_independente.py <pasta .SSM> <pairs.json> <pasta Pro-Tools> <pasta Spekta>
"""
import json, sys, os
import numpy as np

RAW, PAIRS, PT, SP = sys.argv[1:5]
LO, HI = 450.0, 1100.0


def ler_ssm(caminho):
    wl, val = [], []
    with open(caminho, "rb") as f:
        for linha in f.read().decode("latin-1").replace("\r", "\n").split("\n"):
            partes = linha.split()
            if len(partes) != 2:
                continue
            try:
                a, b = float(partes[0]), float(partes[1])
            except ValueError:
                continue
            wl.append(a); val.append(b)
    return np.array(wl), np.array(val)


def ler_csv(caminho):
    linhas = open(caminho, "rb").read().decode("latin-1").splitlines()[2:]
    m = [[float(c.replace(",", ".")) for c in l.split(";")[:2]] for l in linhas if l.strip()]
    return np.array(m)[:, 0], np.array(m)[:, 1]


def grade(a, b, n):
    return np.linspace(a, b, n)  # grade uniforme com o mesmo número de pontos


def refletancia(planta, placa):
    wl_p, v_p = planta
    wl_r, v_r = placa
    g = grade(wl_p[0], wl_p[-1], len(wl_p))
    r = np.interp(g, wl_p, v_p) / np.interp(g, wl_r, v_r)
    sel = (g >= LO) & (g <= HI)
    return g[sel], r[sel]


def refletancia_sem_grade(planta, placa):
    """Alternativa: placa interpolada nos comprimentos de onda da própria planta."""
    wl_p, v_p = planta
    wl_r, v_r = placa
    r = v_p / np.interp(wl_p, wl_r, v_r)
    sel = (wl_p >= LO) & (wl_p <= HI)
    return wl_p[sel], r[sel]


pairs = json.load(open(PAIRS))
res = {"plantas": 0, "parcelas": 0}
d_ref_pt = d_ref_sp = d_sp_pt = d_wl = d_alt = 0.0
ref_por_parcela = {}

for chave, (pl, pt) in pairs.items():
    planta = ler_ssm(os.path.join(RAW, pl + ".SSM"))
    placa = ler_ssm(os.path.join(RAW, pt + ".SSM"))
    g, r = refletancia(planta, placa)
    wl_pt, v_pt = ler_csv(os.path.join(PT, chave + ".csv"))
    wl_sp, v_sp = ler_csv(os.path.join(SP, "planta", chave + ".csv"))
    assert len(g) == len(wl_pt) == len(wl_sp), chave
    d_wl = max(d_wl, np.max(np.abs(np.round(g, 3) - wl_pt)), np.max(np.abs(wl_sp - wl_pt)))
    d_ref_pt = max(d_ref_pt, np.max(np.abs(r - v_pt) / np.abs(r)))
    d_ref_sp = max(d_ref_sp, np.max(np.abs(r - v_sp) / np.abs(r)))
    d_sp_pt = max(d_sp_pt, np.max(np.abs(v_sp - v_pt)))
    ga, ra = refletancia_sem_grade(planta, placa)
    # compara a alternativa com a referência no mesmo comprimento de onda
    d_alt = max(d_alt, np.max(np.abs(np.interp(ga, g, r) - ra)))
    parcela = chave.split(" ", 1)[1]
    ref_por_parcela.setdefault(parcela, []).append((g, r))
    res["plantas"] += 1

dm_ref_pt = dm_ref_sp = dm_sp_pt = 0.0
for parcela, lista in ref_por_parcela.items():
    g = lista[0][0]
    media = np.mean([np.interp(g, gi, ri) for gi, ri in lista], axis=0)
    _, v_pt = ler_csv(os.path.join(PT, "Média da Parcela", parcela + ".csv"))
    _, v_sp = ler_csv(os.path.join(SP, "media", parcela + ".csv"))
    dm_ref_pt = max(dm_ref_pt, np.max(np.abs(media - v_pt) / np.abs(media)))
    dm_ref_sp = max(dm_ref_sp, np.max(np.abs(media - v_sp) / np.abs(media)))
    dm_sp_pt = max(dm_sp_pt, np.max(np.abs(v_sp - v_pt)))
    res["parcelas"] += 1

res.update({
    "dif_max_comprimento_onda_nm": float(d_wl),
    "planta_dif_relativa_max_referencia_vs_protools": float(d_ref_pt),
    "planta_dif_relativa_max_referencia_vs_spekta": float(d_ref_sp),
    "planta_dif_absoluta_max_spekta_vs_protools": float(d_sp_pt),
    "media_dif_relativa_max_referencia_vs_protools": float(dm_ref_pt),
    "media_dif_relativa_max_referencia_vs_spekta": float(dm_ref_sp),
    "media_dif_absoluta_max_spekta_vs_protools": float(dm_sp_pt),
    "efeito_da_grade_uniforme_dif_absoluta_max": float(d_alt),
})
print(json.dumps(res, indent=2, ensure_ascii=False))
